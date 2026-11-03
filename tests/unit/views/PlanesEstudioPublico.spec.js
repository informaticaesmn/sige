/**
 * Test de integración de PlanesEstudioPublico.vue con `usePlanesPublicos` real.
 *
 * Cubre el wiring vista ↔ composable (nombres expuestos, `v-if` del plan) y el
 * botón "volver" según haya sesión o no. Los composables de datos se mockean.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const h = vi.hoisted(() => ({
  route: { query: {} },
  replace: null,
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
  useRouter: () => ({ replace: h.replace, push: vi.fn(), back: vi.fn() })
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

import PlanesEstudioPublico from '@/views/auth/PlanesEstudioPublico.vue'

const PLAN = {
  plan: '663',
  nombre: 'Plan 663',
  materias: {
    '663-1.1': { nombre: 'Audioperceptiva', nombre_c: 'Audio', cursada: '1C' },
    '663-0.2': { nombre: 'Instrumento', cursada: 'anual' }
  }
}

const CATALOGO = {
  '663': { codigo: '663', nombre: '663 Profesorado de Música', disponible: true },
  '708': { codigo: '708', nombre: '708 Técnico Superior en Sonido', disponible: true }
}

beforeEach(() => {
  h.route = { query: {} }
  h.replace = vi.fn(() => Promise.resolve())
  h.user.value = null
  h.catalogo.value = { ...CATALOGO }
  h.planes.value = []
  h.planSeleccionado.value = null
  h.error.value = null
  h.cargarCatalogoPlanes.mockResolvedValue({ exito: true, datos: CATALOGO, error: null })
  h.cargarPlanes.mockImplementation(async () => {
    h.planes.value = [PLAN]
  })
})

describe('PlanesEstudioPublico.vue', () => {
  it('renderiza el resumen y la lista del plan cargado', async () => {
    const wrapper = mount(PlanesEstudioPublico)
    await flushPromises()

    const texto = wrapper.text()
    expect(texto).toContain('663 Profesorado de Música')
    expect(texto).toContain('2 materias')
    // En la lista se muestra el nombre corto; en el detalle, el completo.
    expect(texto).toContain('Audio')
    expect(texto).toContain('Instrumento')
    // El selector ofrece el catálogo.
    expect(wrapper.findAll('option').map((o) => o.text())).toEqual([
      '663 Profesorado de Música',
      '708 Técnico Superior en Sonido'
    ])
  })

  it('muestra "Volver al inicio" cuando no hay sesión', async () => {
    const wrapper = mount(PlanesEstudioPublico)
    await flushPromises()

    const boton = wrapper.findAll('button').find((b) => b.text().includes('Volver'))
    expect(boton.text()).toBe('Volver al inicio')
  })

  it('muestra "Volver a la app" cuando hay sesión', async () => {
    h.user.value = { uid: 'u1', roles: ['estudiante'] }

    const wrapper = mount(PlanesEstudioPublico)
    await flushPromises()

    const boton = wrapper.findAll('button').find((b) => b.text().includes('Volver'))
    expect(boton.text()).toBe('Volver a la app')
  })
})
