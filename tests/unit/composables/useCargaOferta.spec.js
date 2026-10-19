/**
 * Tests unitarios para useCargaOferta.js
 *
 * Valida:
 * - El agrupado de filas del CSV en etapas → materias → comisiones
 * - El parseo de fechas de período (YYYY-MM-DD) al inicio/fin del día
 * - La validación temprana (falla antes de escribir)
 * - La escritura de un único documento de ciclo vía writeBatch
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockBatch, mockWriteBatch, mockDoc, mockServerTimestamp } = vi.hoisted(() => {
  const mockBatch = { set: vi.fn(), delete: vi.fn(), commit: vi.fn() }
  return {
    mockBatch,
    mockWriteBatch: vi.fn(() => mockBatch),
    mockDoc: vi.fn((_db, coleccion, id) => ({ path: `${coleccion}/${id}` })),
    mockServerTimestamp: vi.fn(() => 'SERVER_TIMESTAMP')
  }
})

vi.mock('firebase/firestore/lite', () => ({
  doc: mockDoc,
  writeBatch: mockWriteBatch,
  serverTimestamp: mockServerTimestamp
}))

vi.mock('@/config/firebase.js', () => ({ db: {} }))

import { useCargaOferta, construirOfertaDesdeCSV } from '@/composables/inscripciones/useCargaOferta.js'

const CABECERA =
  'ciclo_lectivo,materia_codigo,materia_nombre,secuencia_codigo,cupo,horario,aula,docente_nombre,periodo_inicio,periodo_fin'

const CSV_VALIDO = `${CABECERA}
2026-1,AUD01,Audioperceptiva I,0465,20,"Lun 16:30 a 18:30","Aula PB 01","Ceballos, O.",2026-02-01,2026-02-07
2026-1,AUD01,Audioperceptiva I,0463,20,"Mar 11:00 a 13:00","Aula PB 05","Ceballos, O.",2026-02-01,2026-02-07
2026-1,ARR02,Arreglos II,1224,15,"Mar 12:30 a 13:50","Aula PB 18","Suarez, M.",2026-02-08,2026-02-14`

describe('useCargaOferta', () => {
  beforeEach(() => {
    mockBatch.set.mockReturnValue(undefined)
    mockBatch.delete.mockReturnValue(undefined)
    mockBatch.commit.mockResolvedValue(undefined)
    mockWriteBatch.mockReturnValue(mockBatch)
  })

  describe('construirOfertaDesdeCSV', () => {
    it('debe agrupar en etapas por rango de fechas y en materias por código', () => {
      const resultado = construirOfertaDesdeCSV(CSV_VALIDO)

      expect(resultado.exito).toBe(true)
      expect(resultado.ciclo).toBe('2026-1')
      expect(resultado.etapas).toHaveLength(2)

      const primera = resultado.etapas[0]
      expect(primera.nombre).toBe('Inscripciones')
      expect(primera.desde).toBeInstanceOf(Date)
      expect(primera.hasta).toBeInstanceOf(Date)
      expect(primera.materias).toHaveLength(1)
      expect(primera.materias[0].id).toBe('AUD01')
      expect(primera.materias[0].comisiones).toHaveLength(2)
      // El parser respetó la coma dentro de las comillas del docente
      expect(primera.materias[0].comisiones[0].docente).toBe('Ceballos, O.')
    })

    it('debe usar el ciclo pasado por parámetro si el CSV no trae la columna', () => {
      const csv = `materia_codigo,secuencia_codigo,horario,periodo_inicio,periodo_fin\nMAT01,0001,"Lun 10:00 a 12:00",2026-08-01,2026-08-07`
      const resultado = construirOfertaDesdeCSV(csv, { ciclo: '2026-2' })

      expect(resultado.exito).toBe(true)
      expect(resultado.ciclo).toBe('2026-2')
    })

    it('debe exigir las fechas de período (obligatorias para useOfertaAcademica)', () => {
      const csv = `materia_codigo,secuencia_codigo,ciclo_lectivo,horario\nMAT01,0001,2026-1,"Lun 10:00 a 12:00"`
      const resultado = construirOfertaDesdeCSV(csv)

      expect(resultado.exito).toBe(false)
      expect(resultado.errores[0].detalle).toContain('Faltan periodo_inicio y periodo_fin (obligatorios)')
    })

    it('debe rechazar filas sin materia_codigo o sin secuencia_codigo', () => {
      const csv = `materia_codigo,secuencia_codigo,ciclo_lectivo\n,0001,2026-1`
      const resultado = construirOfertaDesdeCSV(csv)

      expect(resultado.exito).toBe(false)
      expect(resultado.errores).toHaveLength(1)
      expect(resultado.errores[0].detalle).toContain('Falta materia_codigo')
    })

    it('debe rechazar un período con fechas invertidas', () => {
      const csv = `materia_codigo,secuencia_codigo,ciclo_lectivo,periodo_inicio,periodo_fin\nMAT01,0001,2026-1,2026-02-10,2026-02-01`
      const resultado = construirOfertaDesdeCSV(csv)

      expect(resultado.exito).toBe(false)
      expect(resultado.errores[0].detalle).toContain('periodo_fin no puede ser anterior a periodo_inicio')
    })
  })

  describe('cargarOfertaDesdeCSV', () => {
    it('debe escribir el documento del ciclo en un único batch y devolver los conteos', async () => {
      const { cargarOfertaDesdeCSV } = useCargaOferta()

      const resultado = await cargarOfertaDesdeCSV(CSV_VALIDO, { ciclo: '2026-1' })

      expect(resultado.exito).toBe(true)
      expect(resultado.datos.etapas).toBe(2)
      expect(resultado.datos.materias).toBe(2)
      expect(resultado.datos.comisiones).toBe(3)
      expect(mockBatch.set).toHaveBeenCalledTimes(1)
      expect(mockBatch.set.mock.calls[0][0]).toEqual({ path: 'ofertaAcademica/2026-1' })
      expect(mockBatch.commit).toHaveBeenCalledTimes(1)
    })

    it('NO debe escribir si el CSV es inválido', async () => {
      const { cargarOfertaDesdeCSV } = useCargaOferta()

      const resultado = await cargarOfertaDesdeCSV('materia_codigo,secuencia_codigo,ciclo_lectivo\n,0001,2026-1')

      expect(resultado.exito).toBe(false)
      expect(mockBatch.set).not.toHaveBeenCalled()
      expect(mockBatch.commit).not.toHaveBeenCalled()
    })
  })

  describe('borrarOferta', () => {
    it('debe borrar el documento del ciclo', async () => {
      const { borrarOferta } = useCargaOferta()

      const resultado = await borrarOferta('2026-1')

      expect(resultado.exito).toBe(true)
      expect(mockBatch.delete).toHaveBeenCalledTimes(1)
      expect(mockBatch.delete.mock.calls[0][0]).toEqual({ path: 'ofertaAcademica/2026-1' })
      expect(mockBatch.commit).toHaveBeenCalledTimes(1)
    })
  })
})
