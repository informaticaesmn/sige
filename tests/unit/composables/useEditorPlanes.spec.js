/**
 * Tests unitarios para useEditorPlanes.js
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { useEditorPlanes } from '@/composables/academico/useEditorPlanes.js'

const planJsonEjemplo = {
  plan: '663',
  nombre: 'Plan 663 Profesorado de Música',
  disponible: true,
  materias: {
    '663-0.1': {
      id: '663-0.1',
      anio: 0,
      nombre: 'Audioperceptiva I',
      nombre_c: 'Audio I',
      cursada: 'anual',
      correlativas: {
        cursar: { and: ['663-0.2', { or: ['663-0.3.1', '663-0.3.2'] }] },
        aprobar: '663-0.1'
      },
      equivale_a: ['662-0.1']
    },
    '663-0.2': {
      id: '663-0.2',
      anio: 0,
      nombre: 'Instrumento',
      cursada: 'anual',
      correlativas: { cursar: null, aprobar: null }
    }
  }
}

describe('useEditorPlanes.js', () => {
  let editor

  beforeEach(() => {
    editor = useEditorPlanes()
  })

  it('importarJSONPlan acepta string JSON y extrae metadatos y materias', async () => {
    const res = await editor.importarJSONPlan(JSON.stringify(planJsonEjemplo))

    expect(res.exito).toBe(true)
    expect(res.materiasCount).toBe(2)
    expect(editor.planCodigo.value).toBe('663')
    expect(editor.planNombre.value).toBe('663 Profesorado de Música')
    expect(editor.disponible.value).toBe(true)
    expect(editor.hayPregrado.value).toBe(true)

    const mat = editor.materias.value['663-0.1']
    expect(mat.nombre).toBe('Audioperceptiva I')
    expect(mat.correlativas.cursar.tipo).toBe('and')
    expect(mat.correlativas.aprobar.tipo).toBe('materia')
  })

  it('importarJSONPlan soporta un objeto parseado', async () => {
    const res = await editor.importarJSONPlan(planJsonEjemplo)

    expect(res.exito).toBe(true)
    expect(res.materiasCount).toBe(2)
  })

  it('agregarMateria crea una materia en el año especificado', () => {
    editor.planCodigo.value = '663'
    editor.agregarMateria(0)

    const codigos = Object.keys(editor.materias.value)
    expect(codigos).toHaveLength(1)
    expect(codigos[0]).toBe('663-0.1')
    expect(editor.materias.value['663-0.1'].anio).toBe(0)
  })

  it('eliminarMateria borra la materia del mapa', async () => {
    await editor.importarJSONPlan(planJsonEjemplo)
    editor.eliminarMateria('663-0.1')

    expect(Object.keys(editor.materias.value)).toEqual(['663-0.2'])
  })

  it('actualizarCondicion modifica el árbol de la correlativa', async () => {
    await editor.importarJSONPlan(planJsonEjemplo)
    const nuevaCond = { tipo: 'anio', anio: 0 }
    editor.actualizarCondicion('663-0.2', 'cursar', nuevaCond)

    expect(editor.materias.value['663-0.2'].correlativas.cursar).toEqual(nuevaCond)
  })

  it('generarJSONDetalle serializa de vuelta las condiciones', async () => {
    await editor.importarJSONPlan(planJsonEjemplo)
    const detalle = editor.generarJSONDetalle()

    expect(detalle.plan).toBe('663')
    expect(detalle.materias['663-0.1'].correlativas.cursar).toEqual({
      and: ['663-0.2', { or: ['663-0.3.1', '663-0.3.2'] }]
    })
    expect(detalle.materias['663-0.1'].correlativas.aprobar).toBe('663-0.1')
  })

  it('generarJSONCatalogo hace merge con un catálogo existente', async () => {
    await editor.importarJSONPlan(planJsonEjemplo)
    const catalogoExistente = [
      { codigo: '708', nombre: '708 Sonido', disponible: true }
    ]

    const res = await editor.generarJSONCatalogo(catalogoExistente)

    expect(res.planes).toHaveLength(2)
    expect(res.planes).toContainEqual({ codigo: '708', nombre: '708 Sonido', disponible: true })
    expect(res.planes).toContainEqual({ codigo: '663', nombre: '663 Profesorado de Música', disponible: true })
  })

  it('generarJSONCatalogo lee planes.json si no recibe catálogo', async () => {
    await editor.importarJSONPlan(planJsonEjemplo)
    const fetchImpl = async () => ({
      ok: true,
      json: async () => ({
        planes: [{ codigo: '708', nombre: '708 Sonido', disponible: false }]
      })
    })

    const res = await editor.generarJSONCatalogo(null, { fetchImpl })

    expect(res.planes).toContainEqual({ codigo: '708', nombre: '708 Sonido', disponible: false })
    expect(res.planes).toContainEqual({ codigo: '663', nombre: '663 Profesorado de Música', disponible: true })
  })

  it('validar detecta errores y advertencias del editor', async () => {
    await editor.importarJSONPlan({
      plan: '663',
      materias: {
        'sin-anio': { nombre: 'Materia rara', equivale_a: ['662-0.1'] }
      }
    })
    // El importador completa el nombre con el código; lo vaciamos a mano para
    // simular que el coordinador borró el campo.
    editor.actualizarMateria('sin-anio', 'nombre', '')

    const res = await editor.validar()

    expect(res.exito).toBe(false)
    expect(editor.errores.value.some((e) => e.includes('año reconocible'))).toBe(true)
    expect(editor.errores.value.some((e) => e.includes('no tiene nombre'))).toBe(true)
    expect(editor.advertencias.value.some((a) => a.includes('plan madre'))).toBe(true)
  })

  it('generarJSONDetalle solo audita revisión cuando el plan está disponible', async () => {
    await editor.importarJSONPlan(planJsonEjemplo)

    const detalle = editor.generarJSONDetalle({ revisadoPor: 'uid-coordinador' })
    expect(detalle.revisadoPor).toBe('uid-coordinador')
    expect(typeof detalle.revisadoEn).toBe('string')

    editor.disponible.value = false
    const borrador = editor.generarJSONDetalle({ revisadoPor: 'uid-coordinador' })
    expect(borrador.revisadoPor).toBeNull()
    expect(borrador.revisadoEn).toBeNull()
  })
})
