// src/utils/planes.js
//
// Utilidades puras para leer los JSON de planes de `public/planes/`.
//
// La fuente de verdad de los planes es doble:
// - `planes.json` lista códigos y nombres.
// - `{codigo}.json` contiene las materias y sus correlatividades.
//
// Este módulo normaliza ambos formatos históricos y decide si un plan está
// disponible para darse de alta. Un plan no disponible (JSON ausente, formato
// desconocido, `plan` interno distinto del código del archivo o materias sin
// año reconocible) bloquea la carga: nunca se asume un estado académico.
//
// El código canónico es el de `planes.json`, siempre string (`662`, `662G`).
// `62G` es un alias legacy de `662G`, no un código válido para escribir.

/**
 * Códigos de plan de respaldo (catálogo histórico de `planes.json`).
 *
 * Se usa solo mientras el catálogo en runtime todavía no se cargó (por ejemplo
 * antes de que `useCatalogoPlanes` llame a `setCatalogoPlanes`). La fuente de
 * verdad es el catálogo cargado, que además declara qué planes están
 * `disponible`. Un código en esta lista significa que existe en `planes.json`,
 * no que se pueda dar de alta: para eso hace falta `disponible: true` y que su
 * `{codigo}.json` normalice.
 */
export const PLANES_CON_JSON = Object.freeze([
  '662',
  '662A', '662B', '662C', '662D', '662E', '662F', '662G', '662H', '662I',
  '662J', '662K', '662L', '662M', '662N', '662Ñ', '662O', '662P', '662Q',
  '662R', '662S', '662T', '662U', '662V', '662W', '662X',
  '663', '664', '665', '666',
  '708', '709',
  '389', '390', '391', '392', '393'
])

/** Formatos de JSON que sabe leer el normalizador. */
export const FORMATOS_PLAN = Object.freeze({
  OBJETO: 'objeto',
  LEGACY: 'legacy'
})

/**
 * Catálogo cargado en runtime desde `planes.json` (`null` mientras no cargó).
 * Es un array de `{ codigo, nombre, disponible }`.
 */
let catalogoCargado = null

/** Cache en memoria de detalles de plan resueltos por `validarPlanDetalle`. */
let cacheDetalle = new Map()

/**
 * Convierte un año de materia a número. Acepta `0`, `00`, etc.
 * @param {string|number} valor
 * @returns {number|null}
 */
function normalizarAnio(valor) {
  const numero = Number.parseInt(String(valor), 10)
  return Number.isNaN(numero) ? null : numero
}

/**
 * Extrae el año de una materia a partir de su código.
 *
 * Soporta los formatos que hoy existen en `public/planes/` y el formato nuevo
 * previsto:
 * - actual: `662-0.1`, `708-1.10`, `662-0.6.3` → año después del guion.
 * - nuevo:  `662-00-01.N` → año de dos dígitos después del guion.
 * - legacy: `62G.1.1` (PCod) o `1.1` (Cod) → primer segmento numérico.
 *
 * Devuelve `null` si no puede reconocer el año. No se debe interpretar `null`
 * como pregrado: un año desconocido hace que el plan no sea normalizable.
 *
 * @param {string} id código de materia
 * @returns {number|null} año (`0` = pregrado) o `null`
 */
export function anioDeMateria(id) {
  if (typeof id !== 'string') return null

  const codigo = id.trim()
  if (!codigo) return null

  // Formato actual/nuevo: {plan}-{año}.{número}[.{sub}] o {plan}-{AA}-{NN}
  const conGuion = codigo.match(/^[^-]+-(\d{1,2})(?:[.-]|$)/)
  if (conGuion) return normalizarAnio(conGuion[1])

  // Formato legacy: {plan}.{año}.{número} o {año}.{número}.
  // Si el primer segmento es un año (1-2 dígitos) se usa ese; si parece un
  // código de plan (letras o 3+ dígitos) el año es el segundo segmento.
  const segmentos = codigo.split('.')
  if (segmentos.length >= 2) {
    const primero = segmentos[0].trim()
    const segundo = segmentos[1].trim()
    const primerEsAnio = /^\d{1,2}$/.test(primero)
    if (primerEsAnio) return normalizarAnio(primero)
    if (segmentos.length >= 3 && /^\d{1,2}$/.test(segundo)) return normalizarAnio(segundo)
  }

  return null
}

/**
 * Construye el resultado de un plan no disponible, con el motivo para poder
 * reportarlo en la UI o en la importación.
 * @param {string} codigo
 * @param {string} motivo
 * @param {Object} [extra]
 * @returns {Object}
 */
function planNoDisponible(codigo, motivo, extra = {}) {
  return {
    disponible: false,
    codigo,
    plan: null,
    nombre: null,
    formato: null,
    materias: {},
    motivo,
    ...extra
  }
}

/**
 * Normaliza una materia del formato actual (objeto `materias`).
 * @param {string} id
 * @param {Object} datos
 * @returns {{ materia: Object|null, motivo: string|null }}
 */
function normalizarMateriaObjeto(id, datos) {
  const anio = anioDeMateria(id) ?? (Number.isInteger(datos?.anio) ? datos.anio : null)
  if (anio === null) {
    return { materia: null, motivo: `La materia "${id}" no tiene un año reconocible.` }
  }

  return {
    materia: {
      id,
      anio,
      nombre: datos?.nombre || id,
      nombre_c: datos?.nombre_c ?? datos?.nombreCorto ?? null,
      nombreCorto: datos?.nombre_c ?? datos?.nombreCorto ?? null,
      cursada: datos?.cursada ?? null,
      correlativas: datos?.correlativas ?? null
    },
    motivo: null
  }
}

/**
 * Normaliza el formato actual: `{ plan, nombre, materias: { id: {...} } }`.
 * @param {Object} json
 * @param {string} codigo
 * @returns {Object}
 */
function normalizarFormatoObjeto(json, codigo) {
  const planInterno = String(json?.plan ?? '').trim()
  if (!planInterno) {
    return planNoDisponible(codigo, 'El JSON no declara el campo "plan".')
  }
  if (planInterno !== codigo) {
    return planNoDisponible(
      codigo,
      `El plan interno "${planInterno}" no coincide con el código del archivo "${codigo}".`
    )
  }

  const materiasRaw = json?.materias
  if (!materiasRaw || typeof materiasRaw !== 'object' || Array.isArray(materiasRaw)) {
    return planNoDisponible(codigo, 'El JSON no tiene un mapa "materias" válido.')
  }

  const materias = {}
  for (const [id, datos] of Object.entries(materiasRaw)) {
    const { materia, motivo } = normalizarMateriaObjeto(id, datos)
    if (!materia) {
      return planNoDisponible(codigo, motivo)
    }
    materias[id] = materia
  }

  if (Object.keys(materias).length === 0) {
    return planNoDisponible(codigo, 'El plan no tiene materias.')
  }

  return {
    disponible: true,
    codigo,
    plan: planInterno,
    nombre: json?.nombre || codigo,
    formato: FORMATOS_PLAN.OBJETO,
    materias,
    motivo: null
  }
}

/**
 * Normaliza el formato legacy (array de objetos con `Plan`, `Cod`, `PCod`,
 * `Materia`, `Cursada`, `CodC`, `CodA`).
 *
 * Este formato se sigue leyendo para poder reportar el plan como no disponible
 * sin romper, pero no se usa para altas hasta que sus datos estén revisados.
 *
 * @param {Array} json
 * @param {string} codigo
 * @returns {Object}
 */
function normalizarFormatoLegacy(json, codigo) {
  const planes = [...new Set(json.map((item) => String(item?.Plan ?? '').trim()).filter(Boolean))]

  if (planes.length === 0) {
    return planNoDisponible(codigo, 'El array legacy no declara el campo "Plan".')
  }
  if (planes.length > 1) {
    return planNoDisponible(codigo, `El array legacy mezcla varios planes: ${planes.join(', ')}.`)
  }

  const planInterno = planes[0]
  if (planInterno !== codigo) {
    return planNoDisponible(
      codigo,
      `El plan interno "${planInterno}" no coincide con el código del archivo "${codigo}".`,
      { formato: FORMATOS_PLAN.LEGACY, plan: planInterno }
    )
  }

  const materias = {}
  for (const item of json) {
    const id = String(item?.PCod || item?.Cod || '').trim()
    if (!id) {
      return planNoDisponible(codigo, 'Hay una materia legacy sin código.', {
        formato: FORMATOS_PLAN.LEGACY,
        plan: planInterno
      })
    }

    const anio = anioDeMateria(id) ?? anioDeMateria(item?.Cod)
    if (anio === null) {
      return planNoDisponible(codigo, `La materia legacy "${id}" no tiene un año reconocible.`, {
        formato: FORMATOS_PLAN.LEGACY,
        plan: planInterno
      })
    }

    if (materias[id]) {
      return planNoDisponible(codigo, `El plan legacy tiene códigos de materia duplicados: "${id}".`, {
        formato: FORMATOS_PLAN.LEGACY,
        plan: planInterno
      })
    }

    materias[id] = {
      id,
      anio,
      nombre: item?.Materia || id,
      nombre_c: item?.NombreCorto ?? null,
      nombreCorto: item?.NombreCorto ?? null,
      cursada: item?.Cursada ? String(item.Cursada).trim().toLowerCase() : null,
      correlativas: {
        cursar: Array.isArray(item?.CodC) ? item.CodC : [],
        aprobar: Array.isArray(item?.CodA) ? item.CodA : []
      }
    }
  }

  if (Object.keys(materias).length === 0) {
    return planNoDisponible(codigo, 'El plan legacy no tiene materias.', {
      formato: FORMATOS_PLAN.LEGACY,
      plan: planInterno
    })
  }

  return {
    disponible: true,
    codigo,
    plan: planInterno,
    nombre: `Plan ${planInterno}`,
    formato: FORMATOS_PLAN.LEGACY,
    materias,
    motivo: null
  }
}

/**
 * Normaliza el JSON de un plan y decide si está disponible para altas.
 *
 * No lanza excepciones: devuelve siempre un objeto con `disponible` y `motivo`
 * para que la UI/importación pueda reportar el problema sin capturar errores.
 *
 * @param {Object|Array} json contenido de `public/planes/{codigo}.json`
 * @param {string} codigo código del plan (ej. `"662"`)
 * @returns {{
 *   disponible: boolean,
 *   codigo: string,
 *   plan: string|null,
 *   nombre: string|null,
 *   formato: string|null,
 *   materias: Record<string, Object>,
 *   motivo: string|null
 * }}
 */
export function normalizarPlanJson(json, codigo) {
  const codigoNormalizado = String(codigo ?? '').trim()

  if (!codigoNormalizado) {
    return planNoDisponible('', 'Falta el código del plan.')
  }
  if (json == null) {
    return planNoDisponible(codigoNormalizado, 'El JSON del plan está vacío.')
  }

  if (Array.isArray(json)) {
    return normalizarFormatoLegacy(json, codigoNormalizado)
  }
  if (typeof json !== 'object') {
    return planNoDisponible(codigoNormalizado, 'El JSON del plan no es un objeto ni un array.')
  }

  return normalizarFormatoObjeto(json, codigoNormalizado)
}

/**
 * Indica si un plan normalizado tiene al menos una materia de año 0 (pregrado).
 * Un plan no disponible nunca se considera con pregrado.
 * @param {Object} plan resultado de `normalizarPlanJson`
 * @returns {boolean}
 */
export function tienePregrado(plan) {
  if (!plan || plan.disponible === false || !plan.materias) return false

  return Object.entries(plan.materias).some(([id, materia]) => {
    const anio = Number.isInteger(materia?.anio) ? materia.anio : anioDeMateria(id)
    return anio === 0
  })
}

/**
 * Estado inicial de un plan al dar de alta:
 * - `ingresante` si tiene pregrado;
 * - `activo` si no lo tiene;
 * - `null` si el plan no está disponible (no se debe dar de alta).
 * @param {Object} plan resultado de `normalizarPlanJson`
 * @returns {'ingresante'|'activo'|null}
 */
export function estadoInicialDePlan(plan) {
  if (!plan || plan.disponible === false) return null
  return tienePregrado(plan) ? 'ingresante' : 'activo'
}

/**
 * Normaliza el catálogo crudo de `planes.json` a `[{ codigo, nombre, disponible }]`.
 * Acepta `{ planes: [...] }` o un array plano. Descarta entradas sin código y
 * duplicados (se queda con la primera aparición). `disponible` es `true` solo si
 * vale exactamente `true`; cualquier otro valor se considera no disponible.
 *
 * @param {Object|Array} json contenido de `planes.json`
 * @returns {Array<{ codigo: string, nombre: string, disponible: boolean }>}
 */
export function normalizarCatalogoPlanes(json) {
  const lista = Array.isArray(json) ? json : Array.isArray(json?.planes) ? json.planes : null
  if (!lista) return []

  const planes = []
  const vistos = new Set()
  for (const item of lista) {
    const codigo = String(item?.codigo ?? '').trim()
    if (!codigo || vistos.has(codigo)) continue
    vistos.add(codigo)
    planes.push({
      codigo,
      nombre: String(item?.nombre ?? codigo).trim() || codigo,
      disponible: item?.disponible === true
    })
  }
  return planes
}

/**
 * Carga el catálogo de planes en memoria. Lo llama `useCatalogoPlanes` después
 * de hacer `fetch('/planes/planes.json')`.
 *
 * @param {Object|Array} json catálogo crudo o normalizado
 * @returns {Array<{ codigo: string, nombre: string, disponible: boolean }>}
 */
export function setCatalogoPlanes(json) {
  catalogoCargado = normalizarCatalogoPlanes(json)
  return catalogoCargado
}

/**
 * Limpia el catálogo y la cache de detalles. Pensado para tests y para forzar
 * una recarga del catálogo.
 * @returns {void}
 */
export function resetCatalogoPlanes() {
  catalogoCargado = null
  cacheDetalle = new Map()
}

/**
 * Todos los códigos canónicos del catálogo cargado. Si el catálogo todavía no
 * cargó, devuelve el fallback hardcodeado para poder resolver nombres de
 * usuarios existentes sin bloquear la app.
 * @returns {string[]}
 */
export function catalogoDePlanes() {
  if (catalogoCargado) return catalogoCargado.map((plan) => plan.codigo)
  return [...PLANES_CON_JSON]
}

/**
 * Códigos de plan habilitados para el alta (`disponible: true` en `planes.json`).
 * Si el catálogo no cargó devuelve `[]`: nunca se asume disponibilidad.
 * @returns {string[]}
 */
export function planesDisponibles() {
  if (!catalogoCargado) return []
  return catalogoCargado.filter((plan) => plan.disponible).map((plan) => plan.codigo)
}

/**
 * Indica si un código de plan está habilitado para el alta de usuarios.
 * @param {string} codigo
 * @returns {boolean}
 */
export function esPlanDisponible(codigo) {
  return planesDisponibles().includes(String(codigo ?? '').trim())
}

/**
 * Mapa `codigo → nombre` del catálogo cargado (vacío si no cargó).
 * @returns {Record<string, string>}
 */
export function nombresDePlanes() {
  const mapa = {}
  if (catalogoCargado) {
    for (const plan of catalogoCargado) mapa[plan.codigo] = plan.nombre
  }
  return mapa
}

/**
 * Resuelve un valor de plan a su código canónico y nombre.
 *
 * Resuelve **contra todos** los códigos del catálogo, sin gatear por
 * disponibilidad: un usuario existente con un plan que pasó a `disponible:
 * false` tiene que seguir normalizándose. El gate se aplica aparte
 * (`esPlanDisponible` / `validarPlanDetalle`).
 *
 * Acepta:
 * - código canónico (`"662"`, `"708"`, `"662G"`)
 * - alias legacy (`"62G"` → `"662G"`)
 * - nombre completo v1 (`"662 Profesorado de Música"` → `"662"`)
 *
 * @param {string} valor
 * @param {Record<string, string>} [nombres] mapa codigo → nombre completo
 * @returns {{ codigo: string, nombre: string }|null} null si no se puede resolver
 */
export function resolverCodigoPlan(valor, nombres = {}) {
  if (!valor) return null
  const str = String(valor).trim()
  if (!str) return null

  const nombresPlanes = nombres || {}

  // 1) Si ya es un código canónico (existe en el catálogo)
  if (catalogoDePlanes().includes(str)) {
    return { codigo: str, nombre: nombresPlanes[str] || str }
  }

  // 2) Alias legacy: "62G" → "662G"
  if (str === '62G') {
    const destino = '662G'
    return { codigo: destino, nombre: nombresPlanes[destino] || destino }
  }

  // 3) Buscar por nombre completo (v1) en el mapa de nombres
  for (const [codigo, nombre] of Object.entries(nombresPlanes)) {
    if (String(nombre).toLowerCase() === str.toLowerCase()) {
      return { codigo, nombre }
    }
  }

  // No se pudo resolver
  return null
}

/**
 * Valida que un plan se pueda dar de alta combinando catálogo y detalle.
 *
 * 1. Verifica que el código esté en `planesDisponibles()`.
 * 2. Hace `fetch('/planes/{codigo}.json')` (cache en memoria por código).
 * 3. Normaliza con `normalizarPlanJson`.
 * 4. Si el detalle no normaliza, gana el detalle y se reporta el motivo.
 *
 * Nunca lanza: siempre devuelve `{ disponible, codigo, motivo, plan }`.
 *
 * @param {string} codigo
 * @param {{ fetchImpl?: Function }} [opciones] `fetchImpl` inyectable para tests
 * @returns {Promise<{ disponible: boolean, codigo: string, motivo: string|null, plan: Object|null }>}
 */
export async function validarPlanDetalle(codigo, opciones = {}) {
  const codigoNormalizado = String(codigo ?? '').trim()

  if (!codigoNormalizado) {
    return { disponible: false, codigo: '', motivo: 'Falta el código del plan.', plan: null }
  }

  if (!esPlanDisponible(codigoNormalizado)) {
    return {
      disponible: false,
      codigo: codigoNormalizado,
      motivo: `El plan "${codigoNormalizado}" no está disponible en el catálogo.`,
      plan: null
    }
  }

  if (cacheDetalle.has(codigoNormalizado)) {
    return cacheDetalle.get(codigoNormalizado)
  }

  const fetchImpl =
    opciones.fetchImpl || (typeof fetch === 'function' ? fetch.bind(globalThis) : null)

  if (!fetchImpl) {
    return {
      disponible: false,
      codigo: codigoNormalizado,
      motivo: 'No hay un cliente HTTP disponible para leer el detalle del plan.',
      plan: null
    }
  }

  let json
  try {
    const respuesta = await fetchImpl(`/planes/${codigoNormalizado}.json`)
    if (!respuesta || respuesta.ok === false) {
      return {
        disponible: false,
        codigo: codigoNormalizado,
        motivo: `No se pudo leer el detalle del plan "${codigoNormalizado}".`,
        plan: null
      }
    }
    json = await respuesta.json()
  } catch (error) {
    return {
      disponible: false,
      codigo: codigoNormalizado,
      motivo: `Error al leer el detalle del plan "${codigoNormalizado}": ${error?.message || error}`,
      plan: null
    }
  }

  const plan = normalizarPlanJson(json, codigoNormalizado)
  const resultado = plan.disponible
    ? { disponible: true, codigo: codigoNormalizado, motivo: null, plan }
    : { disponible: false, codigo: codigoNormalizado, motivo: plan.motivo, plan }

  cacheDetalle.set(codigoNormalizado, resultado)
  return resultado
}
