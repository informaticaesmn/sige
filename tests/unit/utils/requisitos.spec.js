import { describe, it, expect } from 'vitest'
import {
  PARAMETROS_ACADEMICOS,
  TIPOS_REQUISITO,
  anioCompleto,
  calcularAvancePlan,
  espaciosDisponibles,
  evaluarCondicion,
  resolverParametros,
  validarParametrosPlan,
  validarRequisitos
} from '@/utils/requisitos.js'

/**
 * Plan de prueba con años 0, 1, 2 y un requisito transversal.
 *
 * - R-0-03 es conmutable: `T-0.3.1` declara una equivalencia dirigida desde
 *   `T-0.9`.
 * - R-2-OPT es optativo: se cumplen 2 de 4 espacios.
 * - T-1.1 usa `{ anio_completo: 0 }` y T-1.2 usa una correlativa directa.
 */
function crearPlanT() {
  return {
    plan: 'T',
    nombre: 'Plan de prueba',
    materias: {
      'T-0.1': { id: 'T-0.1', anio: 0, nombre: 'Obligatoria 0.1' },
      'T-0.2': { id: 'T-0.2', anio: 0, nombre: 'Obligatoria 0.2' },
      'T-0.3.1': {
        id: 'T-0.3.1',
        anio: 0,
        nombre: 'Lenguaje musical A',
        equivale_a: ['T-0.9']
      },
      'T-0.3.2': { id: 'T-0.3.2', anio: 0, nombre: 'Lenguaje musical B' },
      'T-1.1': {
        id: 'T-1.1',
        anio: 1,
        nombre: 'Año completo',
        correlativas: { cursar: { anio_completo: 0 } }
      },
      'T-1.2': {
        id: 'T-1.2',
        anio: 1,
        nombre: 'Correlativa directa',
        correlativas: { cursar: 'T-0.1' }
      },
      'T-2.1': { id: 'T-2.1', anio: 2, nombre: 'Seminario 1' },
      'T-2.2': { id: 'T-2.2', anio: 2, nombre: 'Seminario 2' },
      'T-2.3': { id: 'T-2.3', anio: 2, nombre: 'Seminario 3' },
      'T-2.4': { id: 'T-2.4', anio: 2, nombre: 'Seminario 4' },
      'T-9.1': { id: 'T-9.1', anio: 9, nombre: 'Transversal' }
    },
    requisitos: [
      {
        id: 'R-0-01',
        anio: 0,
        tipo: 'obligatorio',
        minimo: 1,
        candidatos: ['T-0.1'],
        etiqueta: 'Obligatoria 0.1'
      },
      {
        id: 'R-0-02',
        anio: 0,
        tipo: 'obligatorio',
        minimo: 1,
        candidatos: ['T-0.2']
      },
      {
        id: 'R-0-03',
        anio: 0,
        tipo: 'conmutable',
        minimo: 1,
        candidatos: ['T-0.3.1', 'T-0.3.2'],
        etiqueta: 'Lenguaje musical'
      },
      {
        id: 'R-1-01',
        anio: 1,
        tipo: 'obligatorio',
        minimo: 1,
        candidatos: ['T-1.1']
      },
      {
        id: 'R-1-02',
        anio: 1,
        tipo: 'obligatorio',
        minimo: 1,
        candidatos: ['T-1.2']
      },
      {
        id: 'R-2-OPT',
        anio: 2,
        tipo: 'optativo',
        minimo: 2,
        candidatos: ['T-2.1', 'T-2.2', 'T-2.3', 'T-2.4'],
        etiqueta: 'Seminarios optativos'
      },
      {
        id: 'R-TRANS',
        anio: null,
        tipo: 'obligatorio',
        minimo: 1,
        candidatos: ['T-9.1'],
        etiqueta: 'Transversal'
      }
    ]
  }
}

/**
 * Plan mínimo: una materia obligatoria por año y un requisito por materia.
 * Facilita construir casos de validación sin arrastrar el plan grande.
 * @param {Record<string, Object>} materias
 * @param {Object[]} requisitos
 * @returns {Object}
 */
function crearPlan(materias, requisitos) {
  return { plan: 'P', nombre: 'Plan mínimo', materias, requisitos }
}

/**
 * Devuelve true si algún mensaje de error contiene el texto buscado.
 * @param {string[]} errores
 * @param {string} texto
 * @returns {boolean}
 */
function hayError(errores, texto) {
  return errores.some((error) => error.includes(texto))
}

describe('TIPOS_REQUISITO', () => {
  it('declara los tres tipos explícitos', () => {
    expect(TIPOS_REQUISITO).toEqual(['obligatorio', 'conmutable', 'optativo'])
  })
})

describe('PARAMETROS_ACADEMICOS', () => {
  it('tiene versión y valores base', () => {
    expect(PARAMETROS_ACADEMICOS.version).toBe('2026.1')
    expect(PARAMETROS_ACADEMICOS.vigenteDesde).toBe('2026-01-01')
    expect(PARAMETROS_ACADEMICOS.cursada.vigenciaRegularAnios).toBe(2)
    expect(PARAMETROS_ACADEMICOS.plan.aniosVencimiento).toBe(4)
    expect(PARAMETROS_ACADEMICOS.examen.vocalesTribunal).toBe(2)
  })

  it('deja en null los valores sin definir', () => {
    expect(PARAMETROS_ACADEMICOS.cursada.notaAprobacion).toBeNull()
    expect(PARAMETROS_ACADEMICOS.cursada.notaMinimaPromocion).toBeNull()
    expect(PARAMETROS_ACADEMICOS.plan.umbralPorVencerMeses).toBeNull()
    expect(PARAMETROS_ACADEMICOS.alertas.diasAvisoVencimientoCursada).toBeNull()
  })
})

describe('validarParametrosPlan', () => {
  it('acepta un plan sin parámetros', () => {
    expect(validarParametrosPlan(undefined)).toEqual({ exito: true, errores: [] })
    expect(validarParametrosPlan(null)).toEqual({ exito: true, errores: [] })
    expect(validarParametrosPlan({})).toEqual({ exito: true, errores: [] })
  })

  it('acepta overrides válidos', () => {
    const resultado = validarParametrosPlan({
      vigenteDesde: '2026-01-01',
      cursada: { vigenciaRegularAnios: 3 },
      plan: { aniosVencimiento: 5, umbralPorVencerMeses: 6 },
      examen: { vocalesTribunal: 2 }
    })
    expect(resultado).toEqual({ exito: true, errores: [] })
  })

  it('rechaza claves desconocidas', () => {
    expect(hayError(validarParametrosPlan({ version: '2027.1' }).errores, 'version')).toBe(
      true
    )
    expect(
      hayError(
        validarParametrosPlan({ cursada: { vigenciaRegularAnios: 2, extra: 1 } }).errores,
        'cursada.extra'
      )
    ).toBe(true)
  })

  it('rechaza tipos y rangos inválidos', () => {
    expect(
      hayError(
        validarParametrosPlan({ cursada: { vigenciaRegularAnios: 0 } }).errores,
        'cursada.vigenciaRegularAnios'
      )
    ).toBe(true)
    expect(
      hayError(
        validarParametrosPlan({ cursada: { vigenciaRegularAnios: 2.5 } }).errores,
        'cursada.vigenciaRegularAnios'
      )
    ).toBe(true)
    expect(
      hayError(
        validarParametrosPlan({ plan: { aniosVencimiento: '4' } }).errores,
        'plan.aniosVencimiento'
      )
    ).toBe(true)
    expect(
      hayError(validarParametrosPlan({ cursada: 5 }).errores, '"cursada" debe ser un objeto')
    ).toBe(true)
  })

  it('valida el formato de vigenteDesde', () => {
    expect(hayError(validarParametrosPlan({ vigenteDesde: '01/01/2026' }).errores, 'vigenteDesde')).toBe(
      true
    )
  })

  it('acepta null en los valores opcionales', () => {
    const resultado = validarParametrosPlan({
      cursada: { notaAprobacion: null, notaMinimaPromocion: null },
      plan: { umbralPorVencerMeses: null },
      alertas: { diasAvisoVencimientoCursada: null }
    })
    expect(resultado).toEqual({ exito: true, errores: [] })
  })
})

describe('resolverParametros', () => {
  it('devuelve el global cuando el plan no declara parámetros', () => {
    const resultado = resolverParametros({})
    expect(resultado.version).toBe('2026.1')
    expect(resultado.cursada.vigenciaRegularAnios).toBe(2)
    expect(resultado.plan.aniosVencimiento).toBe(4)
    expect(resultado.examen.vocalesTribunal).toBe(2)
  })

  it('mergea sección por sección sin pisar el resto', () => {
    const resultado = resolverParametros({
      parametros: {
        cursada: { vigenciaRegularAnios: 3 },
        plan: { aniosVencimiento: 5 }
      }
    })
    expect(resultado.cursada.vigenciaRegularAnios).toBe(3)
    expect(resultado.cursada.notaAprobacion).toBeNull()
    expect(resultado.plan.aniosVencimiento).toBe(5)
    expect(resultado.plan.umbralPorVencerMeses).toBeNull()
    expect(resultado.examen.vocalesTribunal).toBe(2)
  })

  it('permite overrides de vigenteDesde pero no de version', () => {
    const resultado = resolverParametros({
      parametros: { version: '2099.9', vigenteDesde: '2027-01-01' }
    })
    expect(resultado.version).toBe('2026.1')
    expect(resultado.vigenteDesde).toBe('2027-01-01')
  })

  it('no muta el global', () => {
    resolverParametros({ parametros: { cursada: { vigenciaRegularAnios: 3 } } })
    expect(PARAMETROS_ACADEMICOS.cursada.vigenciaRegularAnios).toBe(2)
  })

  it('acepta un global alternativo', () => {
    const global = {
      version: 'TEST',
      vigenteDesde: '2030-01-01',
      cursada: { vigenciaRegularAnios: 1, notaAprobacion: 4 },
      plan: { aniosVencimiento: 10 },
      examen: { vocalesTribunal: 3 },
      alertas: {}
    }
    const resultado = resolverParametros(
      { parametros: { cursada: { vigenciaRegularAnios: 2 } } },
      global
    )
    expect(resultado.version).toBe('TEST')
    expect(resultado.cursada.vigenciaRegularAnios).toBe(2)
    expect(resultado.cursada.notaAprobacion).toBe(4)
    expect(global.cursada.vigenciaRegularAnios).toBe(1)
  })
})

describe('validarRequisitos', () => {
  it('acepta el plan completo', () => {
    expect(validarRequisitos(crearPlanT())).toEqual({
      exito: true,
      errores: [],
      advertencias: []
    })
  })

  it('trata la ausencia de requisitos como error por defecto', () => {
    const resultado = validarRequisitos({ materias: {} })
    expect(resultado.exito).toBe(false)
    expect(resultado.errores).toContain('El plan no tiene requisitos.')
  })

  it('puede tratar la ausencia como advertencia', () => {
    const resultado = validarRequisitos({ materias: {} }, { permitirAusente: true })
    expect(resultado).toEqual({
      exito: true,
      errores: [],
      advertencias: ['El plan no tiene requisitos.']
    })
  })

  it('detecta ids repetidos', () => {
    const plan = crearPlan(
      {
        'P-1.1': { id: 'P-1.1', anio: 1 },
        'P-1.2': { id: 'P-1.2', anio: 1 }
      },
      [
        { id: 'R-1', anio: 1, tipo: 'obligatorio', minimo: 1, candidatos: ['P-1.1'] },
        { id: 'R-1', anio: 1, tipo: 'obligatorio', minimo: 1, candidatos: ['P-1.2'] }
      ]
    )
    expect(hayError(validarRequisitos(plan).errores, 'repetido')).toBe(true)
  })

  it('detecta materias sin requisito y candidatos repetidos', () => {
    const plan = crearPlan(
      {
        'P-1.1': { id: 'P-1.1', anio: 1 },
        'P-1.2': { id: 'P-1.2', anio: 1 }
      },
      [
        {
          id: 'R-1',
          anio: 1,
          tipo: 'conmutable',
          minimo: 1,
          candidatos: ['P-1.1', 'P-1.2']
        },
        {
          id: 'R-2',
          anio: 1,
          tipo: 'obligatorio',
          minimo: 1,
          candidatos: ['P-1.1']
        }
      ]
    )
    const { errores } = validarRequisitos(plan)
    expect(hayError(errores, 'pertenece a más de un requisito')).toBe(true)
  })

  it('detecta un mínimo incompatible con el tipo', () => {
    const plan = crearPlan(
      { 'P-1.1': { id: 'P-1.1', anio: 1 }, 'P-1.2': { id: 'P-1.2', anio: 1 } },
      [
        {
          id: 'R-1',
          anio: 1,
          tipo: 'obligatorio',
          minimo: 1,
          candidatos: ['P-1.1', 'P-1.2']
        }
      ]
    )
    expect(hayError(validarRequisitos(plan).errores, 'un obligatorio debe tener 1')).toBe(true)
  })

  it('un optativo no puede pedir todos los candidatos', () => {
    const plan = crearPlan(
      { 'P-1.1': { id: 'P-1.1', anio: 1 }, 'P-1.2': { id: 'P-1.2', anio: 1 } },
      [
        {
          id: 'R-1',
          anio: 1,
          tipo: 'optativo',
          minimo: 2,
          candidatos: ['P-1.1', 'P-1.2']
        }
      ]
    )
    expect(hayError(validarRequisitos(plan).errores, 'un optativo debe tener')).toBe(true)
  })

  it('detecta un candidato inexistente', () => {
    const plan = crearPlan(
      { 'P-1.1': { id: 'P-1.1', anio: 1 } },
      [
        {
          id: 'R-1',
          anio: 1,
          tipo: 'conmutable',
          minimo: 1,
          candidatos: ['P-1.1', 'P-9.9']
        }
      ]
    )
    expect(
      hayError(validarRequisitos(plan).errores, 'La materia "P-9.9" no existe en el plan')
    ).toBe(true)
  })

  it('detecta un candidato de otro año', () => {
    const plan = crearPlan(
      { 'P-1.1': { id: 'P-1.1', anio: 1 } },
      [
        {
          id: 'R-2',
          anio: 2,
          tipo: 'obligatorio',
          minimo: 1,
          candidatos: ['P-1.1']
        }
      ]
    )
    expect(hayError(validarRequisitos(plan).errores, 'no pertenece al año 2')).toBe(true)
  })

  it('detecta una auto-equivalencia', () => {
    const plan = crearPlan(
      { 'P-1.1': { id: 'P-1.1', anio: 1, equivale_a: ['P-1.1'] } },
      [
        {
          id: 'R-1',
          anio: 1,
          tipo: 'obligatorio',
          minimo: 1,
          candidatos: ['P-1.1']
        }
      ]
    )
    expect(hayError(validarRequisitos(plan).errores, 'equivalente a sí misma')).toBe(true)
  })

  it('acepta un requisito transversal con anio null', () => {
    const plan = crearPlan(
      { 'P-9.1': { id: 'P-9.1', anio: 9 } },
      [
        {
          id: 'R-TRANS',
          anio: null,
          tipo: 'obligatorio',
          minimo: 1,
          candidatos: ['P-9.1']
        }
      ]
    )
    expect(validarRequisitos(plan).exito).toBe(true)
  })
})

describe('calcularAvancePlan', () => {
  it('no es válido sin requisitos y no inventa obligatorios', () => {
    const resultado = calcularAvancePlan(
      { materias: { 'P-1.1': { id: 'P-1.1', anio: 1 } } },
      ['P-1.1']
    )
    expect(resultado.valido).toBe(false)
    expect(resultado.requisitos).toEqual([])
    expect(resultado.anios).toEqual([])
    expect(resultado.total).toEqual({
      requisitos: 0,
      cumplidos: 0,
      pendientes: 0,
      avance: 0,
      espaciosRequeridos: 0,
      espaciosCumplidos: 0,
      sobrantes: 0,
      acreditadasSinRequisito: ['P-1.1']
    })
  })

  it('mide el avance en requisitos y los espacios como diagnóstico', () => {
    const plan = crearPlanT()
    const resultado = calcularAvancePlan(plan, ['T-0.1', 'T-0.2', 'T-0.3.1'])

    expect(resultado.valido).toBe(true)
    expect(resultado.requisitos).toHaveLength(7)
    expect(resultado.total.requisitos).toBe(7)
    expect(resultado.total.cumplidos).toBe(3)
    expect(resultado.total.pendientes).toBe(4)
    expect(resultado.total.avance).toBeCloseTo(3 / 7)
    expect(resultado.total.espaciosRequeridos).toBe(8)
    expect(resultado.total.espaciosCumplidos).toBe(3)
    expect(resultado.total.sobrantes).toBe(0)
  })

  it('marca el año completo y separa exigidos de sobrantes', () => {
    const plan = crearPlanT()
    const todas = Object.keys(plan.materias)
    const resultado = calcularAvancePlan(plan, todas)

    const optativo = resultado.requisitos.find((r) => r.id === 'R-2-OPT')
    expect(optativo.acreditados).toEqual(['T-2.1', 'T-2.2'])
    expect(optativo.sobrantes).toEqual(['T-2.3', 'T-2.4'])
    expect(optativo.cumplidos).toBe(2)
    expect(optativo.estado).toBe('cumplido')

    expect(resultado.total.cumplidos).toBe(7)
    expect(resultado.total.avance).toBe(1)
    expect(resultado.total.espaciosCumplidos).toBe(8)
    // 1 sobrante del conmutable (2 candidatos, mínimo 1) + 2 del optativo.
    expect(resultado.total.sobrantes).toBe(3)

    const conmutable = resultado.requisitos.find((r) => r.id === 'R-0-03')
    expect(conmutable.acreditados).toEqual(['T-0.3.1'])
    expect(conmutable.sobrantes).toEqual(['T-0.3.2'])

    const anio2 = resultado.anios.find((a) => a.anio === 2)
    expect(anio2).toEqual({ anio: 2, requisitos: 1, cumplidos: 1, completo: true })
    expect(resultado.anios.some((a) => a.anio === 9)).toBe(false)
  })

  it('aplica equivalencias dirigidas', () => {
    const plan = crearPlanT()
    const resultado = calcularAvancePlan(plan, ['T-0.9'])

    const conmutable = resultado.requisitos.find((r) => r.id === 'R-0-03')
    expect(conmutable.acreditados).toEqual(['T-0.3.1'])
    expect(conmutable.estado).toBe('cumplido')

    const optativo = resultado.requisitos.find((r) => r.id === 'R-2-OPT')
    expect(optativo.acreditados).toEqual([])
    expect(optativo.faltan).toBe(2)

    expect(resultado.total.acreditadasSinRequisito).toEqual([])
  })

  it('no encadena equivalencias', () => {
    const plan = crearPlan(
      {
        'C-2.1': { id: 'C-2.1', anio: 2, equivale_a: ['C-1.1'] },
        'C-3.1': { id: 'C-3.1', anio: 3, equivale_a: ['C-2.1'] }
      },
      [
        {
          id: 'R-2-01',
          anio: 2,
          tipo: 'obligatorio',
          minimo: 1,
          candidatos: ['C-2.1']
        },
        {
          id: 'R-3-01',
          anio: 3,
          tipo: 'obligatorio',
          minimo: 1,
          candidatos: ['C-3.1']
        }
      ]
    )
    const resultado = calcularAvancePlan(plan, ['C-1.1'])
    const dos = resultado.requisitos.find((r) => r.id === 'R-2-01')
    const tres = resultado.requisitos.find((r) => r.id === 'R-3-01')
    expect(dos.estado).toBe('cumplido')
    expect(tres.estado).toBe('pendiente')
  })

  it('reporta códigos acreditados que no son candidatos ni equivalencias', () => {
    const resultado = calcularAvancePlan(crearPlanT(), ['ZZZ-1'])
    expect(resultado.total.acreditadasSinRequisito).toEqual(['ZZZ-1'])
  })

  it('una materia vieja puede satisfacer dos requisitos solo si ambos la declaran', () => {
    const plan = crearPlan(
      {
        'D-1.1': { id: 'D-1.1', anio: 1, equivale_a: ['D-0.1'] },
        'D-1.2': { id: 'D-1.2', anio: 1, equivale_a: ['D-0.1'] }
      },
      [
        {
          id: 'R-1-01',
          anio: 1,
          tipo: 'obligatorio',
          minimo: 1,
          candidatos: ['D-1.1']
        },
        {
          id: 'R-1-02',
          anio: 1,
          tipo: 'obligatorio',
          minimo: 1,
          candidatos: ['D-1.2']
        }
      ]
    )
    const resultado = calcularAvancePlan(plan, ['D-0.1'])
    expect(resultado.valido).toBe(true)
    expect(resultado.requisitos.every((r) => r.estado === 'cumplido')).toBe(true)
    expect(resultado.total.espaciosCumplidos).toBe(2)
  })

  it('devuelve advertencias vacías en un plan consistente', () => {
    const resultado = calcularAvancePlan(crearPlanT(), [])
    expect(resultado.advertencias).toEqual([])
  })

  it('avisa cuando una equivalencia cuenta para dos requisitos', () => {
    const plan = crearPlan(
      {
        'A-1.1': { id: 'A-1.1', anio: 1, equivale_a: ['A-1.2'] },
        'A-1.2': { id: 'A-1.2', anio: 1 }
      },
      [
        {
          id: 'R-1-01',
          anio: 1,
          tipo: 'obligatorio',
          minimo: 1,
          candidatos: ['A-1.1']
        },
        {
          id: 'R-1-02',
          anio: 1,
          tipo: 'obligatorio',
          minimo: 1,
          candidatos: ['A-1.2']
        }
      ]
    )
    const resultado = calcularAvancePlan(plan, ['A-1.2'])

    // Una sola acreditada cumple los dos requisitos: doble cómputo.
    expect(resultado.valido).toBe(true)
    expect(resultado.total.cumplidos).toBe(2)
    expect(resultado.advertencias).toHaveLength(1)
    expect(resultado.advertencias[0]).toContain('"A-1.1"')
    expect(resultado.advertencias[0]).toContain('"R-1-01"')
    expect(resultado.advertencias[0]).toContain('"R-1-02"')
  })

  it('una auto-equivalencia es error y no genera advertencia de doble cómputo', () => {
    const plan = crearPlan(
      { 'B-1.1': { id: 'B-1.1', anio: 1, equivale_a: ['B-1.1'] } },
      [
        {
          id: 'R-1-01',
          anio: 1,
          tipo: 'obligatorio',
          minimo: 1,
          candidatos: ['B-1.1']
        }
      ]
    )
    const resultado = calcularAvancePlan(plan, ['B-1.1'])

    expect(resultado.valido).toBe(false)
    expect(hayError(resultado.errores, 'equivalente a sí misma')).toBe(true)
    expect(resultado.advertencias).toEqual([])
    expect(resultado.total.cumplidos).toBe(1)
  })

  it('un plan inválido reporta errores y no inventa advertencias', () => {
    const plan = crearPlan(
      {
        'P-1.1': { id: 'P-1.1', anio: 1 },
        'P-1.2': { id: 'P-1.2', anio: 1 }
      },
      [
        {
          id: 'R-1-01',
          anio: 1,
          tipo: 'obligatorio',
          minimo: 1,
          candidatos: ['P-1.1']
        }
      ]
    )
    const resultado = calcularAvancePlan(plan, ['P-1.1'])

    expect(resultado.valido).toBe(false)
    expect(hayError(resultado.errores, 'no pertenece a ningún requisito')).toBe(true)
    expect(resultado.advertencias).toEqual([])
  })

  it('acepta acreditadas como objetos o Set', () => {
    const plan = crearPlanT()
    const comoObjetos = calcularAvancePlan(plan, [
      { codigo: 'T-0.1', planCodigo: 'T', fecha: '2026-03-01' },
      { materiaId: 'T-0.2' }
    ])
    const comoSet = calcularAvancePlan(plan, new Set(['T-0.1', 'T-0.2']))
    expect(comoObjetos.total.cumplidos).toBe(2)
    expect(comoSet.total.cumplidos).toBe(2)
  })
})

describe('anioCompleto', () => {
  it('con requisitos exige todos los requisitos del año', () => {
    const plan = crearPlanT()
    expect(anioCompleto(plan, 0, ['T-0.1', 'T-0.2'])).toBe(false)
    expect(anioCompleto(plan, 0, ['T-0.1', 'T-0.2', 'T-0.3.1'])).toBe(true)
    expect(anioCompleto(plan, '0', ['T-0.1', 'T-0.2', 'T-0.3.2'])).toBe(true)
  })

  it('devuelve false si el año no tiene requisitos', () => {
    expect(anioCompleto(crearPlanT(), 7, [])).toBe(false)
  })

  it('sin requisitos conserva el significado legacy', () => {
    const plan = {
      materias: {
        'L-0.1': { id: 'L-0.1', anio: 0 },
        'L-0.2': { id: 'L-0.2', anio: 0 },
        'L-1.1': { id: 'L-1.1', anio: 1 }
      }
    }
    expect(anioCompleto(plan, 0, ['L-0.1'])).toBe(false)
    expect(anioCompleto(plan, 0, ['L-0.1', 'L-0.2'])).toBe(true)
    expect(anioCompleto(plan, 1, ['L-1.1'])).toBe(true)
  })

  it('rechaza años inválidos', () => {
    expect(anioCompleto(crearPlanT(), null, [])).toBe(false)
    expect(anioCompleto(crearPlanT(), '', [])).toBe(false)
    expect(anioCompleto(crearPlanT(), -1, [])).toBe(false)
  })
})

describe('evaluarCondicion', () => {
  const plan = crearPlanT()

  it('trata una condición vacía como cumplida', () => {
    expect(evaluarCondicion(null, { plan, acreditadas: [] })).toBe(true)
  })

  it('evalúa una materia acreditada o no acreditada', () => {
    expect(evaluarCondicion('T-0.1', { plan, acreditadas: ['T-0.1'] })).toBe(true)
    expect(evaluarCondicion('T-0.1', { plan, acreditadas: [] })).toBe(false)
  })

  it('evalúa and y or', () => {
    const and = { and: ['T-0.1', 'T-0.2'] }
    expect(evaluarCondicion(and, { plan, acreditadas: ['T-0.1', 'T-0.2'] })).toBe(true)
    expect(evaluarCondicion(and, { plan, acreditadas: ['T-0.1'] })).toBe(false)

    const or = { or: ['T-0.1', 'T-0.2'] }
    expect(evaluarCondicion(or, { plan, acreditadas: ['T-0.2'] })).toBe(true)
    expect(evaluarCondicion(or, { plan, acreditadas: [] })).toBe(false)
  })

  it('evalúa anio_completo contra los requisitos', () => {
    const condicion = { anio_completo: 0 }
    expect(evaluarCondicion(condicion, { plan, acreditadas: ['T-0.1', 'T-0.2'] })).toBe(false)
    expect(
      evaluarCondicion(condicion, { plan, acreditadas: ['T-0.1', 'T-0.2', 'T-0.3.1'] })
    ).toBe(true)
  })

  it('las equivalencias son dirigidas', () => {
    // T-0.3.1 declara equivalencia desde T-0.9, no al revés.
    expect(evaluarCondicion('T-0.3.1', { plan, acreditadas: ['T-0.9'] })).toBe(true)
    expect(evaluarCondicion('T-0.9', { plan, acreditadas: ['T-0.3.1'] })).toBe(false)
  })

  it('acepta un árbol normalizado', () => {
    const arbol = {
      tipo: 'and',
      hijos: [
        { tipo: 'materia', codigo: 'T-0.1' },
        { tipo: 'anio', anio: 0 }
      ]
    }
    expect(
      evaluarCondicion(arbol, {
        plan,
        acreditadas: ['T-0.1', 'T-0.2', 'T-0.3.1']
      })
    ).toBe(true)
  })
})

describe('espaciosDisponibles', () => {
  it('devuelve [] si el plan no tiene requisitos válidos', () => {
    expect(espaciosDisponibles({ materias: {} }, [])).toEqual([])
  })

  it('ofrece solo requisitos pendientes y filtra correlativas', () => {
    const espacios = espaciosDisponibles(crearPlanT(), [])
    const codigos = espacios.map((espacio) => espacio.codigo)

    // Año 0 y año 2 no tienen correlativas.
    expect(codigos).toContain('T-0.1')
    expect(codigos).toContain('T-2.1')
    expect(codigos).toContain('T-9.1')
    // Año 1 depende del año 0 completo o de T-0.1.
    expect(codigos).not.toContain('T-1.1')
    expect(codigos).not.toContain('T-1.2')

    const primero = espacios.find((espacio) => espacio.codigo === 'T-0.1')
    expect(primero).toEqual({
      codigo: 'T-0.1',
      nombre: 'Obligatoria 0.1',
      anio: 0,
      requisitoId: 'R-0-01',
      tipo: 'obligatorio',
      etiqueta: 'Obligatoria 0.1'
    })
  })

  it('habilita el año siguiente cuando el año 0 está completo', () => {
    const espacios = espaciosDisponibles(crearPlanT(), ['T-0.1', 'T-0.2', 'T-0.3.1'])
    const codigos = espacios.map((espacio) => espacio.codigo)
    expect(codigos).toContain('T-1.1')
    expect(codigos).toContain('T-1.2')
  })

  it('deja de ofrecer un optativo al alcanzar el mínimo', () => {
    const espacios = espaciosDisponibles(crearPlanT(), [
      'T-0.1',
      'T-0.2',
      'T-0.3.1',
      'T-2.1',
      'T-2.2'
    ])
    const codigos = espacios.map((espacio) => espacio.codigo)
    expect(codigos).not.toContain('T-2.1')
    expect(codigos).not.toContain('T-2.2')
    expect(codigos).not.toContain('T-2.3')
    expect(codigos).not.toContain('T-2.4')
  })

  it('no ofrece códigos ya acreditados', () => {
    const espacios = espaciosDisponibles(crearPlanT(), ['T-0.1'])
    const codigos = espacios.map((espacio) => espacio.codigo)
    expect(codigos).not.toContain('T-0.1')
    expect(codigos).toContain('T-0.3.1')
  })
})
