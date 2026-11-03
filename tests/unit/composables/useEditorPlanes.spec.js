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
    expect(codigos[0]).toBe('663-0.01')
    expect(editor.materias.value['663-0.01'].anio).toBe(0)
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

    const res = editor.generarJSONCatalogo(catalogoExistente)

    expect(res.planes).toHaveLength(2)
    expect(res.planes).toContainEqual({ codigo: '708', nombre: '708 Sonido', disponible: true })
    expect(res.planes).toContainEqual({ codigo: '663', nombre: '663 Profesorado de Música', disponible: true })
  })
})
