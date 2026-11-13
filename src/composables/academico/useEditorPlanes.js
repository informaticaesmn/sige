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
import { validarRequisitos } from '@/utils/requisitos.js'

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
 * Normaliza un requisito del JSON al modelo editable del editor.
 *
 * Conserva `tipo` y `minimo` tal como vienen para que la validación pueda
 * reportarlos si son inválidos; solo normaliza los tipos de datos y los
 * candidatos a un array de códigos.
 *
 * @param {Object} requisito requisito crudo del JSON
 * @param {number} indice posición en el array (para ids faltantes)
 * @returns {Object} requisito editable
 */
export function normalizarRequisitoJSON(requisito, indice = 0) {
  const datos = requisito && typeof requisito === 'object' ? requisito : {}
  const anio =
    datos.anio === null || datos.anio === undefined || datos.anio === ''
      ? null
      : Number.parseInt(String(datos.anio), 10)

  return {
    id: String(datos.id ?? `R-${indice + 1}`).trim() || `R-${indice + 1}`,
    anio: Number.isNaN(anio) ? null : anio,
    tipo: typeof datos.tipo === 'string' ? datos.tipo : 'obligatorio',
    minimo: Number.isInteger(datos.minimo) ? datos.minimo : 1,
    candidatos: normalizarEquivalencias(datos.candidatos),
    etiqueta: typeof datos.etiqueta === 'string' ? datos.etiqueta.trim() : ''
  }
}

/**
 * Serializa un requisito editable al formato del JSON del plan.
 * Omite `etiqueta` cuando está vacía.
 * @param {Object} requisito
 * @returns {Object}
 */
function serializarRequisito(requisito) {
  const datos = {
    id: requisito.id,
    anio: requisito.anio ?? null,
    tipo: requisito.tipo,
    minimo: requisito.minimo,
    candidatos: [...(requisito.candidatos || [])]
  }
  if (requisito.etiqueta) datos.etiqueta = requisito.etiqueta
  return datos
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
  /** Indica si el JSON importado es una plantilla (ej. 662Letra → 662A..662Q). */
  const esPlantilla = ref(false)
  /** Requisitos del plan (grupos de espacios obligatorios/conmutables/optativos). */
  const requisitosPlan = ref([])

  // --- Estado de edición ---
  const materias = ref({}) // mapa { [codigo]: MateriaEdit }
  const planCodigo = ref('')
  const planNombre = ref('')
  const disponible = ref(false)

  /** Indica si el plan tiene requisitos declarados. */
  const hayRequisitos = computed(() => requisitosPlan.value.length > 0)
  /** Indica si alguna materia declara equivalencias. */
  const hayEquivalencias = computed(() =>
    Object.values(materias.value).some(
      (materia) => Array.isArray(materia.equivale_a) && materia.equivale_a.length > 0
    )
  )

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
    /** Detectar si el plan importado es una plantilla (tiene esPlantilla: true o el plan es 662Letra). */
    esPlantilla.value = !!datos.esPlantilla || rawPlan.startsWith('662Letra')

    // Normalizar los requisitos del plan para editarlos en la UI.
    requisitosPlan.value = Array.isArray(datos.requisitos)
      ? datos.requisitos.map((requisito, indice) => normalizarRequisitoJSON(requisito, indice))
      : []

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

      // Preservar equivale_a en la materia si existe
      const matData = { ...mat }
      if (matData.equivale_a) matData.equivale_a = Array.isArray(matData.equivale_a) ? matData.equivale_a : [matData.equivale_a]

      nuevoMapa[codigo] = normalizarMateriaJSON(codigo, matData)
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
      errores: erroresImport,
      hayRequisitos: hayRequisitos.value,
      hayEquivalencias: hayEquivalencias.value
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
  // 2b. Edición de requisitos (espacios obligatorios, conmutables y optativos)
  // ---------------------------------------------------------------------------

  /**
   * Genera un id único para un requisito nuevo, con el patrón `R-{anio}-{nn}`.
   * @param {number|null} anio
   * @returns {string}
   */
  function generarIdRequisito(anio) {
    const prefijo = `R-${anio ?? 'X'}`
    const usados = new Set(requisitosPlan.value.map((requisito) => requisito.id))
    let numero = 1
    let id = `${prefijo}-${String(numero).padStart(2, '0')}`
    while (usados.has(id)) {
      numero += 1
      id = `${prefijo}-${String(numero).padStart(2, '0')}`
    }
    return id
  }

  /**
   * Agrega un requisito vacío al plan.
   *
   * @param {number|null} [anio] año al que pertenece; `null` = transversal
   * @returns {Object} requisito creado
   */
  function agregarRequisito(anio = null) {
    const anioNormalizado =
      anio === null || anio === undefined || anio === '' ? null : Number(anio)
    const nuevo = {
      id: generarIdRequisito(anioNormalizado),
      anio: Number.isInteger(anioNormalizado) ? anioNormalizado : null,
      tipo: 'obligatorio',
      minimo: 1,
      candidatos: [],
      etiqueta: ''
    }
    requisitosPlan.value = [...requisitosPlan.value, nuevo]
    return nuevo
  }

  /**
   * Ajusta `minimo` a un valor válido para el tipo y la cantidad de candidatos.
   * @param {Object} requisito
   * @returns {Object} requisito con `minimo` corregido
   */
  function ajustarMinimo(requisito) {
    const candidatos = requisito.candidatos || []
    if (requisito.tipo === 'obligatorio' || requisito.tipo === 'conmutable') {
      return { ...requisito, minimo: 1 }
    }
    if (requisito.tipo === 'optativo') {
      const maximo = Math.max(1, candidatos.length - 1)
      const minimo = Number.isInteger(requisito.minimo) ? requisito.minimo : 1
      return { ...requisito, minimo: Math.min(Math.max(minimo, 1), maximo) }
    }
    return requisito
  }

  /**
   * Actualiza un campo de un requisito.
   *
   * Mantiene la coherencia del modelo: al cambiar el tipo se reajusta el
   * mínimo, al cambiar el año se descartan candidatos de otros años y al
   * cambiar los candidatos se acota el mínimo.
   *
   * @param {number} indice posición en `requisitosPlan`
   * @param {'id'|'anio'|'tipo'|'minimo'|'candidatos'|'etiqueta'} campo
   * @param {any} valor
   */
  function actualizarRequisito(indice, campo, valor) {
    const actual = requisitosPlan.value[indice]
    if (!actual) return

    let requisito = { ...actual, [campo]: valor }

    if (campo === 'id') {
      requisito.id = String(valor ?? '').trim()
    }

    if (campo === 'anio') {
      const anio = valor === null || valor === '' ? null : Number(valor)
      requisito.anio = Number.isInteger(anio) ? anio : null
      if (requisito.anio !== null) {
        // Los candidatos deben pertenecer al mismo año que el requisito.
        requisito.candidatos = (requisito.candidatos || []).filter((codigo) => {
          const materia = materias.value[codigo]
          return materia && materia.anio === requisito.anio
        })
      }
    }

    if (campo === 'tipo') {
      requisito.tipo = valor
      if (valor === 'obligatorio' && (requisito.candidatos || []).length > 1) {
        // Un obligatorio solo admite un candidato: se conserva el primero.
        requisito.candidatos = [requisito.candidatos[0]]
      }
    }

    if (campo === 'etiqueta') {
      requisito.etiqueta = String(valor ?? '').trim()
    }

    requisito = ajustarMinimo(requisito)
    requisitosPlan.value = requisitosPlan.value.map((item, i) =>
      i === indice ? requisito : item
    )
  }

  /**
   * Agrega o quita un candidato de un requisito.
   * En los obligatorios el comportamiento es excluyente (un solo candidato).
   * @param {number} indice
   * @param {string} codigo
   */
  function alternarCandidato(indice, codigo) {
    const requisito = requisitosPlan.value[indice]
    if (!requisito) return

    const seleccionados = new Set(requisito.candidatos || [])
    if (requisito.tipo === 'obligatorio') {
      const yaEraElUnico = seleccionados.size === 1 && seleccionados.has(codigo)
      seleccionados.clear()
      if (!yaEraElUnico) seleccionados.add(codigo)
    } else if (seleccionados.has(codigo)) {
      seleccionados.delete(codigo)
    } else {
      seleccionados.add(codigo)
    }

    actualizarRequisito(indice, 'candidatos', [...seleccionados])
  }

  /**
   * Elimina un requisito del plan.
   * @param {number} indice
   */
  function eliminarRequisito(indice) {
    requisitosPlan.value = requisitosPlan.value.filter((_, i) => i !== indice)
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
   * Lista de materias como array para SelectMateria/EditorCondicion y para el
   * editor de requisitos (que agrupa los candidatos por año).
   * @returns {{ codigo: string, nombre: string, anio: number|null }[]}
   */
  const materiasLista = computed(() =>
    Object.entries(materias.value).map(([codigo, m]) => ({
      codigo,
      nombre: m.nombre || codigo,
      anio: Number.isInteger(m.anio) ? m.anio : anioDeMateria(codigo)
    }))
  )

  /**
   * Códigos de materia que ya pertenecen a algún requisito.
   * Se usa para avisar cuando una materia queda sin requisito.
   * @returns {Set<string>}
   */
  const materiasAsignadas = computed(() => {
    const asignadas = new Set()
    for (const requisito of requisitosPlan.value) {
      for (const codigo of requisito.candidatos || []) asignadas.add(codigo)
    }
    return asignadas
  })

  /**
   * Materias del plan que todavía no pertenecen a ningún requisito.
   * @returns {{ codigo: string, nombre: string, anio: number|null }[]}
   */
  const materiasSinRequisito = computed(() =>
    materiasLista.value.filter((materia) => !materiasAsignadas.value.has(materia.codigo))
  )

  /**
   * Años presentes en el plan, ordenados de menor a mayor.
   * @returns {number[]}
   */
  const aniosPlan = computed(() => {
    const anios = new Set()
    for (const materia of materiasLista.value) {
      if (Number.isInteger(materia.anio) && materia.anio >= 0) anios.add(materia.anio)
    }
    return [...anios].sort((a, b) => a - b)
  })

  /** Cantidad de grupos de requisitos declarados en el plan. */
  const requisitosCount = computed(() => requisitosPlan.value.length)

  /** Cantidad de materias que declaran al menos una equivalencia. */
  const equivalenciasCount = computed(
    () =>
      Object.values(materias.value).filter(
        (m) => Array.isArray(m.equivale_a) && m.equivale_a.length > 0
      ).length
  )

  // ---------------------------------------------------------------------------
  // 4. Validación
  // ---------------------------------------------------------------------------

  /**
   * Ejecuta validaciones sobre el mapa actual de materias y los requisitos.
   *
   * La ausencia de requisitos no bloquea la exportación (el plan puede ser un
   * borrador), pero se informa como advertencia.
   *
   * @returns {Promise<{ exito: boolean, errores: string[], advertencias: string[] }>}
   */
  async function validar() {
    const resultado = validarMaterias(materias.value)
    const resultadoRequisitos = validarRequisitos(
      {
        materias: materias.value,
        requisitos: requisitosPlan.value.map(serializarRequisito)
      },
      { permitirAusente: true }
    )

    errores.value = [...resultado.errores, ...resultadoRequisitos.errores]
    advertencias.value = [
      ...(resultado.advertencias || []),
      ...resultadoRequisitos.advertencias
    ]
    valido.value = errores.value.length === 0
    return { exito: valido.value, errores: errores.value, advertencias: advertencias.value }
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

    // Incluir requisitos en la salida si el plan los tiene
    const planData = {
      plan: planCodigo.value,
      nombre: planNombre.value || `Plan ${planCodigo.value}`,
      formato: 'objeto',
      materias: materiasDetalle,
      disponible: disponible.value === true,
      revisadoEn: disponible.value === true ? new Date().toISOString() : null,
      revisadoPor: disponible.value === true ? revisadoPor : null
    }
    if (hayRequisitos.value) {
      planData.requisitos = requisitosPlan.value.map(serializarRequisito)
    }
    return planData
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
    esPlantilla,
    hayRequisitos,
    hayEquivalencias,
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
    materiasAsignadas,
    materiasSinRequisito,
    aniosPlan,
    requisitosPlan,
    requisitosCount,
    equivalenciasCount,

    // Acciones
    importarJSONPlan,
    agregarMateria,
    eliminarMateria,
    actualizarMateria,
    actualizarCondicion,
    agregarRequisito,
    actualizarRequisito,
    alternarCandidato,
    eliminarRequisito,
    validar,
    generarJSONCatalogo,
    generarJSONDetalle,
    descargarJSON,
    copiarJSON
  }
}
