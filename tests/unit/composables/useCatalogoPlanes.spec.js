/**
 * Tests unitarios para useCatalogoPlanes.js
 *
 * Valida:
 * - Carga del catálogo con `fetch` inyectado y normalización del mapa
 * - Integración con `src/utils/planes.js` (`planesDisponibles`, `esPlanDisponible`)
 * - Idempotencia de `asegurarCatalogo` y deduplicación de llamadas concurrentes
 * - Errores explícitos (HTTP, red, catálogo vacío, sin cliente HTTP)
 * - `resetCatalogo`
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  RUTA_CATALOGO_PLANES,
  asegurarCatalogo,
  cargarCatalogoPlanes,
  resetCatalogo,
  useCatalogoPlanes
} from '@/composables/academico/useCatalogoPlanes.js'
import { esPlanDisponible, planesDisponibles } from '@/utils/planes.js'

const catalogoJson = {
  planes: [
    { codigo: '662', nombre: '662 Profesorado de Música', disponible: true },
    { codigo: '708', nombre: '708 Técnico Superior en Sonido', disponible: true },
    { codigo: '662G', nombre: '662G Guitarra', disponible: false },
    { codigo: '666', nombre: '666 Composición', disponible: false }
  ]
}

/** Falso `fetch` que devuelve `json` una sola vez. */
function fetchOk(json) {
  return vi.fn(async () => ({ ok: true, json: async () => json }))
}

describe('useCatalogoPlanes', () => {
  beforeEach(() => {
    resetCatalogo()
  })

  afterEach(() => {
    resetCatalogo()
    vi.unstubAllGlobals()
  })

  it('carga el catálogo y expone el mapa y los disponibles', async () => {
    const fetchImpl = fetchOk(catalogoJson)
    const { planesDisponibles: computedDisponibles } = useCatalogoPlanes()

    const resultado = await cargarCatalogoPlanes({ fetchImpl })

    expect(resultado.exito).toBe(true)
    expect(fetchImpl).toHaveBeenCalledWith(RUTA_CATALOGO_PLANES)
    expect(computedDisponibles.value).toEqual(['662', '708'])
  })

  it('integra el catálogo con src/utils/planes.js', async () => {
    await cargarCatalogoPlanes({ fetchImpl: fetchOk(catalogoJson) })

    expect(planesDisponibles()).toEqual(['662', '708'])
    expect(esPlanDisponible('662')).toBe(true)
    expect(esPlanDisponible('662G')).toBe(false)
  })

  it('asegurarCatalogo es idempotente (no vuelve a hacer fetch)', async () => {
    const fetchImpl = fetchOk(catalogoJson)

    const primero = await asegurarCatalogo({ fetchImpl })
    const segundo = await asegurarCatalogo({ fetchImpl })

    expect(primero.exito).toBe(true)
    expect(segundo.exito).toBe(true)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('deduplica llamadas concurrentes en una sola promesa', async () => {
    const fetchImpl = fetchOk(catalogoJson)

    const [a, b] = await Promise.all([
      cargarCatalogoPlanes({ fetchImpl }),
      cargarCatalogoPlanes({ fetchImpl })
    ])

    expect(a.exito).toBe(true)
    expect(b.exito).toBe(true)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('recarga si se pide explícitamente con forzar', async () => {
    const fetchImpl = fetchOk(catalogoJson)

    await cargarCatalogoPlanes({ fetchImpl })
    await cargarCatalogoPlanes({ fetchImpl, forzar: true })

    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('devuelve error explícito si la respuesta HTTP falla', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: false, json: async () => ({}) }))
    const { cargado, error } = useCatalogoPlanes()

    const resultado = await cargarCatalogoPlanes({ fetchImpl })

    expect(resultado.exito).toBe(false)
    expect(resultado.error.message).toContain('No se pudo descargar')
    expect(cargado.value).toBe(false)
    expect(error.value).toBeInstanceOf(Error)
    expect(planesDisponibles()).toEqual([])
  })

  it('devuelve error explícito si el fetch lanza (red caída)', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('sin conexión')
    })

    const resultado = await cargarCatalogoPlanes({ fetchImpl })

    expect(resultado.exito).toBe(false)
    expect(resultado.error.message).toBe('sin conexión')
    expect(planesDisponibles()).toEqual([])
  })

  it('devuelve error explícito si el catálogo viene vacío o mal formado', async () => {
    const resultado = await cargarCatalogoPlanes({ fetchImpl: fetchOk({ otras: [] }) })

    expect(resultado.exito).toBe(false)
    expect(resultado.error.message).toContain('vacío o mal formado')
    expect(planesDisponibles()).toEqual([])
  })

  it('devuelve error explícito si no hay cliente HTTP disponible', async () => {
    vi.stubGlobal('fetch', undefined)

    const resultado = await cargarCatalogoPlanes()

    expect(resultado.exito).toBe(false)
    expect(resultado.error.message).toContain('cliente HTTP')
  })

  it('resetCatalogo limpia el estado y el catálogo de utils', async () => {
    await cargarCatalogoPlanes({ fetchImpl: fetchOk(catalogoJson) })
    const { catalogo, cargado } = useCatalogoPlanes()
    expect(cargado.value).toBe(true)

    resetCatalogo()

    expect(catalogo.value).toEqual({})
    expect(cargado.value).toBe(false)
    expect(planesDisponibles()).toEqual([])
  })
})
