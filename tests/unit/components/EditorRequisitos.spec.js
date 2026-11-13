/**
 * Tests unitarios para EditorRequisitos.vue
 */
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import EditorRequisitos from '@/components/ui/EditorRequisitos.vue'

const materias = [
  { codigo: '663-0.1', nombre: 'Audioperceptiva', anio: 0 },
  { codigo: '663-0.2', nombre: 'Instrumento', anio: 0 },
  { codigo: '663-1.1', nombre: 'Armonía', anio: 1 }
]

const requisitos = [
  {
    id: 'R-0-01',
    anio: 0,
    tipo: 'obligatorio',
    minimo: 1,
    candidatos: ['663-0.1'],
    etiqueta: 'Audio'
  },
  {
    id: 'R-0-OPT',
    anio: 0,
    tipo: 'optativo',
    minimo: 1,
    candidatos: ['663-0.2'],
    etiqueta: ''
  }
]

/**
 * Monta el componente con datos de prueba.
 * @param {Object} [props]
 */
function montar(props = {}) {
  return mount(EditorRequisitos, {
    props: {
      requisitos,
      materias,
      anios: [0, 1],
      materiasSinRequisito: [{ codigo: '663-1.1', nombre: 'Armonía', anio: 1 }],
      planDefinido: true,
      ...props
    }
  })
}

describe('EditorRequisitos.vue', () => {
  it('renderiza una tarjeta por requisito con su etiqueta y tipo', () => {
    const wrapper = montar()

    expect(wrapper.findAll('article')).toHaveLength(2)
    const primeraTarjeta = wrapper.findAll('article')[0]
    expect(primeraTarjeta.find('[aria-label="Id del requisito"]').element.value).toBe('R-0-01')
    expect(primeraTarjeta.find('[aria-label="Etiqueta del requisito"]').element.value).toBe('Audio')
    expect(wrapper.text()).toContain('Obligatorio')
    expect(wrapper.text()).toContain('Optativo')
  })

  it('muestra solo las materias del año del requisito', () => {
    const wrapper = montar()

    // El primer requisito es del año 0: no debe ofrecer materias del año 1.
    const primeraTarjeta = wrapper.findAll('article')[0]
    expect(primeraTarjeta.text()).toContain('663-0.1')
    expect(primeraTarjeta.text()).not.toContain('663-1.1')
  })

  it('deshabilita candidatos que ya pertenecen a otro requisito', () => {
    const wrapper = montar({
      requisitos: [
        { ...requisitos[0], candidatos: ['663-0.1', '663-0.2'] },
        { ...requisitos[1], candidatos: [] }
      ]
    })

    const segundaTarjeta = wrapper.findAll('article')[1]
    const checkbox = segundaTarjeta.findAll('input[type="checkbox"]')[0]
    expect(checkbox.element.disabled).toBe(true)
    expect(segundaTarjeta.text()).toContain('en otro requisito')
  })

  it('emite agregar con el año elegido', async () => {
    const wrapper = montar()

    await wrapper.find('#nuevo-requisito-anio').setValue('1')
    await wrapper.find('button[title="Agregar un requisito"]').trigger('click')

    expect(wrapper.emitted('agregar')).toBeTruthy()
    expect(wrapper.emitted('agregar')[0]).toEqual([1])
  })

  it('emite actualizar al cambiar el tipo y alternar un candidato', async () => {
    const wrapper = montar()

    const primeraTarjeta = wrapper.findAll('article')[0]
    await primeraTarjeta.find('[aria-label="Tipo de requisito"]').setValue('optativo')
    expect(wrapper.emitted('actualizar')[0]).toEqual([0, 'tipo', 'optativo'])

    const candidato = primeraTarjeta.findAll('input[type="checkbox"]')[0]
    await candidato.trigger('change')
    expect(wrapper.emitted('alternar-candidato')[0]).toEqual([0, '663-0.1'])
  })

  it('emite eliminar con el índice del requisito', async () => {
    const wrapper = montar()

    await wrapper.findAll('article')[1].find('button[title="Eliminar requisito"]').trigger('click')
    expect(wrapper.emitted('eliminar')[0]).toEqual([1])
  })

  it('lista las materias que quedaron sin requisito', () => {
    const wrapper = montar()
    expect(wrapper.text()).toContain('1 materia(s) sin requisito')
    expect(wrapper.text()).toContain('663-1.1')
  })

  it('oculta la acción de agregar cuando no hay plan definido', () => {
    const wrapper = montar({ planDefinido: false, materias: [] })

    const boton = wrapper.find('button[title="Agregar un requisito"]')
    expect(boton.element.disabled).toBe(true)
    expect(wrapper.text()).toContain('Definí el código del plan')
  })
})
