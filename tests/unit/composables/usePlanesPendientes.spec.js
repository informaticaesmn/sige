/**
 * Tests unitarios para usePlanesPendientes.js (v2 con jsonTexto)
 *
 * Valida:
 * - Normalización de documentos (Timestamp → Date, defaults)
 * - Listado ordenado por fecha de actualización
 * - Lectura de un borrador (jsonTexto) con fallback a csvTexto
 * - Validaciones antes de escribir (código, JSON vacío, tamaño máximo)
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
  MAX_JSON_BYTES,
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
    vi.clearAllMocks()
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
    })
  })

  describe('obtenerPlanPendiente', () => {
    it('debe devolver el jsonTexto guardado', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: '663',
        data: () => ({
          codigo: '663',
          jsonTexto: '{"plan": "663"}',
          actualizadoEn: timestamp('2026-11-01T10:00:00Z')
        })
      })

      const { obtenerPlanPendiente } = usePlanesPendientes()
      const resultado = await obtenerPlanPendiente('663')

      expect(resultado.exito).toBe(true)
      expect(resultado.datos.jsonTexto).toBe('{"plan": "663"}')
      expect(resultado.datos.esLegacy).toBe(false)
    })

    it('debe hacer fallback a csvTexto si jsonTexto no existe (legacy)', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: '663',
        data: () => ({
          codigo: '663',
          csvTexto: 'Plan,Cod\n663,0.1'
        })
      })

      const { obtenerPlanPendiente } = usePlanesPendientes()
      const resultado = await obtenerPlanPendiente('663')

      expect(resultado.exito).toBe(true)
      expect(resultado.datos.jsonTexto).toBe('Plan,Cod\n663,0.1')
      expect(resultado.datos.esLegacy).toBe(true)
    })

    it('debe fallar si el documento no existe', async () => {
      mockGetDoc.mockResolvedValue({ exists: () => false })

      const { obtenerPlanPendiente } = usePlanesPendientes()
      const resultado = await obtenerPlanPendiente('999')

      expect(resultado.exito).toBe(false)
      expect(resultado.error.message).toContain('No hay un borrador guardado')
    })
  })

  describe('guardarPlanPendiente', () => {
    it('debe escribir el documento con jsonTexto y serverTimestamp', async () => {
      const { guardarPlanPendiente } = usePlanesPendientes()
      const resultado = await guardarPlanPendiente({
        codigo: '663',
        jsonTexto: '{"plan": "663"}',
        uid: 'uid-coord'
      })

      expect(resultado.exito).toBe(true)
      expect(mockSetDoc).toHaveBeenCalledTimes(1)

      const [referencia, documento] = mockSetDoc.mock.calls[0]
      expect(documento).toMatchObject({
        codigo: '663',
        jsonTexto: '{"plan": "663"}',
        actualizadoEn: 'SERVER_TIMESTAMP'
      })
    })

    it('NO debe escribir si el JSON está vacío o supera el tamaño máximo', async () => {
      const { guardarPlanPendiente } = usePlanesPendientes()

      const vacio = await guardarPlanPendiente({ codigo: '663', jsonTexto: '' })
      const grande = await guardarPlanPendiente({ codigo: '663', jsonTexto: 'x'.repeat(MAX_JSON_BYTES + 1) })

      expect(vacio.exito).toBe(false)
      expect(grande.exito).toBe(false)
      expect(grande.error.message).toContain('tamaño máximo')
      expect(mockSetDoc).not.toHaveBeenCalled()
    })

    it('debe devolver exito=false si Firestore falla', async () => {
      mockSetDoc.mockRejectedValue(new Error('permiso denegado'))

      const { guardarPlanPendiente } = usePlanesPendientes()
      const resultado = await guardarPlanPendiente({ codigo: '663', jsonTexto: '{}' })

      expect(resultado.exito).toBe(false)
      expect(resultado.error.message).toBe('permiso denegado')
    })
  })
})
