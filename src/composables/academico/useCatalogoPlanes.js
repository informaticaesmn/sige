// src/composables/academico/useCatalogoPlanes.js
//
// Carga y cachea `public/planes/planes.json`, la fuente de verdad de la
// disponibilidad de los planes para el alta de usuarios.
//
// Es un singleton a nivel de módulo (AGENTS.md §7): el catálogo es único para
// toda la app, así que los `ref` y la promesa de carga viven fuera de la
// función factory. `cargarCatalogoPlanes()` es idempotente: varias llamadas
// concurrentes comparten la misma promesa y no duplican el `fetch`.
//
// Al cargar, delega en `setCatalogoPlanes()` de `src/utils/planes.js`, que es
// quien expone `planesDisponibles()` / `esPlanDisponible()` para el resto de la
// app. Si el catálogo no se puede cargar, `planesDisponibles()` queda vacío: el
// alta debe fallar con error explícito, nunca asumir disponibilidad.
import { computed, ref } from 'vue'
import { resetCatalogoPlanes as limpiarCatalogoUtil, setCatalogoPlanes } from '@/utils/planes.js'

/** Ruta pública del catálogo de planes. */
export const RUTA_CATALOGO_PLANES = '/planes/planes.json'

/** Mapa `codigo → { codigo, nombre, disponible }` del catálogo cargado. */
const catalogo = ref({})

/** `true` cuando el catálogo se cargó y normalizó correctamente. */
const cargado = ref(false)

/** `true` mientras hay un `fetch` en curso. */
const cargando = ref(false)

/** Último error de carga (o `null`). */
const error = ref(null)

/** Promesa de la carga en curso, para deduplicar llamadas concurrentes. */
let promesaCarga = null

/**
 * Códigos de plan habilitados para el alta (`disponible: true`).
 * @type {import('vue').ComputedRef<string[]>}
 */
const planesDisponibles = computed(() =>
  Object.values(catalogo.value)
    .filter((plan) => plan.disponible)
    .map((plan) => plan.codigo)
)

/**
 * Carga el catálogo de planes desde `planes.json`.
 *
 * Idempotente: si ya está cargado devuelve el resultado cacheado, y si hay una
 * carga en curso comparte la misma promesa. Nunca lanza: devuelve
 * `{ exito, datos, error }` (AGENTS.md §5).
 *
 * @param {{ fetchImpl?: Function, forzar?: boolean }} [opciones]
 *   `fetchImpl` inyectable para tests; `forzar` recarga aunque ya esté cargado.
 * @returns {Promise<{ exito: boolean, datos: Record<string, Object>, error: any }>}
 */
export async function cargarCatalogoPlanes(opciones = {}) {
  const forzar = opciones.forzar === true

  if (cargado.value && !forzar) {
    return { exito: true, datos: catalogo.value, error: null }
  }
  if (promesaCarga && !forzar) return promesaCarga

  const fetchImpl =
    opciones.fetchImpl || (typeof fetch === 'function' ? fetch.bind(globalThis) : null)

  if (!fetchImpl) {
    const e = new Error('No hay un cliente HTTP disponible para cargar el catálogo de planes.')
    error.value = e
    return { exito: false, datos: {}, error: e }
  }

  cargando.value = true
  error.value = null

  const promesa = (async () => {
    try {
      const respuesta = await fetchImpl(RUTA_CATALOGO_PLANES)
      if (!respuesta || respuesta.ok === false) {
        throw new Error(`No se pudo descargar el catálogo de planes (${RUTA_CATALOGO_PLANES}).`)
      }

      const lista = setCatalogoPlanes(await respuesta.json())
      if (lista.length === 0) {
        throw new Error('El catálogo de planes está vacío o mal formado.')
      }

      const mapa = {}
      for (const plan of lista) mapa[plan.codigo] = plan

      catalogo.value = mapa
      cargado.value = true
      return { exito: true, datos: mapa, error: null }
    } catch (e) {
      error.value = e
      return { exito: false, datos: {}, error: e }
    } finally {
      cargando.value = false
      promesaCarga = null
    }
  })()

  promesaCarga = promesa
  return promesa
}

/**
 * Garantiza que el catálogo esté cargado antes de gatear un alta.
 * Idempotente: si ya está cargado no vuelve a hacer `fetch`.
 * @param {{ fetchImpl?: Function }} [opciones]
 * @returns {Promise<{ exito: boolean, datos: Record<string, Object>, error: any }>}
 */
export async function asegurarCatalogo(opciones = {}) {
  if (cargado.value) {
    return { exito: true, datos: catalogo.value, error: null }
  }
  return cargarCatalogoPlanes(opciones)
}

/**
 * Reinicia el estado del catálogo (tests y recarga forzada). También limpia el
 * catálogo de `src/utils/planes.js` para que `planesDisponibles()` quede vacío.
 * @returns {void}
 */
export function resetCatalogo() {
  catalogo.value = {}
  cargado.value = false
  cargando.value = false
  error.value = null
  promesaCarga = null
  limpiarCatalogoUtil()
}

/**
 * Hook singleton del catálogo de planes.
 */
export function useCatalogoPlanes() {
  return {
    catalogo,
    cargado,
    cargando,
    error,
    planesDisponibles,
    cargarCatalogoPlanes,
    asegurarCatalogo,
    resetCatalogo
  }
}
