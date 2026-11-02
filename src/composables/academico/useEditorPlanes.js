// src/composables/academico/useEditorPlanes.js
//
// Lógica de negocio para el editor/revisor de planes de estudio.
// Responsable de: parsear CSV de Google Sheets, normalizar materias,
// validar, generar JSON (catálogo + detalle) y exportar archivos.
// Usado por src/views/coordinacion/EditorPlanes.vue.

import { ref, computed } from 'vue'
import {
  validarMaterias,
  detectarPregrado
} from '@/utils/validacionPlanes.js'

/**
 * Extrae el año de un código de materia.
 * Acepta formatos:
 *  - `663-00-01` → año 0 (pregrado)
 *  - `663-0.1`   → año 0
 *  - `663-1.5`   → año 1
 *  - `663-4.14`  → año 4
 * @param {string} codigo
 * @returns {number|null}
 */
function extraerAnio(codigo) {
  if (!codigo || typeof codigo !== 'string') return null
  const match = codigo.match(/-(\d{1,2})(?:[.-]|$)/)
  if (match) return Number.parseInt(match[1], 10)
  return null
}

/**
 * Construye el código canónico a partir de los datos de una fila CSV.
 * Prioridad: materia_id (formato largo) > construir desde {plan}-{Cod}.
 * @param {Object} fila
 * @returns {string|null}
 */
function construirCodigo(fila) {
  const materiaId = String(fila.materia_id ?? '').trim()
  if (materiaId) return materiaId

  const plan = String(fila.Plan ?? '').trim()
  const cod = String(fila.Cod ?? '').trim()
  if (plan && cod) return `${plan}-${cod}`

  return null
}

/**
 * Parsea texto CSV simple (respetando comillas dobles) a array de objetos fila.
 * @param {string} texto
 * @returns {Object[]}
 */
function parsearCSV(texto) {
  if (!texto || texto.trim() === '') return []

  const filas = []
  let fila = []
  let campo = ''
  let enComillas = false

  for (let i = 0; i < texto.length; i++) {
    const c = texto[i]

    if (enComillas) {
      if (c === '"') {
        if (texto[i + 1] === '"') {
          campo += '"'
          i++
        } else {
          enComillas = false
        }
      } else {
        campo += c
      }
    } else if (c === '"') {
      enComillas = true
    } else if (c === ',') {
      fila.push(campo)
      campo = ''
    } else if (c === '\n') {
      fila.push(campo)
      campo = ''
      filas.push(fila)
      fila = []
    } else if (c !== '\r') {
      campo += c
    }
  }

  if (campo !== '' || fila.length > 0) {
    fila.push(campo)
    filas.push(fila)
  }

  // Descartar filas completamente vacías
  const filasNoVacias = filas.filter((f) => f.some((v) => v.trim() !== ''))
  if (filasNoVacias.length < 2) return []

  const encabezados = filasNoVacias[0].map((h) => h.trim())
  return filasNoVacias.slice(1).map((valores) => {
    const filaObj = {}
    encabezados.forEach((col, idx) => {
      filaObj[col] = (valores[idx] ?? '').trim()
    })
    return filaObj
  })
}

/**
 * Normaliza el valor de cursada a uno de los valores válidos de SIGE.
 * @param {string} valor
 * @returns {'anual'|'1C'|'2C'|null}
 */
function normalizarCursada(valor) {
  if (!valor || valor.trim() === '') return null
  const v = valor.trim().toUpperCase()
  if (v === 'ANUAL') return 'anual'
  if (v === '1C') return '1C'
  if (v === '2C') return '2C'
  return null
}

/**
 * Parsea una lista de correlativas que puede venir como:
 *  - string con códigos separados por coma: "662-0.1, 662-0.2"
 *  - string con nombres: "GUITARRA I, Elementos del Análisis"
 *  - array de strings
 * Devuelve array de códigos (los que se puedan interpretar como código).
 * @param {string|string[]|null} valor
 * @returns {string[]}
 */
function parsearCorrelativas(valor) {
  if (!valor) return []
  if (Array.isArray(valor)) return valor.filter(Boolean)

  const texto = String(valor).trim()
  if (texto === '') return []

  // Intentar separar por coma
  return texto.split(',').map((c) => c.trim()).filter(Boolean)
}

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

export function useEditorPlanes() {
  // --- Estado de importación ---
  const csvTexto = ref('')
  const filasCSV = ref([])
  const planCodigoDetectado = ref('')
  const planNombreDetectado = ref('')

  // --- Estado de edición ---
  const materias = ref({}) // mapa { [codigo]: MateriaEdit }
  const planCodigo = ref('')
  const planNombre = ref('')

  // --- Estado de validación y exportación ---
  const errores = ref([])
  const valido = ref(false)
  const hayPregrado = ref(false)

  // ---------------------------------------------------------------------------
  // 1. Importar CSV
  // ---------------------------------------------------------------------------

  /**
   * Importa un texto CSV de Google Sheets y construye el mapa de materias.
   * Prioriza las columnas finales (materia_id, nombre, nombre_c, cursada,
   * correlativas_cursar, correlativas_aprobar) como fuente de verdad.
   * @param {string} texto
   * @param {{ planCodigo?: string, planNombre?: string }} [opciones]
   *   Permite forzar los metadatos cuando el CSV no los trae (ej. al reabrir un
   *   plan guardado en Firestore).
   * @returns {Promise<{ exito, materiasCount, errores }>}
   */
  async function importarCSV(texto, { planCodigo: codigoForzado = '', planNombre: nombreForzado = '' } = {}) {
    csvTexto.value = texto
    filasCSV.value = parsearCSV(texto)

    if (filasCSV.value.length === 0) {
      return { exito: false, materiasCount: 0, errores: ['El CSV no tiene filas de datos.'] }
    }

    // Detectar código de plan de la primera fila (columna "Plan"), salvo que
    // la vista ya tenga un código canónico (ej. al abrir un plan guardado).
    const primeraFila = filasCSV.value[0]
    const planDesdeCSV = String(primeraFila.Plan ?? '').trim()
    if (codigoForzado) {
      planCodigo.value = String(codigoForzado).trim()
      planCodigoDetectado.value = planCodigo.value
    } else if (planDesdeCSV) {
      planCodigo.value = planDesdeCSV
      planCodigoDetectado.value = planDesdeCSV
    }

    if (nombreForzado) planNombre.value = nombreForzado

    // Construir mapa de materias priorizando columnas finales
    const nuevoMapa = {}
    const erroresImport = []

    for (const fila of filasCSV.value) {
      const codigo = construirCodigo(fila)
      if (!codigo) {
        erroresImport.push(`Fila sin código: "${fila.Materia || fila.materia || '(sin nombre)'}"`)
        continue
      }

      // Si ya existe, no duplicar y avisar (la primera aparición gana)
      if (nuevoMapa[codigo]) {
        erroresImport.push(`Código de materia duplicado en el CSV: "${codigo}"`)
        continue
      }

      const nombre = String(fila.nombre ?? fila.Materia ?? fila.materia ?? '').trim()
      const nombre_c = String(fila.nombre_c ?? fila.NombreCorto ?? '').trim()
      const cursada = normalizarCursada(fila.cursada ?? fila.Cursada ?? '')
      const equivale_a = String(fila.equivale_a ?? '').trim() || null

      // Correlativas: priorizar columnas finales, sino intentar CodC/CodA
      const cursarRaw = fila.correlativas_cursar ?? fila.CodC ?? ''
      const aprobarRaw = fila.correlativas_aprobar ?? fila.CodA ?? ''

      nuevoMapa[codigo] = {
        id: codigo,
        anio: extraerAnio(codigo),
        nombre: nombre || codigo,
        nombre_c: nombre_c || null,
        cursada,
        correlativas: {
          cursar: parsearCorrelativas(cursarRaw),
          aprobar: parsearCorrelativas(aprobarRaw)
        },
        equivale_a,
        propia: String(fila.propia ?? '').toLowerCase() === 'true',
        cSiuned: String(fila.cSiuned ?? '').toLowerCase() === 'true'
      }
    }

    materias.value = nuevoMapa
    hayPregrado.value = detectarPregrado(nuevoMapa)

    return {
      exito: true,
      materiasCount: Object.keys(nuevoMapa).length,
      errores: erroresImport
    }
  }

  // ---------------------------------------------------------------------------
  // 2. Edición de materias
  // ---------------------------------------------------------------------------

  /**
   * Agrega una materia vacía al mapa.
   * @param {string} anio año como string o number
   */
  function agregarMateria(anio = '0') {
    const anioNum = Number.parseInt(String(anio), 10) || 0
    const existentesEnAnio = Object.values(materias.value).filter(
      (m) => m.anio === anioNum
    ).length

    let nuevoCodigo
    do {
      const sufijo = String(existentesEnAnio + 1).padStart(2, '0')
      nuevoCodigo = `${planCodigo.value || 'PLAN'}-${String(anioNum).padStart(2, '0')}.${sufijo}`
      existentesEnAnio++
    } while (materias.value[nuevoCodigo])

    materias.value = {
      ...materias.value,
      [nuevoCodigo]: {
        id: nuevoCodigo,
        anio: anioNum,
        nombre: '',
        nombre_c: null,
        cursada: null,
        correlativas: { cursar: [], aprobar: [] },
        equivale_a: null,
        propia: false,
        cSiuned: false
      }
    }
  }

  /**
   * Elimina una materia del mapa.
   * @param {string} codigo
   */
  function eliminarMateria(codigo) {
    const nuevo = { ...materias.value }
    delete nuevo[codigo]
    materias.value = nuevo
  }

  /**
   * Actualiza un campo de una materia.
   * @param {string} codigo
   * @param {string} campo
   * @param {any} valor
   */
  function actualizarMateria(codigo, campo, valor) {
    const nuevo = { ...materias.value }
    if (nuevo[codigo]) {
      nuevo[codigo] = { ...nuevo[codigo], [campo]: valor }
    }
    materias.value = nuevo
  }

  /**
   * Agrega una correlativa (código) a una materia.
   * @param {string} codigoMateria
   * @param {'cursar'|'aprobar'} tipo
   * @param {string} codigoCorrelativa
   */
  function agregarCorrelativa(codigoMateria, tipo, codigoCorrelativa) {
    if (!codigoCorrelativa) return
    const nuevo = { ...materias.value }
    if (nuevo[codigoMateria]) {
      const lista = [...(nuevo[codigoMateria].correlativas[tipo] || [])]
      if (!lista.includes(codigoCorrelativa)) {
        lista.push(codigoCorrelativa)
        nuevo[codigoMateria].correlativas[tipo] = lista
      }
    }
    materias.value = nuevo
  }

  /**
   * Elimina una correlativa de una materia.
   * @param {string} codigoMateria
   * @param {'cursar'|'aprobar'} tipo
   * @param {string} codigoCorrelativa
   */
  function eliminarCorrelativa(codigoMateria, tipo, codigoCorrelativa) {
    const nuevo = { ...materias.value }
    if (nuevo[codigoMateria]) {
      const lista = (nuevo[codigoMateria].correlativas[tipo] || []).filter(
        (c) => c !== codigoCorrelativa
      )
      nuevo[codigoMateria].correlativas[tipo] = lista
    }
    materias.value = nuevo
  }

  // ---------------------------------------------------------------------------
  // 3. Vistas derivadas
  // ---------------------------------------------------------------------------

  /**
   * Agrupa las materias por año.
   * @returns {Record<number, Object[]>}
   */
  const materiasPorAnio = computed(() => {
    const grupos = {}
    for (const [codigo, materia] of Object.entries(materias.value)) {
      const anio = materia.anio ?? -1
      if (!grupos[anio]) grupos[anio] = []
      grupos[anio].push({ codigo, ...materia })
    }
    return grupos
  })

  /**
   * Lista de materias como array para SelectMateria.
   * @returns {{ codigo, nombre }[]}
   */
  const materiasLista = computed(() =>
    Object.entries(materias.value).map(([codigo, m]) => ({
      codigo,
      nombre: m.nombre || codigo
    }))
  )

  // ---------------------------------------------------------------------------
  // 4. Validación
  // ---------------------------------------------------------------------------

  /**
   * Ejecuta validaciones sobre el mapa actual de materias.
   * @returns {{ exito, errores }}
   */
  async function validar() {
    const resultado = validarMaterias(materias.value)
    errores.value = resultado.errores
    valido.value = resultado.exito
    return resultado
  }

  // ---------------------------------------------------------------------------
  // 5. Generación de JSON
  // ---------------------------------------------------------------------------

  /**
   * Genera el objeto para public/planes/planes.json (catálogo).
   * @returns {{ planes: [{ codigo, nombre }] }}
   */
  function generarJSONCatalogo() {
    const planes = Object.entries(materias.value)
      .map(([codigo, m]) => ({
        codigo,
        nombre: m.nombre || `Plan ${codigo}`
      }))
      // Deduplicar por código (el mapa ya no tiene duplicados, pero por seguridad)
      .filter((v, i, a) => a.findIndex((x) => x.codigo === v.codigo) === i)

    return { planes }
  }

  /**
   * Genera el objeto para public/planes/{codigo}.json (detalle del plan).
   * @returns {Object|null}
   */
  function generarJSONDetalle() {
    if (!planCodigo.value) return null

    const materiasDetalle = {}
    for (const [codigo, m] of Object.entries(materias.value)) {
      materiasDetalle[codigo] = {
        id: m.id,
        anio: m.anio,
        nombre: m.nombre || m.id,
        nombre_c: m.nombre_c,
        cursada: m.cursada,
        correlativas: {
          cursar: m.correlativas?.cursar || [],
          aprobar: m.correlativas?.aprobar || []
        },
        equivale_a: m.equivale_a,
        propia: m.propia,
        cSiuned: m.cSiuned
      }
    }

    return {
      plan: planCodigo.value,
      nombre: planNombre.value || `Plan ${planCodigo.value}`,
      formato: 'objeto',
      materias: materiasDetalle,
      disponible: false,
      revisadoEn: null,
      revisadoPor: null
    }
  }

  /**
   * Descarga un objeto como archivo JSON.
   * @param {Object} datos
   * @param {string} nombreArchivo
   */
  function descargarJSON(datos, nombreArchivo) {
    const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = nombreArchivo
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  /**
   * Copia un objeto JSON al portapapeles.
   * @param {Object} datos
   * @returns {Promise<void>}
   */
  async function copiarJSON(datos) {
    const texto = JSON.stringify(datos, null, 2)
    await navigator.clipboard.writeText(texto)
  }

  return {
    // Estado
    csvTexto,
    filasCSV,
    planCodigoDetectado,
    planNombreDetectado,
    materias,
    planCodigo,
    planNombre,
    errores,
    valido,
    hayPregrado,

    // Vistas derivadas
    materiasPorAnio,
    materiasLista,

    // Acciones
    importarCSV,
    agregarMateria,
    eliminarMateria,
    actualizarMateria,
    agregarCorrelativa,
    eliminarCorrelativa,
    validar,
    generarJSONCatalogo,
    generarJSONDetalle,
    descargarJSON,
    copiarJSON
  }
}
