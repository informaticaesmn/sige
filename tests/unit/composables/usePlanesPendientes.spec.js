/**
 * Tests unitarios para usePlanesPendientes.js (v3: jsonTexto + estadoRevision)
 *
 * Valida:
 * - Normalización de documentos (Timestamp → Date, defaults, estadoRevision)
 * - Listado ordenado por fecha de actualización
 * - Lectura de un borrador (jsonTexto) con fallback a csvTexto
 * - Validaciones antes de escribir (código, JSON vacío, tamaño máximo)
 * - Escritura con merge (no pisa campos administrados por otro flujo)
 * - Cambio de estado de revisión (marcar listo / volver a edición)
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
  ESTADO_REVISION_DEFAULT,
  ESTADOS_REVISION,
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

    it('debe default-ear estadoRevision a "en_edicion" y auditoría vacía', () => {
      const resultado = normalizarPlanPendiente('663', {})

      expect(resultado.estadoRevision).toBe(ESTADO_REVISION_DEFAULT)
      expect(resultado.listoParaPublicarEn).toBeNull()
      expect(resultado.listoParaPublicarPor).toBe('')
      expect(resultado.publicadoEn).toBeNull()
    })

    it('debe respetar un estadoRevision válido y descartar uno inválido', () => {
      const valido = normalizarPlanPendiente('663', { estadoRevision: 'listo_para_publicar' })
      const invalido = normalizarPlanPendiente('663', { estadoRevision: 'cualquier_cosa' })

      expect(valido.estadoRevision).toBe('listo_para_publicar')
      expect(invalido.estadoRevision).toBe(ESTADO_REVISION_DEFAULT)
    })

    it('debe convertir la auditoría de "listo para publicar" a Date', () => {
      const fecha = '2026-11-02T12:00:00.000Z'
      const resultado = normalizarPlanPendiente('663', {
        estadoRevision: 'listo_para_publicar',
        listoParaPublicarEn: timestamp(fecha),
        listoParaPublicarPor: 'uid-admin'
      })

      expect(resultado.listoParaPublicarEn).toBeInstanceOf(Date)
      expect(resultado.listoParaPublicarEn.toISOString()).toBe(fecha)
      expect(resultado.listoParaPublicarPor).toBe('uid-admin')
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

    it('debe escribir con { merge: true } para no pisar campos de otro flujo', async () => {
      const { guardarPlanPendiente } = usePlanesPendientes()
      await guardarPlanPendiente({ codigo: '663', jsonTexto: '{"plan": "663"}' })

      const opciones = mockSetDoc.mock.calls[0][2]
      expect(opciones).toEqual({ merge: true })
    })

    it('NO debe incluir estadoRevision si no se pasa (lo preserva el merge)', async () => {
      const { guardarPlanPendiente } = usePlanesPendientes()
      await guardarPlanPendiente({ codigo: '663', jsonTexto: '{"plan": "663"}' })

      const documento = mockSetDoc.mock.calls[0][1]
      expect(documento).not.toHaveProperty('estadoRevision')
    })

    it('debe incluir estadoRevision si se pasa un valor válido', async () => {
      const { guardarPlanPendiente } = usePlanesPendientes()
      await guardarPlanPendiente({
        codigo: '663',
        jsonTexto: '{"plan": "663"}',
        estadoRevision: 'revision'
      })

      const documento = mockSetDoc.mock.calls[0][1]
      expect(documento.estadoRevision).toBe('revision')
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

  describe('actualizarEstadoRevision / marcarListoParaPublicar / volverARevision', () => {
    it('debe rechazar un estado inválido sin escribir', async () => {
      const { actualizarEstadoRevision } = usePlanesPendientes()
      const resultado = await actualizarEstadoRevision('663', 'inventado')

      expect(resultado.exito).toBe(false)
      expect(resultado.error.message).toContain('inválido')
      expect(mockSetDoc).not.toHaveBeenCalled()
    })

    it('debe rechazar si falta el código sin escribir', async () => {
      const { actualizarEstadoRevision } = usePlanesPendientes()
      const resultado = await actualizarEstadoRevision('', 'revision')

      expect(resultado.exito).toBe(false)
      expect(mockSetDoc).not.toHaveBeenCalled()
    })

    it('marcarListoParaPublicar setea estado y auditoría con merge', async () => {
      const { marcarListoParaPublicar } = usePlanesPendientes()
      const resultado = await marcarListoParaPublicar('663', {
        uid: 'uid-admin',
        email: 'admin@test.com'
      })

      expect(resultado.exito).toBe(true)
      expect(resultado.datos).toEqual({ codigo: '663', estadoRevision: 'listo_para_publicar' })

      const [, documento, opciones] = mockSetDoc.mock.calls[0]
      expect(opciones).toEqual({ merge: true })
      expect(documento).toMatchObject({
        estadoRevision: 'listo_para_publicar',
        listoParaPublicarPor: 'uid-admin',
        listoParaPublicarEn: 'SERVER_TIMESTAMP',
        actualizadoPor: 'uid-admin',
        actualizadoPorEmail: 'admin@test.com'
      })
    })

    it('volverARevision limpia la auditoría de "listo para publicar"', async () => {
      const { volverARevision } = usePlanesPendientes()
      const resultado = await volverARevision('663', { uid: 'uid-coord' })

      expect(resultado.exito).toBe(true)
      expect(resultado.datos).toEqual({ codigo: '663', estadoRevision: 'en_edicion' })

      const documento = mockSetDoc.mock.calls[0][1]
      expect(documento).toMatchObject({
        estadoRevision: 'en_edicion',
        listoParaPublicarEn: null,
        listoParaPublicarPor: ''
      })
    })

    it('debe ofrecer los tres estados del flujo', () => {
      expect(ESTADOS_REVISION).toEqual(['en_edicion', 'revision', 'listo_para_publicar'])
    })
  })
})
