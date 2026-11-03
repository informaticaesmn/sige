/**
 * Tests unitarios para usePlanesPublicos.js
 *
 * Valida el catálogo público, la apertura de un plan, la restauración de
 * `?materia`, la selección de materias (con guarda de códigos inexistentes),
 * los derivados de la vista y el botón "volver".
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({
  route: { query: {} },
  replace: null,
  push: null,
  back: null,
  user: null,
  catalogo: null,
  cargarCatalogoPlanes: null,
  planes: null,
  planSeleccionado: null,
  loading: null,
  error: null,
  cargarPlanes: null
}))

vi.mock('vue-router', () => ({
  useRoute: () => h.route,
  useRouter: () => ({ replace: h.replace, push: h.push, back: h.back })
}))

vi.mock('@/composables/auth/useAuth.js', async () => {
  const { ref } = await import('vue')
  h.user = ref(null)
  return { useAuth: () => ({ user: h.user }) }
})

vi.mock('@/composables/academico/useCatalogoPlanes.js', async () => {
  const { ref } = await import('vue')
  h.catalogo = ref({})
  h.cargarCatalogoPlanes = vi.fn()
  return {
    useCatalogoPlanes: () => ({
      catalogo: h.catalogo,
      cargarCatalogoPlanes: h.cargarCatalogoPlanes
    })
  }
})

vi.mock('@/composables/academico/usePlanesEstudio.js', async () => {
  const { ref } = await import('vue')
  h.planes = ref([])
  h.planSeleccionado = ref(null)
  h.loading = ref(false)
  h.error = ref(null)
  h.cargarPlanes = vi.fn()
  return {
    usePlanesEstudio: () => ({
      planes: h.planes,
      planSeleccionado: h.planSeleccionado,
      loading: h.loading,
      error: h.error,
      cargarPlanes: h.cargarPlanes
    })
  }
})

import { usePlanesPublicos } from '@/composables/academico/usePlanesPublicos.js'

const PLAN = {
  plan: '663',
  nombre: 'Plan 663',
  materias: {
    '663-1.1': { nombre: 'Audioperceptiva', nombre_c: 'Audio', cursada: '1C' },
    '663-0.2': { nombre: 'Instrumento', cursada: 'anual' },
    '663-1.10': { nombre: 'Armonía', cursada: 'anual' }
  }
}

const CATALOGO = {
  '663': { codigo: '663', nombre: '663 Profesorado de Música', disponible: true }
}

beforeEach(() => {
  h.route = { query: {} }
  h.replace = vi.fn(() => Promise.resolve())
  h.push = vi.fn(() => Promise.resolve())
  h.back = vi.fn()
  h.user.value = null
  h.catalogo.value = { ...CATALOGO }
  h.planes.value = []
  h.planSeleccionado.value = null
  h.error.value = null
  h.cargarCatalogoPlanes.mockResolvedValue({ exito: true, datos: CATALOGO, error: null })
  h.cargarPlanes.mockImplementation(async () => {
    h.planes.value = [PLAN]
  })
  if (typeof window !== 'undefined') window.history.replaceState(null, '')
})

describe('usePlanesPublicos.js', () => {
  it('inicializar carga el catálogo, abre el primer plan y selecciona la primera materia', async () => {
    const vista = usePlanesPublicos()
    await vista.inicializar()

    expect(vista.planesDisponibles.value.map((p) => p.codigo)).toEqual(['663'])
    expect(vista.planCodigo.value).toBe('663')
    expect(vista.materiasCount.value).toBe(3)
    // Orden por año y código: primero el año 0.
    expect(vista.codigoSeleccionado.value).toBe('663-0.2')
    expect(h.replace).toHaveBeenCalled()
  })

  it('restaura ?materia cuando existe en el plan', async () => {
    h.route = { query: { plan: '663', materia: '663-1.10' } }
    const vista = usePlanesPublicos()
    await vista.inicializar()

    expect(vista.codigoSeleccionado.value).toBe('663-1.10')
    expect(vista.vistaMobile.value).toBe('detalle')
    expect(vista.materiaSeleccionada.value.codigo).toBe('663-1.10')
  })

  it('cae al listado de respaldo si el catálogo no se puede leer', async () => {
    h.catalogo.value = {}
    h.cargarCatalogoPlanes.mockResolvedValue({ exito: false, datos: {}, error: new Error('sin red') })
    const vista = usePlanesPublicos()
    await vista.inicializar()

    expect(vista.planesDisponibles.value.length).toBeGreaterThan(0)
    expect(vista.planesDisponibles.value.some((p) => p.codigo === '662')).toBe(true)
  })

  it('seleccionarMateria acepta códigos del plan e ignora los inexistentes', async () => {
    const vista = usePlanesPublicos()
    await vista.abrirPlan('663')

    expect(vista.seleccionarMateria('663-1.1')).toBe(true)
    expect(vista.codigoSeleccionado.value).toBe('663-1.1')
    expect(vista.vistaMobile.value).toBe('detalle')

    expect(vista.seleccionarMateria('999-9.9')).toBe(false)
    expect(vista.codigoSeleccionado.value).toBe('663-1.1')
  })

  it('deriva año, cantidad de años y pregrado', async () => {
    const vista = usePlanesPublicos()
    await vista.abrirPlan('663')

    expect(vista.aniosCount.value).toBe(2)
    expect(vista.hayPregrado.value).toBe(true)
  })

  it('esAutenticado refleja la sesión', () => {
    h.user.value = { uid: 'uid-1' }
    expect(usePlanesPublicos().esAutenticado.value).toBe(true)
  })

  it('volver regresa al estado anterior si hay historial', () => {
    window.history.pushState({ back: '/estudiante' }, '')
    const vista = usePlanesPublicos()
    vista.volver()

    expect(h.back).toHaveBeenCalledTimes(1)
    expect(h.push).not.toHaveBeenCalled()
  })

  it('volver va a la raíz cuando se entró directo', () => {
    const vista = usePlanesPublicos()
    vista.volver()

    expect(h.push).toHaveBeenCalledWith('/')
    expect(h.back).not.toHaveBeenCalled()
  })
})
