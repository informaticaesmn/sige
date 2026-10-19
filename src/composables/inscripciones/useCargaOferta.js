// src/composables/inscripciones/useCargaOferta.js
//
// Carga masiva de la oferta académica de un ciclo desde un CSV.
//
// Modelo destino (el que lee la app, ver useOfertaAcademica.js):
//   ofertaAcademica/{ciclo} = {
//     nombreCiclo,
//     etapas: [{
//       nombre, descripcion, desde, hasta,
//       materias: [{ id, nombre, tipo, comisiones: [{ id, horario, aula, docente }] }]
//     }],
//     actualizadoEn
//   }
//
// La escritura reemplaza el documento completo del ciclo dentro de un
// `writeBatch` (AGENTS.md §4): sobrescribir el doc entero es justamente "limpiar
// y escribir" — no quedan campos ni materias viejas.
import { ref } from 'vue'
import { doc, writeBatch, serverTimestamp } from 'firebase/firestore/lite'
import { db } from '@/config/firebase.js'
import { parsearCSV } from '@/utils/csv.js'

/**
 * Envuelve una fecha `YYYY-MM-DD` al inicio o al fin del día (hora local).
 * @param {string} valor
 * @param {'inicio'|'fin'} extremo
 * @returns {Date|null}
 */
function parsearFecha(valor, extremo) {
  if (!valor || String(valor).trim() === '') return null
  const sufijo = extremo === 'fin' ? 'T23:59:59.999' : 'T00:00:00'
  const fecha = new Date(`${String(valor).trim()}${sufijo}`)
  return isNaN(fecha.getTime()) ? null : fecha
}

/**
 * Valida una fila del CSV de oferta.
 * @param {Object} fila
 * @returns {{ esValida: boolean, errores: string[], advertencias: string[] }}
 */
export function validarFilaOferta(fila) {
  const errores = []
  const advertencias = []

  if (!fila.materia_codigo || !fila.materia_codigo.trim()) {
    errores.push('Falta materia_codigo')
  }
  if (!fila.secuencia_codigo || !fila.secuencia_codigo.trim()) {
    errores.push('Falta secuencia_codigo')
  }

  const inicio = fila.periodo_inicio ? parsearFecha(fila.periodo_inicio, 'inicio') : null
  const fin = fila.periodo_fin ? parsearFecha(fila.periodo_fin, 'fin') : null
  if (fila.periodo_inicio && !inicio) errores.push('periodo_inicio no es una fecha válida (YYYY-MM-DD)')
  if (fila.periodo_fin && !fin) errores.push('periodo_fin no es una fecha válida (YYYY-MM-DD)')
  // Obligatorios: useOfertaAcademica.js hace `etapa.desde.toDate()` sin guardas.
  if (!inicio && !fin) errores.push('Faltan periodo_inicio y periodo_fin (obligatorios)')
  else if ((inicio && !fin) || (!inicio && fin)) errores.push('periodo_inicio y periodo_fin deben venir juntos')
  if (inicio && fin && fin < inicio) {
    errores.push('periodo_fin no puede ser anterior a periodo_inicio')
  }

  if (!fila.horario?.trim()) advertencias.push('Sin horario')
  if (!fila.docente_nombre?.trim()) advertencias.push('Sin docente')

  return { esValida: errores.length === 0, errores, advertencias }
}

/**
 * Transforma el texto CSV en el documento de oferta del ciclo.
 * Agrupa las secuencias en etapas por rango de fechas y, dentro de cada etapa,
 * en materias por `materia_codigo`.
 * @param {string} textoCSV
 * @param {{ ciclo?: string }} [opciones] ciclo por defecto si la columna viene vacía
 * @returns {{ exito: boolean, documento?: Object, ciclo?: string, errores: Object[], advertencias: Object[], error?: Error }}
 */
export function construirOfertaDesdeCSV(textoCSV, { ciclo = '' } = {}) {
  const filas = parsearCSV(textoCSV)
  if (filas.length === 0) {
    return {
      exito: false,
      errores: [],
      advertencias: [],
      error: new Error('El CSV no tiene filas de datos (o falta el encabezado).')
    }
  }

  const errores = []
  const advertencias = []
  const etapasMap = new Map()
  let cicloDetectado = ciclo

  filas.forEach((fila, index) => {
    const numeroFila = index + 2
    const validacion = validarFilaOferta(fila)

    if (!validacion.esValida) {
      errores.push({ fila: numeroFila, materia: fila.materia_codigo || '(sin materia)', detalle: validacion.errores })
      return
    }
    if (validacion.advertencias.length > 0) {
      advertencias.push({ fila: numeroFila, detalle: validacion.advertencias })
    }

    if (!cicloDetectado && fila.ciclo_lectivo?.trim()) {
      cicloDetectado = fila.ciclo_lectivo.trim()
    }

    // Clave de etapa: nombre (si viene) + rango de fechas.
    const inicio = fila.periodo_inicio ? parsearFecha(fila.periodo_inicio, 'inicio') : null
    const fin = fila.periodo_fin ? parsearFecha(fila.periodo_fin, 'fin') : null
    const nombreEtapa = (fila.etapa_nombre || '').trim() || 'Inscripciones'
    const claveEtapa = `${nombreEtapa}|${inicio ? inicio.toISOString() : ''}|${fin ? fin.toISOString() : ''}`

    if (!etapasMap.has(claveEtapa)) {
      etapasMap.set(claveEtapa, {
        nombre: nombreEtapa,
        descripcion: (fila.etapa_descripcion || '').trim(),
        desde: inicio,
        hasta: fin,
        materiasMap: new Map()
      })
    }

    const etapa = etapasMap.get(claveEtapa)
    const materiaId = fila.materia_codigo.trim()

    if (!etapa.materiasMap.has(materiaId)) {
      etapa.materiasMap.set(materiaId, {
        id: materiaId,
        nombre: (fila.materia_nombre || '').trim() || materiaId,
        tipo: (fila.tipo || 'colectiva').trim(),
        comisiones: []
      })
    }

    const comisionId = fila.secuencia_codigo.trim()
    etapa.materiasMap.get(materiaId).comisiones.push({
      id: comisionId,
      cupo: fila.cupo ? Number(fila.cupo) : null,
      horario: (fila.horario || '').trim(),
      aula: (fila.aula || '').trim(),
      docente: (fila.docente_nombre || 'A confirmar').trim()
    })
  })

  if (errores.length > 0) {
    return { exito: false, errores, advertencias, error: new Error(`Hay ${errores.length} fila(s) inválida(s).`) }
  }

  if (!cicloDetectado) {
    return {
      exito: false,
      errores,
      advertencias,
      error: new Error('No se pudo determinar el ciclo: indicá la columna ciclo_lectivo o el ciclo destino.')
    }
  }

  const etapas = [...etapasMap.values()].map((etapa) => ({
    nombre: etapa.nombre,
    descripcion: etapa.descripcion,
    desde: etapa.desde,
    hasta: etapa.hasta,
    materias: [...etapa.materiasMap.values()]
  }))

  return {
    exito: true,
    ciclo: cicloDetectado,
    etapas,
    errores: [],
    advertencias,
    documento: {
      nombreCiclo: `Ciclo ${cicloDetectado}`,
      etapas,
      actualizadoEn: serverTimestamp()
    }
  }
}

/**
 * Composable de carga/limpieza de la oferta académica para `coordinacion`.
 * @returns {{ cargarOfertaDesdeCSV: Function, borrarOferta: Function, loading: import('vue').Ref<boolean>, error: import('vue').Ref<Error|null> }}
 */
export function useCargaOferta() {
  const loading = ref(false)
  const error = ref(null)

  /**
   * Parsea y escribe la oferta del ciclo en un único batch atómico.
   * @param {string} textoCSV
   * @param {{ ciclo?: string }} [opciones]
   * @returns {Promise<{ exito: boolean, datos?: Object, error?: any }>}
   */
  async function cargarOfertaDesdeCSV(textoCSV, { ciclo = '' } = {}) {
    loading.value = true
    error.value = null

    try {
      const construccion = construirOfertaDesdeCSV(textoCSV, { ciclo })

      if (!construccion.exito) {
        error.value = construccion.error
        return {
          exito: false,
          datos: { errores: construccion.errores, advertencias: construccion.advertencias },
          error: construccion.error
        }
      }

      // Un solo documento: `set` sin merge reemplaza el doc entero (limpiar + escribir).
      const batch = writeBatch(db)
      batch.set(doc(db, 'ofertaAcademica', construccion.ciclo), construccion.documento)
      await batch.commit()

      const materias = construccion.etapas.reduce((total, etapa) => total + etapa.materias.length, 0)
      const comisiones = construccion.etapas.reduce(
        (total, etapa) => total + etapa.materias.reduce((sub, materia) => sub + materia.comisiones.length, 0),
        0
      )

      return {
        exito: true,
        datos: {
          ciclo: construccion.ciclo,
          etapas: construccion.etapas.length,
          materias,
          comisiones,
          advertencias: construccion.advertencias
        },
        error: null
      }
    } catch (e) {
      console.error('Error en la carga de oferta académica:', e)
      error.value = e
      return { exito: false, datos: { errores: [], advertencias: [] }, error: e }
    } finally {
      loading.value = false
    }
  }

  /**
   * Borra por completo la oferta de un ciclo (deja la app sin oferta vigente).
   * @param {string} ciclo
   * @returns {Promise<{ exito: boolean, datos?: Object, error?: any }>}
   */
  async function borrarOferta(ciclo) {
    if (!ciclo) {
      const err = new Error('Falta el ciclo a borrar.')
      return { exito: false, datos: null, error: err }
    }

    loading.value = true
    error.value = null
    try {
      const batch = writeBatch(db)
      batch.delete(doc(db, 'ofertaAcademica', ciclo))
      await batch.commit()
      return { exito: true, datos: { ciclo }, error: null }
    } catch (e) {
      console.error('Error al borrar la oferta académica:', e)
      error.value = e
      return { exito: false, datos: null, error: e }
    } finally {
      loading.value = false
    }
  }

  return { cargarOfertaDesdeCSV, borrarOferta, loading, error }
}
