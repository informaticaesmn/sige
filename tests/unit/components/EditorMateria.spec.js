/**
 * Tests unitarios para EditorMateria.vue
 */
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import EditorMateria from '@/components/ui/EditorMateria.vue'
import EditorCondicion from '@/components/ui/EditorCondicion.vue'

const materia = {
  codigo: '663-0.1',
  nombre: 'Audioperceptiva',
  nombre_c: 'Audio',
  cursada: '1C',
  correlativas: {
    cursar: { tipo: 'materia', codigo: '662-0.1' },
    aprobar: {
      tipo: 'and',
      hijos: [
        { tipo: 'materia', codigo: '662-0.2' },
        { tipo: 'materia', codigo: '662-0.3' }
      ]
    }
  },
  equivale_a: ['662-0.1', '662-0.2']
}

const materiasDisponibles = [
  { codigo: '662-0.1', nombre: 'Álgebra' },
  { codigo: '662-0.2', nombre: 'Análisis' },
  { codigo: '662-0.3', nombre: 'Física' }
]

/**
 * Monta el componente con la materia de prueba.
 * @param {Object} [props]
 */
function montar(props = {}) {
  return mount(EditorMateria, {
    props: {
      materia,
      materiasDisponibles,
      ...props
    }
  })
}

describe('EditorMateria.vue', () => {
  it('renderiza código, campos y equivalencias', () => {
    const wrapper = montar()

    expect(wrapper.text()).toContain('663-0.1')
    expect(wrapper.find('[aria-label="Nombre completo"]').element.value).toBe('Audioperceptiva')
    expect(wrapper.find('[aria-label="Nombre corto"]').element.value).toBe('Audio')
    expect(wrapper.find('[aria-label="Cursada"]').element.value).toBe('1C')
    expect(wrapper.find('[aria-label="Equivalencias"]').element.value).toBe('662-0.1, 662-0.2')
  })

  it('muestra el resumen textual de ambas correlativas', () => {
    const wrapper = montar()

    expect(wrapper.find('[data-resumen="cursar"]').text()).toBe('Álgebra')
    expect(wrapper.find('[data-resumen="aprobar"]').text()).toBe('Análisis y Física')
  })

  it('muestra "Sin correlativas" cuando la condición es nula', () => {
    const wrapper = montar({
      materia: { ...materia, correlativas: { cursar: null, aprobar: null } }
    })

    expect(wrapper.find('[data-resumen="cursar"]').text()).toBe('Sin correlativas')
    expect(wrapper.find('[data-resumen="aprobar"]').text()).toBe('Sin correlativas')
  })

  it('renderiza un EditorCondicion por cada correlativa', () => {
    const wrapper = montar()

    const editores = wrapper.findAllComponents(EditorCondicion)
    // Los grupos AND/OR renderizan EditorCondicion anidados; los dos primeros
    // en orden de árbol son los editores raíz de cursar y aprobar.
    expect(editores.length).toBeGreaterThanOrEqual(2)
    expect(editores[0].props('modelValue')).toEqual(materia.correlativas.cursar)
    expect(editores[1].props('modelValue')).toEqual(materia.correlativas.aprobar)
    expect(editores[0].props('materiasDisponibles')).toEqual(materiasDisponibles)
  })

  it('emite actualizar-campo al editar los nombres', async () => {
    const wrapper = montar()

    await wrapper.find('[aria-label="Nombre completo"]').setValue('Nuevo nombre')
    await wrapper.find('[aria-label="Nombre corto"]').setValue('Corto')

    expect(wrapper.emitted('actualizar-campo')).toEqual([
      ['nombre', 'Nuevo nombre'],
      ['nombre_c', 'Corto']
    ])
  })

  it('emite actualizar-campo al cambiar la cursada y normaliza vacío a null', async () => {
    const wrapper = montar()
    const select = wrapper.find('[aria-label="Cursada"]')

    await select.setValue('2C')
    await select.setValue('')

    expect(wrapper.emitted('actualizar-campo')).toEqual([
      ['cursada', '2C'],
      ['cursada', null]
    ])
  })

  it('emite actualizar-campo con el array de equivalencias', async () => {
    const wrapper = montar()
    const input = wrapper.find('[aria-label="Equivalencias"]')

    input.element.value = '662-9.9, 662-8.8, '
    await input.trigger('change')

    expect(wrapper.emitted('actualizar-campo')[0]).toEqual([
      'equivale_a',
      ['662-9.9', '662-8.8']
    ])
  })

  it('emite actualizar-condicion con el tipo y el árbol', async () => {
    const wrapper = montar()
    const condicion = { tipo: 'or', hijos: [{ tipo: 'materia', codigo: '662-0.3' }] }

    wrapper.findAllComponents(EditorCondicion)[1].vm.$emit('update:modelValue', condicion)

    expect(wrapper.emitted('actualizar-condicion')).toEqual([['aprobar', condicion]])
  })

  it('emite eliminar con el código de la materia', async () => {
    const wrapper = montar()
    const boton = wrapper.findAll('button').find((b) => b.text() === 'Eliminar')

    await boton.trigger('click')

    expect(wrapper.emitted('eliminar')).toEqual([['663-0.1']])
  })

  it('muestra solo los comentarios de la materia y reemite las acciones', async () => {
    const wrapper = montar({
      comentarios: [
        { id: 'c1', materiaId: '663-0.1', texto: 'Revisar audio', resuelto: false },
        { id: 'c2', materiaId: null, texto: 'Comentario general', resuelto: false }
      ]
    })

    expect(wrapper.text()).toContain('Comentarios de 663-0.1')
    expect(wrapper.text()).toContain('Revisar audio')
    expect(wrapper.text()).not.toContain('Comentario general')

    const resolver = wrapper.findAll('button').find((b) => b.text() === 'Resolver')
    await resolver.trigger('click')

    expect(wrapper.emitted('resolver-comentario')).toEqual([['c1']])
  })

  it('emite agregar-comentario con el materiaId del detalle', async () => {
    const wrapper = montar()

    await wrapper.find('textarea').setValue('Falta el nombre corto')
    const agregar = wrapper.findAll('button').find((b) => b.text() === 'Agregar comentario')
    await agregar.trigger('click')

    expect(wrapper.emitted('agregar-comentario')[0][0]).toEqual({
      texto: 'Falta el nombre corto',
      tipo: 'nota',
      materiaId: '663-0.1'
    })
  })
})
