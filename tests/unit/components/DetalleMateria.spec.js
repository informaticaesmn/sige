/**
 * Tests unitarios para DetalleMateria.vue
 *
 * Cubre el render de solo lectura y el modo `embebido` (panel fijo, sin
 * comportamiento de modal) que usa la vista pública de planes.
 */
import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import DetalleMateria from '@/components/estudiante/DetalleMateria.vue'

const plan = {
  nombre: 'Plan 662',
  materias: {
    '662-0.1': { nombre: 'Audioperceptiva', nombre_c: 'Audio Pre', cursada: 'anual' },
    '662-0.2': { nombre: 'Educación Vocal', nombre_c: 'E. Vocal', cursada: 'anual' },
    '662-0.3': { nombre: 'Flauta dulce', nombre_c: 'Flauta', cursada: 'anual' }
  }
}

const materia = {
  codigo: '662-1.1',
  nombre: 'Instrumento',
  nombre_c: 'Instrumento',
  cursada: 'anual',
  correlativas: {
    cursar: '662-0.1',
    aprobar: { and: ['662-0.2', '662-0.3'] }
  }
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('DetalleMateria.vue', () => {
  it('renderiza los datos y las correlativas de la materia', () => {
    const wrapper = mount(DetalleMateria, { props: { materia, plan } })

    expect(wrapper.text()).toContain('Instrumento')
    expect(wrapper.text()).toContain('662-0.1 - Audio Pre')
    expect(wrapper.text()).toContain('662-0.2 - E. Vocal')
    expect(wrapper.text()).toContain('662-0.3 - Flauta')
    expect(wrapper.text()).toContain('Todas las siguientes materias:')
  })

  it('en modo embebido oculta el cierre y no responde a Escape', async () => {
    const wrapper = mount(DetalleMateria, {
      props: { materia, plan, embebido: true },
      attachTo: document.body
    })

    expect(wrapper.find('[aria-label="Cerrar detalles de materia"]').exists()).toBe(false)
    expect(wrapper.attributes('tabindex')).toBeUndefined()

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()

    expect(wrapper.emitted('cerrar')).toBeFalsy()
    wrapper.unmount()
  })

  it('hace navegables las correlativas cuando correlativasNavegables es true', async () => {
    const wrapper = mount(DetalleMateria, {
      props: { materia, plan, correlativasNavegables: true }
    })

    const boton = wrapper.find('[aria-label="Ir a la materia 662-0.1 - Audio Pre"]')
    expect(boton.exists()).toBe(true)

    await boton.trigger('click')

    expect(wrapper.emitted('seleccionar-materia')).toEqual([['662-0.1']])
  })

  it('no ofrece navegación por correlativas por defecto', () => {
    const wrapper = mount(DetalleMateria, { props: { materia, plan } })

    expect(wrapper.find('[aria-label^="Ir a la materia"]').exists()).toBe(false)
  })

  it('en modo modal muestra el cierre y responde a Escape', async () => {
    const wrapper = mount(DetalleMateria, {
      props: { materia, plan },
      attachTo: document.body
    })

    expect(wrapper.find('[aria-label="Cerrar detalles de materia"]').exists()).toBe(true)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()

    expect(wrapper.emitted('cerrar')).toBeTruthy()
    wrapper.unmount()
  })
})
