/**
 * Tests unitarios para useImportarUsuarios.js
 *
 * Valida:
 * - El parser de CSV (incluido el formato de arrays de Google Sheets)
 * - La validación temprana (roles reservados, plan obligatorio para estudiantes)
 * - El troceado en lotes y la escritura atómica vía writeBatch
 * - Que un CSV con errores NO escriba nada (todo-o-nada)
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

import {
  useImportarUsuarios,
  validarFilaUsuario,
  dividirEnLotes,
  mapaDePlanesDesdeJson,
  LIMITE_BATCH
} from '@/composables/usuarios/useImportarUsuarios.js'
import { parsearCSV } from '@/utils/csv.js'

const CABECERA = 'dni,nombre,apellido,email,roles,plan'
const nombresDePlanes = { 708: '708 Técnico Superior en Sonido' }

describe('useImportarUsuarios', () => {
  beforeEach(() => {
    mockBatch.set.mockReturnValue(undefined)
    mockBatch.commit.mockResolvedValue(undefined)
    mockWriteBatch.mockReturnValue(mockBatch)
  })

  describe('parsearCSV', () => {
    it('debe interpretar el formato de arrays de Google Sheets (comillas dobles escapadas)', () => {
      const csv = `${CABECERA}\n37348389,Maria José,ORTEGA,majo@test.com,"[""estudiante""]","[""708""]"`
      const filas = parsearCSV(csv)

      expect(filas).toHaveLength(1)
      expect(filas[0].email).toBe('majo@test.com')
      expect(filas[0].roles).toBe('["estudiante"]')
      expect(filas[0].plan).toBe('["708"]')
    })

    it('debe devolver [] si no hay filas de datos', () => {
      expect(parsearCSV('')).toEqual([])
      expect(parsearCSV(CABECERA)).toEqual([])
    })
  })

  describe('validarFilaUsuario', () => {
    it('debe aceptar una fila válida y traducir los planes a nombre completo', () => {
      const resultado = validarFilaUsuario(
        { dni: '1', nombre: 'Ana', apellido: 'Pérez', email: 'ANA@test.com', roles: '["estudiante"]', plan: '["708"]' },
        nombresDePlanes
      )

      expect(resultado.esValida).toBe(true)
      expect(resultado.datos.email).toBe('ana@test.com')
      expect(resultado.datos.roles).toEqual(['estudiante'])
      expect(resultado.datos.planes).toEqual(['708 Técnico Superior en Sonido'])
    })

    it('debe rechazar roles reservados (admin/coordinacion)', () => {
      const resultado = validarFilaUsuario(
        { dni: '1', nombre: 'A', apellido: 'B', email: 'a@test.com', roles: '["admin"]' },
        nombresDePlanes
      )

      expect(resultado.esValida).toBe(false)
      expect(resultado.errores.join(' ')).toContain('Roles reservados')
    })

    it('debe rechazar roles inexistentes y filas sin datos obligatorios', () => {
      const resultado = validarFilaUsuario(
        { dni: '', nombre: '', apellido: '', email: 'invalido', roles: '["pirata"]' },
        nombresDePlanes
      )

      expect(resultado.esValida).toBe(false)
      expect(resultado.errores).toEqual(
        expect.arrayContaining([
          'Falta el DNI',
          'Falta el nombre',
          'Falta el apellido',
          'El email tiene un formato inválido',
          'Roles inválidos: pirata'
        ])
      )
    })

    it('debe exigir plan a los estudiantes', () => {
      const resultado = validarFilaUsuario(
        { dni: '1', nombre: 'A', apellido: 'B', email: 'a@test.com', roles: '["estudiante"]', plan: '' },
        nombresDePlanes
      )

      expect(resultado.esValida).toBe(false)
      expect(resultado.errores).toContain('Los estudiantes deben tener al menos un plan asignado')
    })
  })

  describe('dividirEnLotes', () => {
    it('debe partir en bloques de LIMITE_BATCH', () => {
      const items = Array.from({ length: LIMITE_BATCH + 1 }, (_, i) => i)
      const lotes = dividirEnLotes(items)

      expect(lotes).toHaveLength(2)
      expect(lotes[0]).toHaveLength(LIMITE_BATCH)
      expect(lotes[1]).toHaveLength(1)
    })
  })

  describe('mapaDePlanesDesdeJson', () => {
    it('debe soportar el formato array ({ planes: [{ codigo, nombre }] })', () => {
      const mapa = mapaDePlanesDesdeJson({ planes: [{ codigo: '708', nombre: 'Sonido' }] })
      expect(mapa).toEqual({ 708: 'Sonido' })
    })

    it('debe soportar un objeto plano ({ planes: { codigo: nombre } })', () => {
      expect(mapaDePlanesDesdeJson({ planes: { 708: 'Sonido' } })).toEqual({ 708: 'Sonido' })
    })
  })

  describe('importarUsuariosDesdeCSV', () => {
    it('debe escribir en un lote atómico y devolver el total importado', async () => {
      const csv = `${CABECERA}\n1,Ana,Pérez,ana@test.com,"[""estudiante""]","[""708""]"`
      const { importarUsuariosDesdeCSV } = useImportarUsuarios()

      const resultado = await importarUsuariosDesdeCSV(csv, { nombresDePlanes })

      expect(resultado.exito).toBe(true)
      expect(resultado.datos.importados).toBe(1)
      expect(resultado.datos.lotes).toBe(1)
      expect(mockWriteBatch).toHaveBeenCalledTimes(1)
      expect(mockBatch.set).toHaveBeenCalledTimes(1)
      expect(mockBatch.commit).toHaveBeenCalledTimes(1)

      // El documento queda como pre-registro
      const [, documento] = mockBatch.set.mock.calls[0]
      expect(mockBatch.set.mock.calls[0][0]).toEqual({ path: 'usuarios/ana@test.com' })
      expect(documento.estado).toBe('pendiente_registro')
      expect(documento.roles).toEqual(['estudiante'])
    })

    it('NO debe escribir nada si alguna fila es inválida (todo-o-nada)', async () => {
      const csv = `${CABECERA}\n1,Ana,Pérez,ana@test.com,"[""estudiante""]","[""708""]"\n2,Beto,Gómez,sin-plan@test.com,"[""estudiante""]",`
      const { importarUsuariosDesdeCSV } = useImportarUsuarios()

      const resultado = await importarUsuariosDesdeCSV(csv, { nombresDePlanes })

      expect(resultado.exito).toBe(false)
      expect(resultado.datos.errores).toHaveLength(1)
      expect(resultado.datos.errores[0].fila).toBe(3)
      expect(mockWriteBatch).not.toHaveBeenCalled()
      expect(mockBatch.commit).not.toHaveBeenCalled()
    })

    it('debe partir en varios lotes cuando supera LIMITE_BATCH', async () => {
      const filas = Array.from(
        { length: LIMITE_BATCH + 1 },
        (_, i) => `${i},Alumno${i},Apellido${i},alumno${i}@test.com,"[""estudiante""]","[""708""]"`
      )
      const csv = `${CABECERA}\n${filas.join('\n')}`
      const { importarUsuariosDesdeCSV } = useImportarUsuarios()

      const resultado = await importarUsuariosDesdeCSV(csv, { nombresDePlanes })

      expect(resultado.exito).toBe(true)
      expect(resultado.datos.importados).toBe(LIMITE_BATCH + 1)
      expect(resultado.datos.lotes).toBe(2)
      expect(mockBatch.commit).toHaveBeenCalledTimes(2)
    })
  })
})
