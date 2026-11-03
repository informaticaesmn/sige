/**
 * Tests unitarios para useEditorPlanesVista.js
 *
 * Es orquestación: se apoya en mocks de los composables de datos/persistencia
 * y usa el `useEditorPlanes` real (es puro, sin Firebase).
 *
 * Se monta un componente mínimo porque el composable registra hooks de ciclo
 * de vida y una guarda de navegación.
 */
import { describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'

const h = vi.hoisted(() => ({
  route: { query: {} },
  replace: null,
  refreshLista: null,
  asegurarCatalogo: null,
  cargarBorrador: null,
  guardarBorrador: null,
  eliminarBorrador: null,
  marcarListo: null,
  volverARevision: null,
  listarComentarios: null,
  agregarComentario: null,
  resolverComentario: null,
  reabrirComentario: null,
  eliminarComentario: null
}))

vi.mock('vue-router', () => ({
  useRoute: () => h.route,
  useRouter: () => ({ replace: h.replace, push: vi.fn(), back: vi.fn() }),
  onBeforeRouteLeave: vi.fn()
}))

vi.mock('@/composables/auth/useAuth.js', async () => {
  const { ref } = await import('vue')
  const user = ref({ uid: 'u1', email: 'coord@test.com', roles: ['coordinacion'] })
  return { useAuth: () => ({ user }) }
})

vi.mock('@/composables/academico/useCatalogoPlanes.js', async () => {
  const { ref } = await import('vue')
  h.asegurarCatalogo = vi.fn(() => Promise.resolve({ exito: true, datos: {}, error: null }))
  return {
    useCatalogoPlanes: () => ({ catalogo: ref({}), asegurarCatalogo: h.asegurarCatalogo })
  }
})

vi.mock('@/composables/academico/useGestionPlanes.js', async () => {
  const { ref } = await import('vue')
  h.refreshLista = vi.fn(() => Promise.resolve({ exito: true, datos: [], error: null }))
  h.cargarBorrador = vi.fn()
  h.guardarBorrador = vi.fn()
  h.eliminarBorrador = vi.fn()
  h.marcarListo = vi.fn()
  h.volverARevision = vi.fn()
  return {
    useGestionPlanes: () => ({
      planesGuardados: ref([]),
      cargandoLista: ref(false),
      refrescarLista: h.refreshLista,
      cargarBorrador: h.cargarBorrador,
      guardarBorrador: h.guardarBorrador,
      eliminarBorrador: h.eliminarBorrador,
      marcarListoParaPublicar: h.marcarListo,
      volverARevision: h.volverARevision
    })
  }
})

vi.mock('@/composables/academico/useComentariosPlanes.js', () => {
  h.listarComentarios = vi.fn(() => Promise.resolve({ exito: true, datos: [], error: null }))
  h.agregarComentario = vi.fn()
  h.resolverComentario = vi.fn()
  h.reabrirComentario = vi.fn()
  h.eliminarComentario = vi.fn()
  return {
    useComentariosPlanes: () => ({
      listarComentarios: h.listarComentarios,
      agregarComentario: h.agregarComentario,
      resolverComentario: h.resolverComentario,
      reabrirComentario: h.reabrirComentario,
      eliminarComentario: h.eliminarComentario
    })
  }
})

import { useEditorPlanesVista } from '@/composables/academico/useEditorPlanesVista.js'

const PLAN_JSON = JSON.stringify({
  plan: '663',
  nombre: 'Plan 663',
  materias: {
    '663-0.1': { nombre: 'Audio', cursada: 'anual' },
    '663-0.2': { nombre: 'Instrumento', cursada: 'anual' }
  }
})

/**
 * Monta un componente mínimo y devuelve la API que expone el composable.
 */
async function montarVista() {
  let api
  const wrapper = mount(
    defineComponent({
      setup() {
        api = useEditorPlanesVista()
        return () => null
      }
    })
  )
  await flushPromises()
  return { wrapper, api }
}

describe('useEditorPlanesVista.js', () => {
  it('inicializar asegura el catálogo y refresca la lista de borradores', async () => {
    h.route = { query: {} }
    h.replace = vi.fn(() => Promise.resolve())
    const { wrapper } = await montarVista()

    expect(h.asegurarCatalogo).toHaveBeenCalledTimes(1)
    expect(h.refreshLista).toHaveBeenCalledTimes(1)

    wrapper.unmount()
  })

  it('abrirBorrador importa el JSON, selecciona la primera materia y marca el snapshot', async () => {
    h.route = { query: {} }
    h.replace = vi.fn(() => Promise.resolve())
    h.cargarBorrador.mockResolvedValue({
      exito: true,
      datos: { jsonTexto: PLAN_JSON, nombre: 'Plan 663', estadoRevision: 'en_edicion' }
    })

    const { wrapper, api } = await montarVista()
    await api.abrirBorrador('663')

    expect(api.planCodigo.value).toBe('663')
    expect(api.materiasCount.value).toBe(2)
    expect(api.codigoSeleccionado.value).toBe('663-0.1')
    expect(api.hayCambiosSinGuardar.value).toBe(false)

    // Al editar, deja de coincidir con el snapshot.
    api.onActualizarCampo('nombre', 'Audio I')
    expect(api.hayCambiosSinGuardar.value).toBe(true)

    wrapper.unmount()
  })

  it('onEliminarMateria selecciona la siguiente materia', async () => {
    h.route = { query: {} }
    h.replace = vi.fn(() => Promise.resolve())
    h.cargarBorrador.mockResolvedValue({
      exito: true,
      datos: { jsonTexto: PLAN_JSON, nombre: 'Plan 663', estadoRevision: 'en_edicion' }
    })

    const { wrapper, api } = await montarVista()
    await api.abrirBorrador('663')

    api.onEliminarMateria('663-0.1')

    expect(api.materiasCount.value).toBe(1)
    expect(api.codigoSeleccionado.value).toBe('663-0.2')

    wrapper.unmount()
  })

  it('onSeleccionarPlan pide confirmación si hay cambios sin guardar', async () => {
    h.route = { query: {} }
    h.replace = vi.fn(() => Promise.resolve())
    h.cargarBorrador.mockResolvedValue({
      exito: true,
      datos: { jsonTexto: PLAN_JSON, nombre: 'Plan 663', estadoRevision: 'en_edicion' }
    })

    const { wrapper, api } = await montarVista()
    await api.abrirBorrador('663')
    api.onActualizarCampo('nombre', 'Audio I')

    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    api.onSeleccionarPlan('708', { target: { value: '663' } })

    expect(confirm).toHaveBeenCalled()
    expect(h.cargarBorrador).toHaveBeenCalledTimes(1) // sólo la apertura inicial

    confirm.mockRestore()
    wrapper.unmount()
  })
})
