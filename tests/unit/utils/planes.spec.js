import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'
import {
  anioDeMateria,
  catalogoDePlanes,
  esPlanDisponible,
  estadoInicialDePlan,
  hayCatalogoPlanes,
  normalizarCatalogoPlanes,
  normalizarPlanJson,
  planesDisponibles,
  resetCatalogoPlanes,
  resolverCodigoPlan,
  setCatalogoPlanes,
  tienePregrado,
  validarPlanDetalle
} from '@/utils/planes.js'

/** Lee un JSON real de `public/planes/` desde el filesystem. */
function leerPlan(codigo) {
  const ruta = join(process.cwd(), 'public', 'planes', `${codigo}.json`)
  return JSON.parse(readFileSync(ruta, 'utf8'))
}

const plan662 = normalizarPlanJson(leerPlan('662'), '662')
const plan708 = normalizarPlanJson(leerPlan('708'), '708')
const plan662G = normalizarPlanJson(leerPlan('662G'), '662G')

describe('anioDeMateria', () => {
  it('reconoce el formato actual {plan}-{año}.{número}', () => {
    expect(anioDeMateria('662-0.1')).toBe(0)
    expect(anioDeMateria('662-0.6.3')).toBe(0)
    expect(anioDeMateria('708-1.10')).toBe(1)
    expect(anioDeMateria('708-3.7')).toBe(3)
  })

  it('reconoce el formato actual con código de plan que incluye letra', () => {
    expect(anioDeMateria('662G-0.1')).toBe(0)
    expect(anioDeMateria('662G-1.1')).toBe(1)
    expect(anioDeMateria('662Ñ-4.2')).toBe(4)
  })

  it('reconoce el formato nuevo con año de dos dígitos', () => {
    expect(anioDeMateria('662-00-01.1')).toBe(0)
    expect(anioDeMateria('662-04-22.N')).toBe(4)
  })

  it('reconoce el formato legacy con y sin prefijo de plan', () => {
    expect(anioDeMateria('62G.1.1')).toBe(1)
    expect(anioDeMateria('62G.4.14')).toBe(4)
    expect(anioDeMateria('1.1')).toBe(1)
    expect(anioDeMateria('4.13')).toBe(4)
    expect(anioDeMateria('662.2.5')).toBe(2)
  })

  it('devuelve null si no puede reconocer el año', () => {
    expect(anioDeMateria('sin-anio')).toBeNull()
    expect(anioDeMateria('')).toBeNull()
    expect(anioDeMateria(null)).toBeNull()
  })
})

describe('normalizarPlanJson', () => {
  it('normaliza el plan 662 y detecta 11 materias de pregrado', () => {
    expect(plan662.disponible).toBe(true)
    expect(plan662.formato).toBe('objeto')
    expect(plan662.plan).toBe('662')
    expect(plan662.nombre).toBe('Plan 662')
    expect(Object.keys(plan662.materias)).toHaveLength(91)
    expect(plan662.materias['662-0.1']).toMatchObject({
      anio: 0,
      nombre: 'Audioperceptiva',
      cursada: 'anual'
    })

    const pregrado = Object.values(plan662.materias).filter((materia) => materia.anio === 0)
    expect(pregrado).toHaveLength(11)
    expect(tienePregrado(plan662)).toBe(true)
    expect(estadoInicialDePlan(plan662)).toBe('ingresante')
  })

  it('normaliza el plan 708 como plan sin pregrado', () => {
    expect(plan708.disponible).toBe(true)
    expect(plan708.formato).toBe('objeto')
    expect(plan708.plan).toBe('708')
    expect(Object.keys(plan708.materias)).toHaveLength(29)
    expect(tienePregrado(plan708)).toBe(false)
    expect(estadoInicialDePlan(plan708)).toBe('activo')
  })

  it('marca 662G como no disponible por el plan interno "62G"', () => {
    expect(plan662G.disponible).toBe(false)
    expect(plan662G.formato).toBe('legacy')
    expect(plan662G.plan).toBe('62G')
    expect(plan662G.motivo).toContain('62G')
    expect(plan662G.motivo).toContain('662G')
    expect(plan662G.materias).toEqual({})
    expect(estadoInicialDePlan(plan662G)).toBeNull()
  })

  it('soporta el formato legacy cuando el código coincide y no hay duplicados', () => {
    const legacyValido = [
      { Plan: '999', Cod: '0.1', PCod: '999.0.1', Materia: 'Materia de pregrado', Cursada: 'ANUAL', CodC: [], CodA: [] },
      { Plan: '999', Cod: '1.1', PCod: '999.1.1', Materia: 'Materia de primer año', Cursada: '1C', CodC: ['999.0.1'], CodA: [] }
    ]

    const resultado = normalizarPlanJson(legacyValido, '999')
    expect(resultado.disponible).toBe(true)
    expect(resultado.formato).toBe('legacy')
    expect(resultado.plan).toBe('999')
    expect(Object.keys(resultado.materias)).toHaveLength(2)
    expect(resultado.materias['999.0.1']).toMatchObject({
      anio: 0,
      nombre: 'Materia de pregrado',
      cursada: 'anual'
    })
    expect(resultado.materias['999.1.1'].correlativas).toEqual({
      cursar: ['999.0.1'],
      aprobar: []
    })
    expect(tienePregrado(resultado)).toBe(true)
    expect(estadoInicialDePlan(resultado)).toBe('ingresante')
  })

  it('marca el legacy 62G como no disponible por códigos duplicados', () => {
    const legacy62G = normalizarPlanJson(leerPlan('662G'), '62G')
    expect(legacy62G.disponible).toBe(false)
    expect(legacy62G.formato).toBe('legacy')
    expect(legacy62G.plan).toBe('62G')
    expect(legacy62G.motivo).toContain('duplicados')
    expect(legacy62G.motivo).toContain('62G.1.1')
  })

  it('rechaza un plan interno que no coincide con el código', () => {
    const json = { plan: '708', materias: { '708-1.1': { nombre: 'Electrónica' } } }
    const resultado = normalizarPlanJson(json, '662')
    expect(resultado.disponible).toBe(false)
    expect(resultado.motivo).toContain('708')
    expect(resultado.motivo).toContain('662')
  })

  it('rechaza materias sin año reconocible', () => {
    const json = { plan: '662', materias: { 'materia-sin-año': { nombre: 'X' } } }
    const resultado = normalizarPlanJson(json, '662')
    expect(resultado.disponible).toBe(false)
    expect(resultado.motivo).toContain('materia-sin-año')
  })

  it('rechaza JSON vacíos, arrays vacíos y planes sin materias', () => {
    expect(normalizarPlanJson(null, '662').disponible).toBe(false)
    expect(normalizarPlanJson([], '662').disponible).toBe(false)
    expect(normalizarPlanJson({ plan: '662', materias: {} }, '662').disponible).toBe(false)
    expect(normalizarPlanJson({ plan: '662', materias: [] }, '662').disponible).toBe(false)
  })
})

describe('catálogo de planes', () => {
  afterEach(() => resetCatalogoPlanes())

  const catalogoDemo = {
    planes: [
      { codigo: '662', nombre: '662 Profesorado de Música', disponible: true },
      { codigo: '708', nombre: '708 Técnico Superior en Sonido', disponible: true },
      { codigo: '662G', nombre: '662G Guitarra', disponible: false },
      { codigo: '666', nombre: '666 Composición', disponible: false }
    ]
  }

  it('usa el fallback hardcodeado si el catálogo todavía no cargó', () => {
    const catalogo = catalogoDePlanes()
    expect(catalogo).toContain('662')
    expect(catalogo).toContain('708')
    expect(catalogo).toContain('662A')
    expect(catalogo).toContain('666')
    expect(catalogo).toContain('389')
    expect(catalogo).toHaveLength(37)
  })

  it('planesDisponibles está vacío si el catálogo no cargó (nunca asume disponibilidad)', () => {
    expect(hayCatalogoPlanes()).toBe(false)
    expect(planesDisponibles()).toEqual([])
    expect(esPlanDisponible('662')).toBe(false)
    expect(esPlanDisponible('662G')).toBe(false)
  })

  it('hayCatalogoPlanes distingue catálogo cargado sin planes disponibles', () => {
    setCatalogoPlanes({ planes: [{ codigo: '666', nombre: '666', disponible: false }] })
    expect(hayCatalogoPlanes()).toBe(true)
    expect(planesDisponibles()).toEqual([])
  })

  it('setCatalogoPlanes reemplaza el fallback y define los disponibles', () => {
    setCatalogoPlanes(catalogoDemo)
    expect(catalogoDePlanes()).toEqual(['662', '708', '662G', '666'])
    expect(planesDisponibles()).toEqual(['662', '708'])
    expect(esPlanDisponible('662')).toBe(true)
    expect(esPlanDisponible('708')).toBe(true)
    expect(esPlanDisponible('662G')).toBe(false)
    expect(esPlanDisponible('666')).toBe(false)
    expect(esPlanDisponible('999')).toBe(false)
  })

  it('normalizarCatalogoPlanes acepta un array plano y descarta sin código / duplicados', () => {
    const planes = normalizarCatalogoPlanes([
      { codigo: '662', nombre: 'A', disponible: true },
      { codigo: '662', nombre: 'duplicado', disponible: true },
      { codigo: '', nombre: 'sin código' },
      null
    ])
    expect(planes).toEqual([{ codigo: '662', nombre: 'A', disponible: true }])
  })

  it('normalizarCatalogoPlanes solo marca disponible con `true` exacto', () => {
    const planes = normalizarCatalogoPlanes([
      { codigo: '662', nombre: 'A', disponible: true },
      { codigo: '708', nombre: 'B', disponible: 'true' },
      { codigo: '666', nombre: 'C' }
    ])
    expect(planes.map((p) => p.disponible)).toEqual([true, false, false])
  })
})

describe('resolverCodigoPlan', () => {
  afterEach(() => resetCatalogoPlanes())

  const catalogoDemo = {
    planes: [
      { codigo: '662', nombre: '662 Profesorado de Música', disponible: true },
      { codigo: '662G', nombre: '662G Guitarra', disponible: false }
    ]
  }

  it('resuelve un código canónico usando el mapa de nombres', () => {
    setCatalogoPlanes(catalogoDemo)
    expect(resolverCodigoPlan('662', { '662': '662 Profesorado de Música' })).toEqual({
      codigo: '662',
      nombre: '662 Profesorado de Música'
    })
  })

  it('resuelve un plan no disponible: no gatea', () => {
    setCatalogoPlanes(catalogoDemo)
    expect(resolverCodigoPlan('662G', {})).toEqual({ codigo: '662G', nombre: '662G' })
  })

  it('resuelve el alias legacy "62G" → "662G"', () => {
    setCatalogoPlanes(catalogoDemo)
    expect(resolverCodigoPlan('62G', {})).toEqual({ codigo: '662G', nombre: '662G' })
  })

  it('resuelve por nombre completo v1', () => {
    setCatalogoPlanes(catalogoDemo)
    expect(resolverCodigoPlan('662 Profesorado de Música', { '662': '662 Profesorado de Música' })).toEqual({
      codigo: '662',
      nombre: '662 Profesorado de Música'
    })
  })

  it('devuelve null si no se puede resolver', () => {
    setCatalogoPlanes(catalogoDemo)
    expect(resolverCodigoPlan('999', {})).toBeNull()
    expect(resolverCodigoPlan('', {})).toBeNull()
    expect(resolverCodigoPlan(null, {})).toBeNull()
  })
})

describe('validarPlanDetalle', () => {
  afterEach(() => resetCatalogoPlanes())

  /** Falso `fetch` que resuelve un JSON con `ok: true`. */
  const fetchJson = (json) => async () => ({ ok: true, json: async () => json })

  const catalogoDemo = {
    planes: [{ codigo: '999', nombre: '999', disponible: true }]
  }

  it('devuelve no disponible si el plan no está en el catálogo', async () => {
    setCatalogoPlanes(catalogoDemo)
    const res = await validarPlanDetalle('662G', { fetchImpl: fetchJson({}) })
    expect(res.disponible).toBe(false)
    expect(res.motivo).toContain('no está disponible')
    expect(res.plan).toBeNull()
  })

  it('reporta catálogo no cargado sin intentar resolver el plan', async () => {
    resetCatalogoPlanes()
    let llamadas = 0
    const res = await validarPlanDetalle('662', {
      fetchImpl: async () => {
        llamadas++
        return fetchJson({})()
      }
    })
    expect(res.disponible).toBe(false)
    expect(res.motivo).toContain('catálogo de planes no está cargado')
    expect(llamadas).toBe(0)
  })

  it('normaliza el detalle y devuelve el plan', async () => {
    setCatalogoPlanes(catalogoDemo)
    const json = { plan: '999', materias: { '999-0.1': { nombre: 'Inicial' } } }
    const res = await validarPlanDetalle('999', { fetchImpl: fetchJson(json) })
    expect(res.disponible).toBe(true)
    expect(res.motivo).toBeNull()
    expect(res.plan.plan).toBe('999')
    expect(Object.keys(res.plan.materias)).toEqual(['999-0.1'])
  })

  it('si el catálogo dice disponible pero el detalle no normaliza, gana el detalle', async () => {
    setCatalogoPlanes(catalogoDemo)
    const json = { plan: '888', materias: { '999-0.1': { nombre: 'Inicial' } } }
    const res = await validarPlanDetalle('999', { fetchImpl: fetchJson(json) })
    expect(res.disponible).toBe(false)
    expect(res.motivo).toContain('888')
  })

  it('cachea el resultado por código (un solo fetch)', async () => {
    setCatalogoPlanes(catalogoDemo)
    let llamadas = 0
    const fetchImpl = async () => {
      llamadas++
      return { ok: true, json: async () => ({ plan: '999', materias: { '999-0.1': { nombre: 'X' } } }) }
    }
    await validarPlanDetalle('999', { fetchImpl })
    await validarPlanDetalle('999', { fetchImpl })
    expect(llamadas).toBe(1)
  })

  it('reporta error de red sin lanzar', async () => {
    setCatalogoPlanes(catalogoDemo)
    const fetchImpl = async () => {
      throw new Error('boom')
    }
    const res = await validarPlanDetalle('999', { fetchImpl })
    expect(res.disponible).toBe(false)
    expect(res.motivo).toContain('boom')
  })

  it('reporta respuesta HTTP fallida', async () => {
    setCatalogoPlanes(catalogoDemo)
    const fetchImpl = async () => ({ ok: false, json: async () => ({}) })
    const res = await validarPlanDetalle('999', { fetchImpl })
    expect(res.disponible).toBe(false)
    expect(res.motivo).toContain('999')
  })
})
