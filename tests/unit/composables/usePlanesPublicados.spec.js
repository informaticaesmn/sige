/**
 * Tests unitarios para usePlanesPublicados.js (Fase 2, E1)
 *
 * Valida:
 * - Normalización de documentos (Timestamps → Date, defaults).
 * - Parseo/validación del detalle antes de publicar.
 * - Listado ordenado y lectura por código.
 * - Publicación con `version++`, auditoría y `disponible`.
 * - Armado de la vidriera (catálogo + detalles) y aborto ante JSON inválido.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockCollection, mockDoc, mockGetDoc, mockGetDocs, mockSetDoc, mockServerTimestamp } =
  vi.hoisted(() => ({
    mockCollection: vi.fn((_db, nombre) => ({ path: nombre })),
    mockDoc: vi.fn((_db, coleccion, id) => ({ path: `${coleccion}/${id}` })),
    mockGetDoc: vi.fn(),
    mockGetDocs: vi.fn(),
    mockSetDoc: vi.fn(),
    mockServerTimestamp: vi.fn(() => 'SERVER_TIMESTAMP')
  }))

vi.mock('firebase/firestore/lite', () => ({
  collection: mockCollection,
  doc: mockDoc,
  getDoc: mockGetDoc,
  getDocs: mockGetDocs,
  setDoc: mockSetDoc,
  serverTimestamp: mockServerTimestamp
}))

vi.mock('@/config/firebase.js', () => ({ db: {} }))

import {
  COLECCION_PLANES_PUBLICADOS,
  normalizarPlanPublicado,
  parsearJsonPublicable,
  usePlanesPublicados
} from '@/composables/academico/usePlanesPublicados.js'

/** Timestamp falso con la misma interfaz que el de Firestore. */
function timestamp(fecha) {
  return { toDate: () => new Date(fecha) }
}

/** Detalle mínimo válido para publicar. */
function jsonDetalle(codigo = '663') {
  return JSON.stringify({
    plan: codigo,
    nombre: `Plan ${codigo}`,
    materias: { [`${codigo}-1.1`]: { anio: 1, nombre: 'Materia' } }
  })
}

/** Snapshot falso de Firestore. */
function snapshot(id, data) {
  return { id, exists: () => true, data: () => data }
}

/** Snapshot falso de un documento inexistente. */
function snapshotVacio() {
  return { exists: () => false, data: () => ({}) }
}

describe('usePlanesPublicados', () => {
  beforeEach(() => {
    mockGetDocs.mockResolvedValue({ docs: [] })
    mockGetDoc.mockResolvedValue(snapshotVacio())
    mockSetDoc.mockResolvedValue(undefined)
    vi.clearAllMocks()
  })

  describe('normalizarPlanPublicado', () => {
    it('debe usar defaults y convertir los Timestamps a Date', () => {
      const fecha = '2026-11-13T12:00:00.000Z'
      const plan = normalizarPlanPublicado('663', {
        publicadoEn: timestamp(fecha),
        publicadoPor: 'uid-admin',
        publicadoPorEmail: 'admin@test.com',
        version: 2,
        disponible: true,
        materiasCount: 42
      })

      expect(plan.codigo).toBe('663')
      expect(plan.nombre).toBe('663')
      expect(plan.disponible).toBe(true)
      expect(plan.jsonTexto).toBe('')
      expect(plan.version).toBe(2)
      expect(plan.publicadoEn).toBeInstanceOf(Date)
      expect(plan.publicadoEn.toISOString()).toBe(fecha)
      expect(plan.publicadoPor).toBe('uid-admin')
      expect(plan.publicadoPorEmail).toBe('admin@test.com')
      expect(plan.materiasCount).toBe(42)
      expect(plan.origenActualizadoEn).toBeNull()
    })

    it('debe normalizar una versión inválida a 0 y disponible a false', () => {
      const plan = normalizarPlanPublicado('663', { version: '2', disponible: 'si' })

      expect(plan.version).toBe(0)
      expect(plan.disponible).toBe(false)
      expect(plan.materiasCount).toBeNull()
    })
  })

  describe('parsearJsonPublicable', () => {
    it('debe devolver el JSON cuando el detalle es válido', () => {
      const json = parsearJsonPublicable('663', jsonDetalle('663'))

      expect(json.plan).toBe('663')
      expect(Object.keys(json.materias)).toHaveLength(1)
    })

    it('debe rechazar un JSON no parseable', () => {
      expect(() => parsearJsonPublicable('663', '{no-es-json')).toThrow(
        'El JSON del plan no es parseable.'
      )
    })

    it('debe rechazar un JSON que declara otro plan', () => {
      expect(() => parsearJsonPublicable('663', jsonDetalle('664'))).toThrow(
        'El JSON declara el plan 664 y se intenta publicar como 663.'
      )
    })

    it('debe rechazar un detalle sin materias', () => {
      const sinMaterias = JSON.stringify({ plan: '663', materias: {} })

      expect(() => parsearJsonPublicable('663', sinMaterias)).toThrow(
        'El JSON del plan no tiene materias.'
      )
    })

    it('debe rechazar un JSON que no es un objeto', () => {
      expect(() => parsearJsonPublicable('663', '[]')).toThrow(
        'El JSON del plan debe ser un objeto.'
      )
    })
  })

  describe('listarPlanesPublicados', () => {
    it('debe listar ordenado por código con los campos normalizados', async () => {
      mockGetDocs.mockResolvedValue({
        docs: [
          snapshot('708', { codigo: '708', nombre: 'Sonido', version: 1 }),
          snapshot('662', { codigo: '662', nombre: 'Música', version: 3, disponible: true })
        ]
      })

      const { exito, datos } = await usePlanesPublicados().listarPlanesPublicados()

      expect(exito).toBe(true)
      expect(datos.map((plan) => plan.codigo)).toEqual(['662', '708'])
      expect(datos[0].version).toBe(3)
      expect(datos[0].disponible).toBe(true)
    })

    it('debe devolver error y lista vacía si falla la lectura', async () => {
      const fallo = new Error('sin permisos')
      mockGetDocs.mockRejectedValue(fallo)

      const { exito, datos, error } = await usePlanesPublicados().listarPlanesPublicados()

      expect(exito).toBe(false)
      expect(datos).toEqual([])
      expect(error).toBe(fallo)
    })
  })

  describe('obtenerPlanPublicado', () => {
    it('debe exigir el código sin llamar a Firestore', async () => {
      const { exito, error } = await usePlanesPublicados().obtenerPlanPublicado('  ')

      expect(exito).toBe(false)
      expect(error.message).toBe('Falta el código del plan.')
      expect(mockGetDoc).not.toHaveBeenCalled()
    })

    it('debe devolver error si el plan no está publicado', async () => {
      const { exito, datos, error } = await usePlanesPublicados().obtenerPlanPublicado('999')

      expect(exito).toBe(false)
      expect(datos).toBeNull()
      expect(error.message).toBe('El plan 999 no está publicado.')
    })

    it('debe devolver el plan publicado normalizado', async () => {
      mockGetDoc.mockResolvedValue(
        snapshot('663', {
          codigo: '663',
          nombre: 'Plan 663',
          version: 2,
          jsonTexto: jsonDetalle('663'),
          disponible: true
        })
      )

      const { exito, datos } = await usePlanesPublicados().obtenerPlanPublicado('663')

      expect(exito).toBe(true)
      expect(datos.codigo).toBe('663')
      expect(datos.version).toBe(2)
      expect(datos.disponible).toBe(true)
      expect(datos.jsonTexto).toContain('663-1.1')
    })
  })

  describe('publicarPlan', () => {
    it('debe validar código, usuario, JSON y tamaño antes de escribir', async () => {
      const composable = usePlanesPublicados()

      const sinCodigo = await composable.publicarPlan({ uid: 'admin-1', jsonTexto: jsonDetalle() })
      expect(sinCodigo.error.message).toBe('Falta el código del plan.')

      const sinUsuario = await composable.publicarPlan({ codigo: '663', jsonTexto: jsonDetalle() })
      expect(sinUsuario.error.message).toBe('Falta el usuario que publica.')

      const sinJson = await composable.publicarPlan({ codigo: '663', uid: 'admin-1', jsonTexto: '  ' })
      expect(sinJson.error.message).toBe('El JSON del plan está vacío.')

      const gigante = await composable.publicarPlan({
        codigo: '663',
        uid: 'admin-1',
        jsonTexto: 'x'.repeat(1_000_001)
      })
      expect(gigante.error.message).toBe('El plan supera el tamaño máximo permitido (1 MB).')

      expect(mockSetDoc).not.toHaveBeenCalled()
    })

    it('debe publicar como versión 1 cuando el plan es nuevo', async () => {
      const { exito, datos } = await usePlanesPublicados().publicarPlan({
        codigo: '663',
        nombre: 'Plan 663',
        jsonTexto: jsonDetalle('663'),
        disponible: true,
        materiasCount: 42,
        uid: 'admin-1',
        email: 'admin@test.com',
        origenActualizadoEn: new Date('2026-11-12T10:00:00.000Z')
      })

      expect(exito).toBe(true)
      expect(datos).toEqual({ codigo: '663', version: 1 })

      const [referencia, documento] = mockSetDoc.mock.calls[0]
      expect(referencia.path).toBe(`${COLECCION_PLANES_PUBLICADOS}/663`)
      expect(documento.codigo).toBe('663')
      expect(documento.nombre).toBe('Plan 663')
      expect(documento.disponible).toBe(true)
      expect(documento.version).toBe(1)
      expect(documento.publicadoPor).toBe('admin-1')
      expect(documento.publicadoPorEmail).toBe('admin@test.com')
      expect(documento.materiasCount).toBe(42)
      expect(documento.publicadoEn).toBe('SERVER_TIMESTAMP')
      expect(documento.origenActualizadoEn).toBeInstanceOf(Date)
    })

    it('debe incrementar la versión si el plan ya estaba publicado', async () => {
      mockGetDoc.mockResolvedValue(snapshot('663', { version: 4 }))

      const { exito, datos } = await usePlanesPublicados().publicarPlan({
        codigo: '663',
        jsonTexto: jsonDetalle('663'),
        uid: 'admin-1'
      })

      expect(exito).toBe(true)
      expect(datos.version).toBe(5)
      expect(mockSetDoc.mock.calls[0][1].version).toBe(5)
    })

    it('debe devolver error si falla la escritura', async () => {
      const fallo = new Error('sin permisos')
      mockSetDoc.mockRejectedValue(fallo)

      const { exito, datos, error } = await usePlanesPublicados().publicarPlan({
        codigo: '663',
        jsonTexto: jsonDetalle('663'),
        uid: 'admin-1'
      })

      expect(exito).toBe(false)
      expect(datos).toBeNull()
      expect(error).toBe(fallo)
    })
  })

  describe('generarVidriera', () => {
    it('debe devolver un catálogo vacío si no hay planes publicados', async () => {
      const { exito, datos } = await usePlanesPublicados().generarVidriera()

      expect(exito).toBe(true)
      expect(datos).toEqual({ catalogo: { planes: [] }, detalles: {} })
    })

    it('debe armar catálogo ordenado y detalles con el disponible del registro', async () => {
      mockGetDocs.mockResolvedValue({
        docs: [
          snapshot('708', {
            codigo: '708',
            nombre: 'Sonido',
            disponible: false,
            jsonTexto: JSON.stringify({
              plan: '708',
              disponible: true,
              materias: { '708-1.1': { anio: 1 } }
            })
          }),
          snapshot('662', {
            codigo: '662',
            nombre: 'Música',
            disponible: true,
            jsonTexto: jsonDetalle('662')
          })
        ]
      })

      const { exito, datos } = await usePlanesPublicados().generarVidriera()

      expect(exito).toBe(true)
      expect(datos.catalogo.planes).toEqual([
        { codigo: '662', nombre: 'Música', disponible: true },
        { codigo: '708', nombre: 'Sonido', disponible: false }
      ])
      expect(datos.detalles['662'].plan).toBe('662')
      // `disponible` manda desde el documento publicado, no desde el JSON.
      expect(datos.detalles['708'].disponible).toBe(false)
    })

    it('debe abortar la vidriera completa si un plan tiene JSON inválido', async () => {
      mockGetDocs.mockResolvedValue({
        docs: [
          snapshot('662', { codigo: '662', jsonTexto: jsonDetalle('662') }),
          snapshot('708', { codigo: '708', jsonTexto: '{roto' })
        ]
      })

      const { exito, datos, error } = await usePlanesPublicados().generarVidriera()

      expect(exito).toBe(false)
      expect(datos).toBeNull()
      expect(error.message).toBe('Plan 708: El JSON del plan no es parseable.')
    })
  })
})
