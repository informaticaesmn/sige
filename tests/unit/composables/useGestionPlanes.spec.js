/**
 * Tests unitarios para useGestionPlanes.js
 *
 * Valida:
 * - Derivación de metadatos desde el JSON crudo (`metadatosDePlanJson`).
 * - Listado con estado de UI (`refrescarLista`).
 * - Importación (parseo + guardado) de un JSON.
 * - Eliminación de un borrador.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetDocs, mockSetDoc, mockDeleteDoc, mockGetDoc } = vi.hoisted(() => ({
  mockGetDocs: vi.fn(),
  mockSetDoc: vi.fn(),
  mockDeleteDoc: vi.fn(),
  mockGetDoc: vi.fn()
}))

vi.mock('firebase/firestore/lite', () => ({
  collection: vi.fn((_db, nombre) => ({ path: nombre })),
  doc: vi.fn((_db, coleccion, id) => ({ path: `${coleccion}/${id}` })),
  getDoc: mockGetDoc,
  getDocs: mockGetDocs,
  setDoc: mockSetDoc,
  deleteDoc: mockDeleteDoc,
  serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP')
}))

vi.mock('@/config/firebase.js', () => ({ db: {} }))

import {
  useGestionPlanes,
  metadatosDePlanJson
} from '@/composables/academico/useGestionPlanes.js'

const PLAN_JSON = JSON.stringify({
  plan: '663 Dirección Coral',
  nombre: 'Plan 663 Profesorado',
  materias: {
    '663-0.1': { nombre: 'Audioperceptiva' },
    '663-0.2': { nombre: 'Lenguaje Musical' }
  }
})

describe('metadatosDePlanJson', () => {
  it('deriva código (primer token), nombre (sin "Plan ") y cantidad de materias', () => {
    const meta = metadatosDePlanJson(PLAN_JSON)
    expect(meta).toEqual({
      codigo: '663',
      nombre: '663 Profesorado',
      materiasCount: 2
    })
  })

  it('acepta un objeto ya parseado', () => {
    const meta = metadatosDePlanJson({ codigo: '708', materias: [] })
    expect(meta.codigo).toBe('708')
    expect(meta.nombre).toBe('Plan 708')
    expect(meta.materiasCount).toBe(0)
  })

  it('lanza si el JSON no es parseable', () => {
    expect(() => metadatosDePlanJson('{ roto')).toThrow()
  })

  it('lanza si no hay código de plan', () => {
    expect(() => metadatosDePlanJson({ materias: {} })).toThrow(/código del plan/i)
  })
})

describe('useGestionPlanes', () => {
  beforeEach(() => {
    mockGetDocs.mockResolvedValue({ docs: [] })
    mockSetDoc.mockResolvedValue(undefined)
    mockDeleteDoc.mockResolvedValue(undefined)
  })

  it('refrescarLista carga los borradores y actualiza el estado', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [{ id: '663', data: () => ({ nombre: 'Plan 663', materiasCount: 2 }) }]
    })

    const { refrescarLista, planesGuardados, errorLista } = useGestionPlanes()
    const resultado = await refrescarLista()

    expect(resultado.exito).toBe(true)
    expect(planesGuardados.value.map((p) => p.codigo)).toEqual(['663'])
    expect(errorLista.value).toBe('')
  })

  it('importarBorradorDesdeTexto guarda el JSON y refresca la lista', async () => {
    const { importarBorradorDesdeTexto } = useGestionPlanes()
    const resultado = await importarBorradorDesdeTexto(PLAN_JSON, {
      uid: 'uid-1',
      email: 'coord@test.com'
    })

    expect(resultado.exito).toBe(true)
    expect(resultado.datos.codigo).toBe('663')
    expect(mockSetDoc).toHaveBeenCalledTimes(1)

    const [, documento] = mockSetDoc.mock.calls[0]
    expect(documento).toMatchObject({
      codigo: '663',
      nombre: '663 Profesorado',
      jsonTexto: PLAN_JSON,
      materiasCount: 2,
      actualizadoPor: 'uid-1',
      actualizadoPorEmail: 'coord@test.com',
      estadoRevision: 'en_edicion'
    })
    // Además de guardar, refresca la lista.
    expect(mockGetDocs).toHaveBeenCalledTimes(1)
  })

  it('importarBorradorDesdeTexto NO escribe si el JSON es inválido', async () => {
    const { importarBorradorDesdeTexto } = useGestionPlanes()
    const resultado = await importarBorradorDesdeTexto('{ roto')

    expect(resultado.exito).toBe(false)
    expect(resultado.error).toBeInstanceOf(Error)
    expect(mockSetDoc).not.toHaveBeenCalled()
  })

  it('guardarBorrador NO refresca la lista (el editor no la necesita)', async () => {
    const { guardarBorrador } = useGestionPlanes()
    const resultado = await guardarBorrador({ codigo: '663', jsonTexto: '{"plan":"663"}' })

    expect(resultado.exito).toBe(true)
    expect(mockSetDoc).toHaveBeenCalledTimes(1)
    expect(mockGetDocs).not.toHaveBeenCalled()
  })

  it('eliminarBorrador borra y refresca la lista', async () => {
    const { eliminarBorrador } = useGestionPlanes()
    const resultado = await eliminarBorrador('663')

    expect(resultado.exito).toBe(true)
    expect(mockDeleteDoc).toHaveBeenCalledTimes(1)
    expect(mockGetDocs).toHaveBeenCalledTimes(1)
  })

  it('planesListosParaPublicar filtra los provisorios con estado listo', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        { id: '662', data: () => ({ nombre: 'Plan 662', estadoRevision: 'en_edicion' }) },
        { id: '663', data: () => ({ nombre: 'Plan 663', estadoRevision: 'listo_para_publicar' }) },
        { id: '708', data: () => ({ nombre: 'Plan 708', estadoRevision: 'listo_para_publicar' }) }
      ]
    })

    const { refrescarLista, planesListosParaPublicar } = useGestionPlanes()
    await refrescarLista()

    expect(planesListosParaPublicar.value.map((p) => p.codigo)).toEqual(['663', '708'])
  })

  it('marcarListoParaPublicar actualiza el estado y refresca la lista', async () => {
    const { marcarListoParaPublicar } = useGestionPlanes()
    const resultado = await marcarListoParaPublicar('663', { uid: 'uid-admin' })

    expect(resultado.exito).toBe(true)
    expect(mockSetDoc).toHaveBeenCalledTimes(1)

    const [, documento, opciones] = mockSetDoc.mock.calls[0]
    expect(opciones).toEqual({ merge: true })
    expect(documento.estadoRevision).toBe('listo_para_publicar')
    // Además de escribir, refresca la lista.
    expect(mockGetDocs).toHaveBeenCalledTimes(1)
  })

  it('marcarListoParaPublicar NO refresca si la escritura falla', async () => {
    mockSetDoc.mockRejectedValue(new Error('permiso denegado'))

    const { marcarListoParaPublicar } = useGestionPlanes()
    const resultado = await marcarListoParaPublicar('663')

    expect(resultado.exito).toBe(false)
    expect(mockGetDocs).not.toHaveBeenCalled()
  })
})
