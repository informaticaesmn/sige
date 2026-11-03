// src/composables/academico/useEditorPlanes.js
//
// Lógica de negocio para el editor/revisor de planes de estudio.
// Responsable de: importar JSON del Apps Script / borrador, normalizar materias,
// editar el árbol de condiciones de correlatividades, validar y generar JSON.
// Usado por src/views/coordinacion/EditorPlanes.vue.

import { ref, computed } from 'vue'
import {
  validarMaterias,
  detectarPregrado
} from '@/utils/validacionPlanes.js'
import {
  condicionDesdeJson,
  condicionAJson
} from '@/utils/condiciones.js'
import { anioDeMateria } from '@/utils/planes.js'

/**
 * Normaliza el valor de cursada a uno de los valores válidos de SIGE.
 * @param {string} valor
 * @returns {'anual'|'1C'|'2C'|null}
 */
function normalizarCursada(valor) {
  if (!valor || typeof valor !== 'string') return null
  const v = valor.trim().toUpperCase()
  if (v === 'ANUAL') return 'anual'
  if (v === '1C') return '1C'
  if (v === '2C') return '2C'
  return null
}

/**
 * Normaliza equivalencias a un array de strings.
 * @param {any} valor
 * @returns {string[]}
 */
function normalizarEquivalencias(valor) {
  if (!valor) return []
  if (Array.isArray(valor)) {
    return valor.map((v) => String(v ?? '').trim()).filter(Boolean)
  }
  if (typeof valor === 'string') {
    return valor.split(',').map((v) => v.trim()).filter(Boolean)
  }
  return []
}

/**
 * Convierte una materia del JSON del plan al modelo `MateriaEdit` del editor.
 *
 * El código canónico es la clave del mapa `materias` (`materia_id`). El año se
 * deriva del código cuando el JSON no lo trae. `propia` y `cSiuned` se
 * conservan solo si el JSON de origen los declara.
 *
 * @param {string} codigo clave del mapa `materias`
 * @param {Object} datos materia cruda
 * @returns {Object} materia normalizada
 */
export function normalizarMateriaJSON(codigo, datos) {
  const anio = Number.isInteger(datos?.anio) ? datos.anio : anioDeMateria(codigo)
  const nombre = String(datos?.nombre ?? codigo).trim() || codigo

  const materia = {
    id: codigo,
    anio: Number.isInteger(anio) ? anio : null,
    nombre,
    nombre_c: datos?.nombre_c ? String(datos.nombre_c).trim() : null,
    cursada: normalizarCursada(datos?.cursada),
    correlativas: {
      cursar: condicionDesdeJson(datos?.correlativas?.cursar),
      aprobar: condicionDesdeJson(datos?.correlativas?.aprobar)
    },
    equivale_a: normalizarEquivalencias(datos?.equivale_a)
  }

  if (datos?.propia !== undefined) materia.propia = datos.propia === true
  if (datos?.cSiuned !== undefined) materia.cSiuned = datos.cSiuned === true

  return materia
}

export function useEditorPlanes() {
  // --- Estado de importación ---
  const jsonTexto = ref('')
  /** Código de plan declarado por el JSON importado (para avisar si se edita). */
  const planCodigoOrigen = ref('')

  // --- Estado de edición ---
  const materias = ref({}) // mapa { [codigo]: MateriaEdit }
  const planCodigo = ref('')
  const planNombre = ref('')
  const disponible = ref(false)

  // --- Estado de validación y exportación ---
  const errores = ref([])
  const advertencias = ref([])
  const valido = ref(false)
  const hayPregrado = ref(false)

  // ---------------------------------------------------------------------------
  // 1. Importar JSON
  // ---------------------------------------------------------------------------

  /**
   * Importa un JSON de plan (texto o ya parseado) y construye el mapa de materias.
   *
   * @param {string|Object} entrada JSON crudo o de objeto parseado
   * @param {{ planCodigo?: string, planNombre?: string }} [opciones]
   * @returns {Promise<{ exito: boolean, materiasCount: number, errores: string[] }>}
   */
  async function importarJSONPlan(entrada, { planCodigo: codigoForzado = '', planNombre: nombreForzado = '' } = {}) {
    let datos = null

    if (typeof entrada === 'string') {
      jsonTexto.value = entrada
      try {
        datos = JSON.parse(entrada)
      } catch (err) {
        return {
          exito: false,
          materiasCount: 0,
          errores: [`Error de parseo JSON: ${err.message}`]
        }
      }
    } else if (typeof entrada === 'object' && entrada !== null) {
      datos = entrada
      jsonTexto.value = JSON.stringify(entrada, null, 2)
    } else {
      return { exito: false, materiasCount: 0, errores: ['El insumo no es un JSON válido.'] }
    }

    // Extraer metadatos. El código canónico es el primer token de `plan`.
    const rawPlan = String(datos.plan ?? datos.codigo ?? '').trim()
    const codigoDerivado = rawPlan.split(/\s+/)[0]

    planCodigoOrigen.value = codigoDerivado
    planCodigo.value = codigoForzado || codigoDerivado
    const rawNombre = String(datos.nombre ?? '').trim()
    planNombre.value = nombreForzado || rawNombre.replace(/^Plan\s+/i, '')
    disponible.value = datos.disponible === true

    // Procesar materias
    const materiasRaw = datos.materias ?? {}
    const nuevoMapa = {}
    const erroresImport = []

    for (const [key, mat] of Object.entries(materiasRaw)) {
      const codigo = String(key || mat?.id || '').trim()
      if (!codigo) {
        erroresImport.push('Se encontró una materia sin código ID.')
        continue
      }

      if (nuevoMapa[codigo]) {
        erroresImport.push(`Código de materia duplicado en el JSON: "${codigo}"`)
        continue
      }

      nuevoMapa[codigo] = normalizarMateriaJSON(codigo, mat)
    }

    materias.value = nuevoMapa
    hayPregrado.value = detectarPregrado(nuevoMapa)

    // Una importación exitosa invalida el resultado de la validación anterior.
    errores.value = []
    advertencias.value = []
    valido.value = false

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
   * Agrega una materia vacía al mapa con código autogenerado
   * `{plan}-{anio}.{n}` (ej. `663-0.1`).
   * @param {string|number} anio año como string o number
   * @returns {string} código de la materia creada
   */
  function agregarMateria(anio = '0') {
    const anioNum = Number.parseInt(String(anio), 10) || 0
    const existentesEnAnio = Object.values(materias.value).filter(
      (m) => m.anio === anioNum
    ).length

    let nuevoCodigo
    let contador = existentesEnAnio + 1
    do {
      nuevoCodigo = `${planCodigo.value || 'PLAN'}-${anioNum}.${contador}`
      contador++
    } while (materias.value[nuevoCodigo])

    materias.value = {
      ...materias.value,
      [nuevoCodigo]: {
        id: nuevoCodigo,
        anio: anioNum,
        nombre: '',
        nombre_c: null,
        cursada: null,
        correlativas: { cursar: null, aprobar: null },
        equivale_a: []
      }
    }

    return nuevoCodigo
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
   * Actualiza un campo básico de una materia.
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
   * Actualiza la condición de correlatividad ('cursar' o 'aprobar') de una materia.
   * @param {string} codigoMateria
   * @param {'cursar'|'aprobar'} tipo
   * @param {Object|null} condicion
   */
  function actualizarCondicion(codigoMateria, tipo, condicion) {
    const nuevo = { ...materias.value }
    if (nuevo[codigoMateria]) {
      nuevo[codigoMateria].correlativas = {
        ...nuevo[codigoMateria].correlativas,
        [tipo]: condicion
      }
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
   * Lista de materias como array para SelectMateria/EditorCondicion.
   * @returns {{ codigo: string, nombre: string }[]}
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
   * @returns {Promise<{ exito: boolean, errores: string[], advertencias: string[] }>}
   */
  async function validar() {
    const resultado = validarMaterias(materias.value)
    errores.value = resultado.errores
    advertencias.value = resultado.advertencias || []
    valido.value = resultado.exito
    return resultado
  }

  // ---------------------------------------------------------------------------
  // 5. Generación de JSON
  // ---------------------------------------------------------------------------

  /**
   * Lee `public/planes/planes.json` para poder hacer merge sin perder planes.
   * Si el fetch falla, devuelve un array vacío (se exporta solo el plan actual).
   * @param {Function} [fetchImpl] inyectable para tests
   * @returns {Promise<Array<{ codigo: string, nombre: string, disponible: boolean }>>}
   */
  async function leerCatalogoExistente(fetchImpl) {
    const cliente =
      fetchImpl || (typeof fetch === 'function' ? fetch.bind(globalThis) : null)
    if (!cliente) return []

    try {
      const respuesta = await cliente('/planes/planes.json')
      if (!respuesta || respuesta.ok === false) return []
      const json = await respuesta.json()
      const lista = Array.isArray(json) ? json : json?.planes
      return Array.isArray(lista) ? lista : []
    } catch {
      return []
    }
  }

  /**
   * Genera el objeto para `public/planes/planes.json` (catálogo).
   *
   * Hace merge con el catálogo existente para no perder planes que el
   * coordinador no está editando. Si no se pasa un catálogo, lo lee de
   * `public/planes/planes.json`.
   *
   * @param {Array<{ codigo: string, nombre: string, disponible?: boolean }>|null} [catalogoExistente]
   * @param {{ fetchImpl?: Function }} [opciones]
   * @returns {Promise<{ planes: Array<{ codigo: string, nombre: string, disponible: boolean }> }>}
   */
  async function generarJSONCatalogo(catalogoExistente = null, opciones = {}) {
    const lista = Array.isArray(catalogoExistente)
      ? catalogoExistente
      : await leerCatalogoExistente(opciones.fetchImpl)

    const mapaActual = new Map()

    // 1) Cargar el catálogo existente.
    for (const item of lista) {
      if (item?.codigo) {
        mapaActual.set(item.codigo, {
          codigo: item.codigo,
          nombre: item.nombre || item.codigo,
          disponible: item.disponible === true
        })
      }
    }

    // 2) Merge con el plan actual.
    if (planCodigo.value) {
      mapaActual.set(planCodigo.value, {
        codigo: planCodigo.value,
        nombre: planNombre.value || `Plan ${planCodigo.value}`,
        disponible: disponible.value === true
      })
    }

    return { planes: Array.from(mapaActual.values()) }
  }

  /**
   * Genera el objeto para `public/planes/{codigo}.json` (detalle del plan).
   * @param {{ revisadoPor?: string|null }} [opciones]
   * @returns {Object|null}
   */
  function generarJSONDetalle({ revisadoPor = null } = {}) {
    if (!planCodigo.value) return null

    const materiasDetalle = {}
    for (const [codigo, m] of Object.entries(materias.value)) {
      const cursarJson = condicionAJson(m.correlativas?.cursar)
      const aprobarJson = condicionAJson(m.correlativas?.aprobar)

      materiasDetalle[codigo] = {
        id: m.id || codigo,
        anio: m.anio,
        nombre: m.nombre || codigo,
        nombre_c: m.nombre_c || null,
        cursada: m.cursada || null,
        correlativas: {
          cursar: cursarJson,
          aprobar: aprobarJson
        },
        equivale_a: m.equivale_a || []
      }

      if (m.propia) materiasDetalle[codigo].propia = true
      if (m.cSiuned) materiasDetalle[codigo].cSiuned = true
    }

    return {
      plan: planCodigo.value,
      nombre: planNombre.value || `Plan ${planCodigo.value}`,
      formato: 'objeto',
      materias: materiasDetalle,
      disponible: disponible.value === true,
      revisadoEn: disponible.value === true ? new Date().toISOString() : null,
      revisadoPor: disponible.value === true ? revisadoPor : null
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
    jsonTexto,
    planCodigoOrigen,
    materias,
    planCodigo,
    planNombre,
    disponible,
    errores,
    advertencias,
    valido,
    hayPregrado,

    // Vistas derivadas
    materiasPorAnio,
    materiasLista,

    // Acciones
    importarJSONPlan,
    agregarMateria,
    eliminarMateria,
    actualizarMateria,
    actualizarCondicion,
    validar,
    generarJSONCatalogo,
    generarJSONDetalle,
    descargarJSON,
    copiarJSON
  }
}
