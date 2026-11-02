/**
 * Tests unitarios para usePlanesPendientes.js
 *
 * Valida:
 * - Normalización de documentos (Timestamp → Date, defaults)
 * - Listado ordenado por fecha de actualización
 * - Lectura de un CSV guardado (incluye csvTexto)
 * - Validaciones antes de escribir (código, CSV vacío, tamaño máximo)
 * - Escritura/borrado con el SDK lite
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const {
  mockBatch,
  mockCollection,
  mockDoc,
  mockGetDoc,
  mockGetDocs,
  mockSetDoc,
  mockDeleteDoc,
  mockServerTimestamp
} = vi.hoisted(() => {
  return {
    mockCollection: vi.fn((_db, nombre) => ({ path: nombre })),
    mockDoc: vi.fn((_db, coleccion, id) => ({ path: `${coleccion}/${id}` })),
    mockGetDoc: vi.fn(),
    mockGetDocs: vi.fn(),
    mockSetDoc: vi.fn(),
    mockDeleteDoc: vi.fn(),
    mockServerTimestamp: vi.fn(() => 'SERVER_TIMESTAMP')
  }
})

vi.mock('firebase/firestore/lite', () => ({
  collection: mockCollection,
  doc: mockDoc,
  getDoc: mockGetDoc,
  getDocs: mockGetDocs,
  setDoc: mockSetDoc,
  deleteDoc: mockDeleteDoc,
  serverTimestamp: mockServerTimestamp
}))

vi.mock('@/config/firebase.js', () => ({ db: {} }))

import {
  COLECCION_PLANES_PENDIENTES,
  MAX_CSV_BYTES,
  normalizarPlanPendiente,
  usePlanesPendientes
} from '@/composables/academico/usePlanesPendientes.js'

/** Timestamp falso con la misma interfaz que el de Firestore. */
function timestamp(fecha) {
  return { toDate: () => new Date(fecha) }
}

describe('usePlanesPendientes', () => {
  beforeEach(() => {
    mockGetDocs.mockResolvedValue({ docs: [] })
    mockSetDoc.mockResolvedValue(undefined)
    mockDeleteDoc.mockResolvedValue(undefined)
  })

  describe('normalizarPlanPendiente', () => {
    it('debe usar defaults y convertir el Timestamp a Date', () => {
      const fecha = '2026-11-02T12:00:00.000Z'
      const resultado = normalizarPlanPendiente('663', {
        actualizadoEn: timestamp(fecha),
        actualizadoPor: 'uid-1',
        actualizadoPorEmail: 'coord@test.com',
        materiasCount: 42
      })

      expect(resultado.codigo).toBe('663')
      expect(resultado.nombre).toBe('663')
      expect(resultado.materiasCount).toBe(42)
      expect(resultado.actualizadoEn).toBeInstanceOf(Date)
      expect(resultado.actualizadoEn.toISOString()).toBe(fecha)
      expect(resultado.actualizadoPorEmail).toBe('coord@test.com')
    })

    it('debe devolver null si la fecha no es válida', () => {
      const resultado = normalizarPlanPendiente('662', { actualizadoEn: 'no-es-fecha' })

      expect(resultado.actualizadoEn).toBeNull()
      expect(resultado.materiasCount).toBeNull()
    })
  })

  describe('listarPlanesPendientes', () => {
    it('debe mapear y ordenar los documentos del más reciente al más antiguo', async () => {
      mockGetDocs.mockResolvedValue({
        docs: [
          { id: '662', data: () => ({ nombre: 'Plan 662', actualizadoEn: timestamp('2026-10-01T10:00:00Z') }) },
          { id: '663', data: () => ({ nombre: 'Plan 663', actualizadoEn: timestamp('2026-11-01T10:00:00Z') }) }
        ]
      })

      const { listarPlanesPendientes } = usePlanesPendientes()
      const resultado = await listarPlanesPendientes()

      expect(resultado.exito).toBe(true)
      expect(resultado.datos.map((p) => p.codigo)).toEqual(['663', '662'])
      expect(mockCollection).toHaveBeenCalledWith({}, COLECCION_PLANES_PENDIENTES)
    })

    it('debe devolver exito=false si Firestore falla', async () => {
      mockGetDocs.mockRejectedValue(new Error('sin conexión'))

      const { listarPlanesPendientes } = usePlanesPendientes()
      const resultado = await listarPlanesPendientes()

      expect(resultado.exito).toBe(false)
      expect(resultado.datos).toEqual([])
      expect(resultado.error.message).toBe('sin conexión')
    })
  })

  describe('obtenerPlanPendiente', () => {
    it('debe devolver el csvTexto guardado', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: '663',
        data: () => ({
          codigo: '663',
          nombre: 'Plan 663',
          csvTexto: 'Plan,Cod\n663,0.1',
          actualizadoEn: timestamp('2026-11-01T10:00:00Z')
        })
      })

      const { obtenerPlanPendiente } = usePlanesPendientes()
      const resultado = await obtenerPlanPendiente('663')

      expect(resultado.exito).toBe(true)
      expect(resultado.datos.codigo).toBe('663')
      expect(resultado.datos.csvTexto).toBe('Plan,Cod\n663,0.1')
      expect(mockDoc).toHaveBeenCalledWith({}, COLECCION_PLANES_PENDIENTES, '663')
    })

    it('debe fallar si el documento no existe', async () => {
      mockGetDoc.mockResolvedValue({ exists: () => false })

      const { obtenerPlanPendiente } = usePlanesPendientes()
      const resultado = await obtenerPlanPendiente('999')

      expect(resultado.exito).toBe(false)
      expect(resultado.error.message).toContain('No hay un CSV guardado')
    })

    it('debe fallar si no se pasa código', async () => {
      const { obtenerPlanPendiente } = usePlanesPendientes()
      const resultado = await obtenerPlanPendiente('')

      expect(resultado.exito).toBe(false)
      expect(mockGetDoc).not.toHaveBeenCalled()
    })
  })

  describe('guardarPlanPendiente', () => {
    it('debe escribir el documento con metadata y serverTimestamp', async () => {
      const { guardarPlanPendiente } = usePlanesPendientes()
      const resultado = await guardarPlanPendiente({
        codigo: '663',
        nombre: 'Plan 663',
        csvTexto: 'Plan,Cod\n663,0.1',
        materiasCount: 1,
        uid: 'uid-coord',
        email: 'coord@test.com'
      })

      expect(resultado.exito).toBe(true)
      expect(mockSetDoc).toHaveBeenCalledTimes(1)

      const [referencia, documento] = mockSetDoc.mock.calls[0]
      expect(referencia).toEqual({ path: `${COLECCION_PLANES_PENDIENTES}/663` })
      expect(documento).toMatchObject({
        codigo: '663',
        nombre: 'Plan 663',
        csvTexto: 'Plan,Cod\n663,0.1',
        materiasCount: 1,
        actualizadoEn: 'SERVER_TIMESTAMP',
        actualizadoPor: 'uid-coord',
        actualizadoPorEmail: 'coord@test.com'
      })
    })

    it('NO debe escribir si falta el código o el CSV', async () => {
      const { guardarPlanPendiente } = usePlanesPendientes()

      const sinCodigo = await guardarPlanPendiente({ csvTexto: 'x' })
      const sinCSV = await guardarPlanPendiente({ codigo: '663', csvTexto: '   ' })

      expect(sinCodigo.exito).toBe(false)
      expect(sinCSV.exito).toBe(false)
      expect(mockSetDoc).not.toHaveBeenCalled()
    })

    it('NO debe escribir si el CSV supera el tamaño máximo', async () => {
      const { guardarPlanPendiente } = usePlanesPendientes()
      const resultado = await guardarPlanPendiente({
        codigo: '663',
        csvTexto: 'x'.repeat(MAX_CSV_BYTES + 1)
      })

      expect(resultado.exito).toBe(false)
      expect(resultado.error.message).toContain('tamaño máximo')
      expect(mockSetDoc).not.toHaveBeenCalled()
    })

    it('debe devolver exito=false si Firestore falla', async () => {
      mockSetDoc.mockRejectedValue(new Error('permiso denegado'))

      const { guardarPlanPendiente } = usePlanesPendientes()
      const resultado = await guardarPlanPendiente({ codigo: '663', csvTexto: 'x' })

      expect(resultado.exito).toBe(false)
      expect(resultado.error.message).toBe('permiso denegado')
    })
  })

  describe('eliminarPlanPendiente', () => {
    it('debe borrar el documento del plan', async () => {
      const { eliminarPlanPendiente } = usePlanesPendientes()
      const resultado = await eliminarPlanPendiente('663')

      expect(resultado.exito).toBe(true)
      expect(mockDeleteDoc).toHaveBeenCalledWith({ path: `${COLECCION_PLANES_PENDIENTES}/663` })
    })

    it('debe fallar si no se pasa código', async () => {
      const { eliminarPlanPendiente } = usePlanesPendientes()
      const resultado = await eliminarPlanPendiente('')

      expect(resultado.exito).toBe(false)
      expect(mockDeleteDoc).not.toHaveBeenCalled()
    })
  })
})
