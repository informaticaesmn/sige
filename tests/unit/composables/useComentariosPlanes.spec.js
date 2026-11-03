/**
 * Tests unitarios para useComentariosPlanes.js
 *
 * Valida:
 * - Normalización de comentarios (tipos, defaults, Timestamp → Date).
 * - Listado ordenado por fecha de creación.
 * - Alta con validaciones (texto vacío, largo máximo, tipo inválido, falta de código).
 * - Resolver / reabrir (updateDoc).
 * - Eliminación (deleteDoc).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetDocs, mockAddDoc, mockUpdateDoc, mockDeleteDoc } = vi.hoisted(() => ({
  mockGetDocs: vi.fn(),
  mockAddDoc: vi.fn(),
  mockUpdateDoc: vi.fn(),
  mockDeleteDoc: vi.fn()
}))

vi.mock('firebase/firestore/lite', () => ({
  collection: vi.fn((_db, ...segmentos) => ({ path: segmentos.join('/') })),
  doc: vi.fn((_db, ...segmentos) => ({ path: segmentos.join('/') })),
  getDocs: mockGetDocs,
  addDoc: mockAddDoc,
  updateDoc: mockUpdateDoc,
  deleteDoc: mockDeleteDoc,
  serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP')
}))

vi.mock('@/config/firebase.js', () => ({ db: {} }))

import {
  MAX_TEXTO_COMENTARIO,
  TIPOS_COMENTARIO,
  normalizarComentario,
  useComentariosPlanes
} from '@/composables/academico/useComentariosPlanes.js'

/** Timestamp falso con la misma interfaz que el de Firestore. */
function timestamp(fecha) {
  return { toDate: () => new Date(fecha) }
}

describe('useComentariosPlanes', () => {
  beforeEach(() => {
    mockGetDocs.mockResolvedValue({ docs: [] })
    mockAddDoc.mockResolvedValue({ id: 'nuevo-id' })
    mockUpdateDoc.mockResolvedValue(undefined)
    mockDeleteDoc.mockResolvedValue(undefined)
    vi.clearAllMocks()
  })

  describe('normalizarComentario', () => {
    it('debe usar defaults y convertir Timestamps a Date', () => {
      const fecha = '2026-11-02T12:00:00.000Z'
      const comentario = normalizarComentario('c1', {
        texto: 'Chequear correlativa',
        creadoEn: timestamp(fecha),
        autorEmail: 'coord@test.com'
      })

      expect(comentario.id).toBe('c1')
      expect(comentario.texto).toBe('Chequear correlativa')
      expect(comentario.materiaId).toBeNull()
      expect(comentario.tipo).toBe('nota')
      expect(comentario.creadoEn).toBeInstanceOf(Date)
      expect(comentario.creadoEn.toISOString()).toBe(fecha)
      expect(comentario.resuelto).toBe(false)
      expect(comentario.resueltoEn).toBeNull()
      expect(comentario.autorEmail).toBe('coord@test.com')
    })

    it('debe descartar un tipo desconocido y conservar el resto', () => {
      const comentario = normalizarComentario('c2', {
        texto: 'x',
        materiaId: '663-0.1',
        tipo: 'inventado',
        resuelto: true,
        resueltoPor: 'uid-1',
        resueltoEn: timestamp('2026-11-03T10:00:00Z')
      })

      expect(comentario.tipo).toBe('nota')
      expect(comentario.materiaId).toBe('663-0.1')
      expect(comentario.resuelto).toBe(true)
      expect(comentario.resueltoPor).toBe('uid-1')
      expect(comentario.resueltoEn).toBeInstanceOf(Date)
    })
  })

  describe('listarComentarios', () => {
    it('debe ordenar del más antiguo al más nuevo', async () => {
      mockGetDocs.mockResolvedValue({
        docs: [
          { id: 'b', data: () => ({ texto: 'segundo', creadoEn: timestamp('2026-11-02T10:00:00Z') }) },
          { id: 'a', data: () => ({ texto: 'primero', creadoEn: timestamp('2026-11-01T10:00:00Z') }) }
        ]
      })

      const { listarComentarios } = useComentariosPlanes()
      const resultado = await listarComentarios('663')

      expect(resultado.exito).toBe(true)
      expect(resultado.datos.map((c) => c.id)).toEqual(['a', 'b'])
    })

    it('debe fallar si falta el código del plan', async () => {
      const { listarComentarios } = useComentariosPlanes()
      const resultado = await listarComentarios('')

      expect(resultado.exito).toBe(false)
      expect(resultado.datos).toEqual([])
      expect(mockGetDocs).not.toHaveBeenCalled()
    })
  })

  describe('agregarComentario', () => {
    it('debe crear el comentario con autor, tipo y Timestamp', async () => {
      const { agregarComentario } = useComentariosPlanes()
      const resultado = await agregarComentario('663', {
        texto: '  Falta equivalencia  ',
        materiaId: '663-0.1',
        tipo: 'chequear',
        uid: 'uid-coord',
        email: 'coord@test.com'
      })

      expect(resultado.exito).toBe(true)
      expect(resultado.datos).toEqual({ id: 'nuevo-id' })

      const [, documento] = mockAddDoc.mock.calls[0]
      expect(documento).toMatchObject({
        texto: 'Falta equivalencia',
        materiaId: '663-0.1',
        tipo: 'chequear',
        autor: 'uid-coord',
        autorEmail: 'coord@test.com',
        creadoEn: 'SERVER_TIMESTAMP',
        resuelto: false
      })
    })

    it('debe aceptar un comentario general (materiaId null)', async () => {
      const { agregarComentario } = useComentariosPlanes()
      await agregarComentario('663', { texto: 'General', uid: 'uid-1' })

      const documento = mockAddDoc.mock.calls[0][1]
      expect(documento.materiaId).toBeNull()
      expect(documento.tipo).toBe('nota')
    })

    it('NO debe escribir con texto vacío, ni código faltante', async () => {
      const { agregarComentario } = useComentariosPlanes()

      const vacio = await agregarComentario('663', { texto: '   ' })
      const sinCodigo = await agregarComentario('', { texto: 'hola' })

      expect(vacio.exito).toBe(false)
      expect(sinCodigo.exito).toBe(false)
      expect(mockAddDoc).not.toHaveBeenCalled()
    })

    it('NO debe escribir con texto demasiado largo ni tipo inválido', async () => {
      const { agregarComentario } = useComentariosPlanes()

      const largo = await agregarComentario('663', {
        texto: 'x'.repeat(MAX_TEXTO_COMENTARIO + 1)
      })
      const tipoInvalido = await agregarComentario('663', { texto: 'ok', tipo: 'inventado' })

      expect(largo.exito).toBe(false)
      expect(largo.error.message).toContain('caracteres')
      expect(tipoInvalido.exito).toBe(false)
      expect(mockAddDoc).not.toHaveBeenCalled()
    })

    it('debe ofrecer los tipos admitidos', () => {
      expect(TIPOS_COMENTARIO).toEqual(['nota', 'actualizacion', 'chequear', 'listo'])
    })
  })

  describe('resolverComentario / reabrirComentario', () => {
    it('debe marcar el comentario como resuelto', async () => {
      const { resolverComentario } = useComentariosPlanes()
      const resultado = await resolverComentario('663', 'c1', { uid: 'uid-1' })

      expect(resultado.exito).toBe(true)
      const [, cambios] = mockUpdateDoc.mock.calls[0]
      expect(cambios).toMatchObject({
        resuelto: true,
        resueltoPor: 'uid-1',
        resueltoEn: 'SERVER_TIMESTAMP'
      })
    })

    it('debe reabrir un comentario resuelto', async () => {
      const { reabrirComentario } = useComentariosPlanes()
      const resultado = await reabrirComentario('663', 'c1')

      expect(resultado.exito).toBe(true)
      const [, cambios] = mockUpdateDoc.mock.calls[0]
      expect(cambios).toEqual({ resuelto: false, resueltoPor: '', resueltoEn: null })
    })

    it('NO debe actualizar si faltan datos', async () => {
      const { resolverComentario } = useComentariosPlanes()
      const resultado = await resolverComentario('663', '')

      expect(resultado.exito).toBe(false)
      expect(mockUpdateDoc).not.toHaveBeenCalled()
    })
  })

  describe('eliminarComentario', () => {
    it('debe borrar el comentario', async () => {
      const { eliminarComentario } = useComentariosPlanes()
      const resultado = await eliminarComentario('663', 'c1')

      expect(resultado.exito).toBe(true)
      expect(mockDeleteDoc).toHaveBeenCalledTimes(1)
    })

    it('NO debe borrar si faltan datos', async () => {
      const { eliminarComentario } = useComentariosPlanes()
      const resultado = await eliminarComentario('', 'c1')

      expect(resultado.exito).toBe(false)
      expect(mockDeleteDoc).not.toHaveBeenCalled()
    })
  })
})
