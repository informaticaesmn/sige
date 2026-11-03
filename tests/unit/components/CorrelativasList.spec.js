/**
 * Tests unitarios para CorrelativasList.vue
 *
 * Cubre el modo texto (por defecto) y el modo seleccionable, en el que las
 * materias se vuelven botones que emiten `seleccionar` con su código.
 */
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import CorrelativasList from '@/components/estudiante/CorrelativasList.vue'

const items = [
  { tipo: 'materia', codigo: '662-0.1', nombre: '662-0.1 - Audio' },
  { tipo: 'anio_completo', texto: 'Todas las materias del año 1' },
  {
    tipo: 'grupo',
    operador: 'Y',
    texto: 'Todas las siguientes materias:',
    items: [{ tipo: 'materia', codigo: '662-0.2', nombre: '662-0.2 - Instrumento' }]
  }
]

describe('CorrelativasList.vue', () => {
  it('renderiza texto plano sin botones por defecto', () => {
    const wrapper = mount(CorrelativasList, { props: { items } })

    expect(wrapper.findAll('button')).toHaveLength(0)
    expect(wrapper.text()).toContain('662-0.1 - Audio')
    expect(wrapper.text()).toContain('Todas las materias del año 1')
  })

  it('emite seleccionar con el código al hacer clic cuando es seleccionable', async () => {
    const wrapper = mount(CorrelativasList, { props: { items, seleccionable: true } })
    const botones = wrapper.findAll('button')

    expect(botones).toHaveLength(2)

    await botones[0].trigger('click')
    await botones[1].trigger('click')

    expect(wrapper.emitted('seleccionar')).toEqual([['662-0.1'], ['662-0.2']])
  })

  it('no convierte en botón los nodos sin código', () => {
    const wrapper = mount(CorrelativasList, {
      props: { items: [{ tipo: 'anio_completo', texto: 'Año 1 completo' }], seleccionable: true }
    })

    expect(wrapper.findAll('button')).toHaveLength(0)
    expect(wrapper.text()).toContain('Año 1 completo')
  })
})
