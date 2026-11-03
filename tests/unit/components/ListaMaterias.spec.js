/**
 * Tests unitarios para ListaMaterias.vue
 */
import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import ListaMaterias from '@/components/ui/ListaMaterias.vue'

const materias = [
  { codigo: '663-0.2', nombre: 'Instrumento', nombre_c: 'Instrumento', cursada: null, anio: 0 },
  { codigo: '663-1.1', nombre: 'Audioperceptiva', nombre_c: '', cursada: '1C', anio: 1 },
  { codigo: '663-1.10', nombre: 'Armonía', nombre_c: 'Armonía', cursada: 'anual', anio: 1 },
  { codigo: '663-0.1', nombre: '', nombre_c: '', cursada: '2C', anio: 0 }
]

afterEach(() => {
  document.body.innerHTML = ''
})

describe('ListaMaterias.vue', () => {
  it('agrupa por año y ordena las materias por código', () => {
    const wrapper = mount(ListaMaterias, { props: { materias } })

    const secciones = wrapper.findAll('section')
    expect(secciones).toHaveLength(2)
    expect(secciones[0].text()).toContain('Año 0 (Pregrado)')
    expect(secciones[0].text()).toContain('(2)')
    expect(secciones[1].text()).toContain('Año 1')

    const codigosAnio0 = secciones[0]
      .findAll('[data-codigo]')
      .map((fila) => fila.attributes('data-codigo'))
    expect(codigosAnio0).toEqual(['663-0.1', '663-0.2'])

    const codigosAnio1 = secciones[1]
      .findAll('[data-codigo]')
      .map((fila) => fila.attributes('data-codigo'))
    expect(codigosAnio1).toEqual(['663-1.1', '663-1.10'])
  })

  it('filtra por código y por nombre sin distinguir acentos', async () => {
    const wrapper = mount(ListaMaterias, { props: { materias } })
    const buscador = wrapper.find('input')

    await buscador.setValue('0.2')
    expect(wrapper.findAll('[data-codigo]')).toHaveLength(1)
    expect(wrapper.find('[data-codigo="663-0.2"]').exists()).toBe(true)

    await buscador.setValue('armonia')
    expect(wrapper.findAll('[data-codigo]')).toHaveLength(1)
    expect(wrapper.find('[data-codigo="663-1.10"]').exists()).toBe(true)

    await buscador.setValue('inexistente')
    expect(wrapper.findAll('[data-codigo]')).toHaveLength(0)
    expect(wrapper.text()).toContain('Ninguna materia coincide')
  })

  it('emite seleccionar al hacer clic en una fila', async () => {
    const wrapper = mount(ListaMaterias, { props: { materias } })

    await wrapper.find('[data-codigo="663-1.1"]').trigger('click')

    expect(wrapper.emitted('seleccionar')).toBeTruthy()
    expect(wrapper.emitted('seleccionar')[0]).toEqual(['663-1.1'])
  })

  it('marca la materia seleccionada', () => {
    const wrapper = mount(ListaMaterias, {
      props: { materias, seleccionado: '663-1.10' }
    })

    const fila = wrapper.find('[data-codigo="663-1.10"]')
    expect(fila.attributes('aria-current')).toBe('true')
    expect(fila.classes().join(' ')).toContain('bg-primary')
  })

  it('señala materias con datos incompletos', () => {
    const wrapper = mount(ListaMaterias, { props: { materias } })

    const fila = wrapper.find('[data-codigo="663-0.1"]')
    expect(fila.text()).toContain('⚠')
    expect(fila.attributes('aria-label')).toContain('datos incompletos')

    const completa = wrapper.find('[data-codigo="663-1.1"]')
    expect(completa.text()).not.toContain('⚠')
  })

  it('muestra el contador de comentarios por materia', () => {
    const wrapper = mount(ListaMaterias, {
      props: {
        materias,
        comentarios: [
          { materiaId: '663-1.1' },
          { materiaId: '663-1.1' },
          { materiaId: null }
        ]
      }
    })

    expect(wrapper.find('[data-codigo="663-1.1"]').text()).toContain('💬2')
    expect(wrapper.find('[data-codigo="663-0.2"]').text()).not.toContain('💬')
  })

  it('oculta los avisos de edición con mostrarAvisos en false', () => {
    const wrapper = mount(ListaMaterias, {
      props: {
        materias,
        mostrarAvisos: false,
        comentarios: [{ materiaId: '663-1.1' }]
      }
    })

    const incompleta = wrapper.find('[data-codigo="663-0.1"]')
    expect(incompleta.text()).not.toContain('⚠')
    expect(incompleta.attributes('aria-label')).not.toContain('datos incompletos')
    expect(wrapper.find('[data-codigo="663-1.1"]').text()).not.toContain('💬')
  })

  it('colapsa los grupos y los abre al buscar', async () => {
    const wrapper = mount(ListaMaterias, { props: { materias } })

    const cabeceraAnio1 = wrapper.findAll('section')[1].find('button')
    await cabeceraAnio1.trigger('click')

    expect(cabeceraAnio1.attributes('aria-expanded')).toBe('false')
    expect(wrapper.findAll('section')[1].find('ul').isVisible()).toBe(false)

    await wrapper.find('input').setValue('armonia')
    // jsdom cachea el `display` calculado del `<ul>`; verificamos el atributo
    // (v-show) en lugar de `isVisible()` después de haberlo consultado cerrado.
    const cabeceraFiltrada = wrapper.findAll('section')[0].find('button')
    expect(cabeceraFiltrada.attributes('aria-expanded')).toBe('true')
    expect(wrapper.find('[data-codigo="663-1.10"]').exists()).toBe(true)
    expect(wrapper.find('ul').attributes('style') || '').not.toContain('display: none')
  })

  it('abre el año de la materia seleccionada si estaba colapsado', async () => {
    const wrapper = mount(ListaMaterias, { props: { materias } })

    const cabeceraAnio1 = wrapper.findAll('section')[1].find('button')
    await cabeceraAnio1.trigger('click')
    expect(cabeceraAnio1.attributes('aria-expanded')).toBe('false')

    await wrapper.setProps({ seleccionado: '663-1.1' })
    await nextTick()

    expect(wrapper.findAll('section')[1].find('button').attributes('aria-expanded')).toBe('true')
  })

  it('enfoca el buscador con "/" y navega filas con las flechas', async () => {
    const wrapper = mount(ListaMaterias, {
      props: { materias },
      attachTo: document.body
    })

    await wrapper.find('[data-codigo="663-1.1"]').trigger('keydown', { key: '/' })
    expect(document.activeElement).toBe(wrapper.find('input').element)

    await wrapper.find('[data-codigo="663-1.1"]').trigger('keydown', { key: 'ArrowDown' })
    await nextTick()
    await nextTick()
    expect(document.activeElement?.dataset?.codigo).toBe('663-1.10')

    await wrapper.find('[data-codigo="663-1.10"]').trigger('keydown', { key: 'ArrowUp' })
    await nextTick()
    await nextTick()
    expect(document.activeElement?.dataset?.codigo).toBe('663-1.1')

    wrapper.unmount()
  })
})
