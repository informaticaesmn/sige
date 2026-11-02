import { describe, it, expect } from 'vitest'
import {
  codigosDeCondicion,
  condicionAJson,
  condicionDesdeJson,
  recorrerCondicion,
  validarCondicion
} from '@/utils/condiciones.js'

describe('condicionDesdeJson', () => {
  it('devuelve null para valores vacíos', () => {
    expect(condicionDesdeJson(null)).toBeNull()
    expect(condicionDesdeJson(undefined)).toBeNull()
    expect(condicionDesdeJson('')).toBeNull()
    expect(condicionDesdeJson('   ')).toBeNull()
  })

  it('convierte un string en una materia', () => {
    expect(condicionDesdeJson('662-0.1')).toEqual({ tipo: 'materia', codigo: '662-0.1' })
    expect(condicionDesdeJson('  662-0.1  ')).toEqual({ tipo: 'materia', codigo: '662-0.1' })
  })

  it('convierte un array legacy en un AND y colapsa un solo hijo', () => {
    expect(condicionDesdeJson(['662-0.1', '662-0.2'])).toEqual({
      tipo: 'and',
      hijos: [
        { tipo: 'materia', codigo: '662-0.1' },
        { tipo: 'materia', codigo: '662-0.2' }
      ]
    })
    expect(condicionDesdeJson(['662-0.1'])).toEqual({ tipo: 'materia', codigo: '662-0.1' })
  })

  it('convierte { and } y { or }', () => {
    expect(condicionDesdeJson({ and: ['a', 'b'] })).toEqual({
      tipo: 'and',
      hijos: [
        { tipo: 'materia', codigo: 'a' },
        { tipo: 'materia', codigo: 'b' }
      ]
    })
    expect(condicionDesdeJson({ or: ['a', 'b'] })).toEqual({
      tipo: 'or',
      hijos: [
        { tipo: 'materia', codigo: 'a' },
        { tipo: 'materia', codigo: 'b' }
      ]
    })
  })

  it('convierte { anio_completo } a un nodo anio', () => {
    expect(condicionDesdeJson({ anio_completo: 1 })).toEqual({ tipo: 'anio', anio: 1 })
    expect(condicionDesdeJson({ anio_completo: '0' })).toEqual({ tipo: 'anio', anio: 0 })
  })

  it('conserva grupos vacíos para poder validarlos', () => {
    expect(condicionDesdeJson({ and: [] })).toEqual({ tipo: 'and', hijos: [] })
  })

  it('normaliza un árbol anidado como el del Apps Script', () => {
    const json = {
      and: ['662-0.1', '662-0.2', { or: ['662-0.3.1', '662-0.3.2'] }, { anio_completo: 1 }]
    }
    expect(condicionDesdeJson(json)).toEqual({
      tipo: 'and',
      hijos: [
        { tipo: 'materia', codigo: '662-0.1' },
        { tipo: 'materia', codigo: '662-0.2' },
        {
          tipo: 'or',
          hijos: [
            { tipo: 'materia', codigo: '662-0.3.1' },
            { tipo: 'materia', codigo: '662-0.3.2' }
          ]
        },
        { tipo: 'anio', anio: 1 }
      ]
    })
  })

  it('acepta un nodo ya normalizado', () => {
    expect(condicionDesdeJson({ tipo: 'materia', codigo: '662-0.1' })).toEqual({
      tipo: 'materia',
      codigo: '662-0.1'
    })
  })

  it('devuelve null para objetos sin forma reconocible', () => {
    expect(condicionDesdeJson({ foo: 'bar' })).toBeNull()
    expect(condicionDesdeJson(42)).toBeNull()
  })
})

describe('condicionAJson', () => {
  it('serializa materia y anio', () => {
    expect(condicionAJson({ tipo: 'materia', codigo: '662-0.1' })).toBe('662-0.1')
    expect(condicionAJson({ tipo: 'anio', anio: 0 })).toEqual({ anio_completo: 0 })
  })

  it('colapsa grupos de un solo hijo y serializa los de más de uno', () => {
    expect(condicionAJson({ tipo: 'and', hijos: [{ tipo: 'materia', codigo: 'a' }] })).toBe('a')
    expect(
      condicionAJson({
        tipo: 'and',
        hijos: [
          { tipo: 'materia', codigo: 'a' },
          { tipo: 'materia', codigo: 'b' }
        ]
      })
    ).toEqual({ and: ['a', 'b'] })
  })

  it('devuelve null para grupos vacíos y para condiciones nulas', () => {
    expect(condicionAJson({ tipo: 'or', hijos: [] })).toBeNull()
    expect(condicionAJson(null)).toBeNull()
  })

  it('hace round-trip sin perder la estructura anidada', () => {
    const json = { and: ['662-0.1', { or: ['662-0.3.1', '662-0.3.2'] }] }
    expect(condicionAJson(condicionDesdeJson(json))).toEqual(json)
  })
})

describe('recorrerCondicion y codigosDeCondicion', () => {
  const arbol = {
    tipo: 'and',
    hijos: [
      { tipo: 'materia', codigo: '662-0.1' },
      { tipo: 'or', hijos: [{ tipo: 'materia', codigo: '662-0.2' }, { tipo: 'anio', anio: 1 }] }
    ]
  }

  it('recorre todos los nodos en profundidad', () => {
    const tipos = []
    recorrerCondicion(arbol, (nodo) => tipos.push(nodo.tipo))
    expect(tipos).toEqual(['and', 'materia', 'or', 'materia', 'anio'])
  })

  it('extrae los códigos de materia', () => {
    expect(codigosDeCondicion(arbol)).toEqual(['662-0.1', '662-0.2'])
    expect(codigosDeCondicion(null)).toEqual([])
  })
})

describe('validarCondicion', () => {
  it('acepta una condición nula', () => {
    expect(validarCondicion(null)).toEqual({ exito: true, errores: [] })
  })

  it('acepta una condición válida y completa', () => {
    const condicion = condicionDesdeJson({ and: ['662-0.1', { or: ['662-0.2', '662-0.3'] }] })
    const resultado = validarCondicion(condicion, {
      codigosValidos: ['662-0.1', '662-0.2', '662-0.3'],
      autoReferencia: '662-1.1'
    })
    expect(resultado.exito).toBe(true)
    expect(resultado.errores).toEqual([])
  })

  it('reporta grupos vacíos', () => {
    const resultado = validarCondicion({ tipo: 'and', hijos: [] })
    expect(resultado.exito).toBe(false)
    expect(resultado.errores.join(' ')).toContain('AND')
  })

  it('reporta materias inexistentes en el plan', () => {
    const condicion = condicionDesdeJson(['662-0.1', '662-9.9'])
    const resultado = validarCondicion(condicion, { codigosValidos: ['662-0.1'] })
    expect(resultado.exito).toBe(false)
    expect(resultado.errores.join(' ')).toContain('662-9.9')
  })

  it('reporta auto-referencia', () => {
    const condicion = condicionDesdeJson('662-1.1')
    const resultado = validarCondicion(condicion, { autoReferencia: '662-1.1' })
    expect(resultado.exito).toBe(false)
    expect(resultado.errores.join(' ')).toContain('sí misma')
  })

  it('reporta un año completo sin materias de ese año', () => {
    const condicion = condicionDesdeJson({ anio_completo: 5 })
    const resultado = validarCondicion(condicion, { aniosValidos: [0, 1] })
    expect(resultado.exito).toBe(false)
    expect(resultado.errores.join(' ')).toContain('año 5')
  })

  it('acepta códigos válidos como Set', () => {
    const condicion = condicionDesdeJson('662-0.1')
    expect(validarCondicion(condicion, { codigosValidos: new Set(['662-0.1']) }).exito).toBe(true)
  })

  it('reporta un tipo de nodo inválido', () => {
    const resultado = validarCondicion({ tipo: 'nope' })
    expect(resultado.exito).toBe(false)
    expect(resultado.errores.join(' ')).toContain('tipo válido')
  })
})
