/**
 * Tests unitarios para EditorCondicion.vue
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import EditorCondicion from '@/components/ui/EditorCondicion.vue'

describe('EditorCondicion.vue', () => {
  const materiasDisponibles = [
    { codigo: '663-0.1', nombre: 'Audioperceptiva' },
    { codigo: '663-0.2', nombre: 'Instrumento' }
  ]

  it('muestra botones de inicialización si modelValue es null', () => {
    const wrapper = mount(EditorCondicion, {
      props: {
        modelValue: null,
        materiasDisponibles
      }
    })

    expect(wrapper.text()).toContain('Sin condición')
    expect(wrapper.text()).toContain('+ Materia')
    expect(wrapper.text()).toContain('+ Grupo Y (AND)')
  })

  it('emite un nodo materia cuando se hace clic en + Materia', async () => {
    const wrapper = mount(EditorCondicion, {
      props: {
        modelValue: null,
        materiasDisponibles
      }
    })

    const botones = wrapper.findAll('button')
    const botonMateria = botones.find((b) => b.text().includes('+ Materia'))
    await botonMateria.trigger('click')

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')[0][0]).toEqual({
      tipo: 'materia',
      codigo: ''
    })
  })

  it('renderiza un nodo materia correctamente', () => {
    const wrapper = mount(EditorCondicion, {
      props: {
        modelValue: { tipo: 'materia', codigo: '663-0.1' },
        materiasDisponibles
      }
    })

    const select = wrapper.find('select')
    expect(select.element.value).toBe('663-0.1')
  })

  it('renderiza un nodo grupo AND con sus hijos', () => {
    const wrapper = mount(EditorCondicion, {
      props: {
        modelValue: {
          tipo: 'and',
          hijos: [
            { tipo: 'materia', codigo: '663-0.1' }
          ]
        },
        materiasDisponibles
      }
    })

    expect(wrapper.text()).toContain('Y (Todas las condiciones)')
    expect(wrapper.findComponent(EditorCondicion).exists()).toBe(true)
  })
})
