import { describe, it, expect } from 'vitest'
import {
  detectarPregrado,
  validarAniosReconocibles,
  validarCodigosDuplicados,
  validarCorrelativasExistentes,
  validarEquivalencias,
  validarMaterias,
  validarNombresMaterias
} from '@/utils/validacionPlanes.js'

/** Materia base del editor. */
function materia(extra = {}) {
  return {
    anio: 0,
    nombre: 'Audioperceptiva',
    cursada: 'anual',
    correlativas: { cursar: null, aprobar: null },
    equivale_a: [],
    ...extra
  }
}

describe('validarAniosReconocibles', () => {
  it('acepta los formatos actuales y legacy', () => {
    const materias = {
      '663-0.1': materia(),
      '663-1.10': materia({ anio: 1 }),
      '1.1': materia({ anio: 1 })
    }
    expect(validarAniosReconocibles(materias)).toEqual([])
  })

  it('reporta códigos sin año reconocible', () => {
    const errores = validarAniosReconocibles({ 'sin-anio': materia({ anio: null }) })
    expect(errores).toHaveLength(1)
    expect(errores[0]).toContain('sin-anio')
    expect(errores[0]).toContain('año reconocible')
  })
})

describe('validarNombresMaterias', () => {
  it('acepta nombres con texto', () => {
    expect(validarNombresMaterias({ '663-0.1': materia() })).toEqual([])
  })

  it('reporta nombres vacíos o con espacios', () => {
    const errores = validarNombresMaterias({
      '663-0.1': materia({ nombre: '   ' }),
      '663-0.2': materia({ nombre: '' })
    })
    expect(errores).toHaveLength(2)
    expect(errores[0]).toContain('663-0.1')
    expect(errores[0]).toContain('no tiene nombre')
  })
})

describe('validarCodigosDuplicados', () => {
  it('reporta claves equivalentes con espacios distintos', () => {
    const errores = validarCodigosDuplicados({
      '663-0.1': materia(),
      ' 663-0.1': materia()
    })
    expect(errores).toHaveLength(1)
    expect(errores[0]).toContain('duplicado')
  })

  it('no reporta códigos distintos', () => {
    expect(validarCodigosDuplicados({ '663-0.1': materia(), '663-0.2': materia() })).toEqual([])
  })
})

describe('validarCorrelativasExistentes', () => {
  const materias = {
    '663-0.1': materia(),
    '663-0.2': materia()
  }

  it('acepta condiciones con referencias existentes', () => {
    const conCondicion = {
      ...materias,
      '663-0.2': materia({
        correlativas: { cursar: { tipo: 'materia', codigo: '663-0.1' }, aprobar: null }
      })
    }
    expect(validarCorrelativasExistentes(conCondicion)).toEqual([])
  })

  it('reporta grupos vacíos, materias inexistentes y auto-referencia', () => {
    const conErrores = {
      ...materias,
      '663-0.2': materia({
        correlativas: {
          cursar: { tipo: 'and', hijos: [] },
          aprobar: { tipo: 'materia', codigo: '663-0.2' }
        }
      }),
      '663-0.1': materia({
        correlativas: {
          cursar: { tipo: 'materia', codigo: '999-0.1' },
          aprobar: null
        }
      })
    }

    const errores = validarCorrelativasExistentes(conErrores)
    expect(errores.some((e) => e.includes('no tiene condiciones'))).toBe(true)
    expect(errores.some((e) => e.includes('no puede depender de sí misma'))).toBe(true)
    expect(errores.some((e) => e.includes('"999-0.1" no existe'))).toBe(true)
  })

  it('reporta un año completo sin materias de ese año', () => {
    const conAnio = {
      ...materias,
      '663-0.2': materia({
        correlativas: { cursar: { tipo: 'anio', anio: 3 }, aprobar: null }
      })
    }
    const errores = validarCorrelativasExistentes(conAnio)
    expect(errores.some((e) => e.includes('año 3'))).toBe(true)
  })
})

describe('validarEquivalencias', () => {
  it('no reporta equivalencias dentro del plan', () => {
    const materias = {
      '663-0.1': materia({ equivale_a: ['663-0.2'] }),
      '663-0.2': materia()
    }
    expect(validarEquivalencias(materias)).toEqual([])
  })

  it('reporta como advertencia una equivalencia fuera del plan', () => {
    const advertencias = validarEquivalencias({
      '663-0.1': materia({ equivale_a: ['662-0.1'] })
    })
    expect(advertencias).toHaveLength(1)
    expect(advertencias[0]).toContain('662-0.1')
    expect(advertencias[0]).toContain('plan madre')
  })
})

describe('validarMaterias', () => {
  it('devuelve exito true y separa advertencias de errores', () => {
    const resultado = validarMaterias({
      '663-0.1': materia({ equivale_a: ['662-0.1'] })
    })
    expect(resultado.exito).toBe(true)
    expect(resultado.errores).toEqual([])
    expect(resultado.advertencias).toHaveLength(1)
  })

  it('devuelve exito false si hay errores', () => {
    const resultado = validarMaterias({
      '663-0.1': materia({ nombre: '' })
    })
    expect(resultado.exito).toBe(false)
    expect(resultado.errores.length).toBeGreaterThan(0)
  })
})

describe('detectarPregrado', () => {
  it('detecta materias de año 0', () => {
    expect(detectarPregrado({ '663-0.1': materia() })).toBe(true)
    expect(detectarPregrado({ '663-1.1': materia({ anio: 1 }) })).toBe(false)
  })
})
