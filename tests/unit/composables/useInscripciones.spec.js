/**
 * Tests unitarios para useInscripciones.js
 * 
 * Valida:
 * - Consulta a la subcolección dinámica inscripciones${ciclo}
 * - Estructura de retorno { exito, datos, error }
 * - Manejo de inscripciones pendientes y confirmadas
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createMockUser, createMockFirestoreUser, mockFirestore, resetAllFirebaseMocks } from '../mocks/firebaseMocks.js'

// Mock de Firebase Firestore Lite
vi.mock('firebase/firestore/lite', () => ({
  doc: vi.fn(),
  collection: vi.fn(),
  getDocs: vi.fn(),
  setDoc: vi.fn(),
  serverTimestamp: vi.fn(() => new Date()),
}))

// Mock de Firebase Auth
vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn(),
}))

// Mock de useAuth
vi.mock('@/composables/auth/useAuth.js', () => ({
  useAuth: vi.fn(),
}))

// Mock de Firebase config
vi.mock('@/config/firebase.js', () => ({
  db: {},
}))

describe('useInscripciones', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetAllFirebaseMocks()
  })

  afterEach(() => {
    vi.resetModules()
  })

  describe('cargarInscripciones', () => {
    it('debe retornar { exito: true, datos: inscripciones } al cargar inscripciones exitosamente', async () => {
      // Arrange
      const mockUser = createMockUser()
      const mockFirestoreUser = createMockFirestoreUser()
      const ciclo = '20261'
      
      const inscripcionesMock = [
        {
          id: 'materia-001',
          materiaId: 'materia-001',
          comisionId: 'comision-001',
          estado: 'confirmada',
          fechaInscripcion: new Date('2024-01-15'),
          ciclo,
        },
        {
          id: 'materia-002',
          materiaId: 'materia-002',
          comisionId: 'comision-002',
          estado: 'pendiente',
          fechaInscripcion: new Date('2024-01-16'),
          ciclo,
        },
      ]

      // Mock de useAuth
      const { useAuth } = await import('@/composables/auth/useAuth.js')
      useAuth.mockReturnValue({
        user: { value: mockUser },
      })

      // Mock de collection y getDocs
      const { collection, getDocs } = await import('firebase/firestore/lite')
      collection.mockReturnValue({ id: `inscripciones${ciclo}` })
      getDocs.mockResolvedValue({
        docs: inscripcionesMock.map((inscripcion) => ({
          id: inscripcion.id,
          data: () => inscripcion,
        })),
      })

      // Act
      const { useInscripciones } = await import('@/composables/inscripciones/useInscripciones.js')
      const { cargarInscripciones } = useInscripciones(ciclo)
      const resultado = await cargarInscripciones()

      // Assert
      expect(resultado).toEqual({
        exito: true,
        datos: inscripcionesMock,
        error: null,
      })
      expect(collection).toHaveBeenCalledWith(
        expect.anything(),
        'usuarios',
        mockUser.uid,
        `inscripciones${ciclo}`
      )
    })

    it('debe retornar { exito: false, error } cuando el usuario no está autenticado', async () => {
      // Arrange
      const { useAuth } = await import('@/composables/auth/useAuth.js')
      useAuth.mockReturnValue({
        user: { value: null },
      })

      // Act
      const { useInscripciones } = await import('@/composables/inscripciones/useInscripciones.js')
      const { cargarInscripciones } = useInscripciones('20261')
      
      // El composable lanza un error si el usuario no está autenticado
      await expect(cargarInscripciones()).rejects.toThrow('Usuario no autenticado')
    })

    it('debe manejar el ciclo dinámico correctamente', async () => {
      // Arrange
      const mockUser = createMockUser()
      const ciclo = '20252'
      
      const { useAuth } = await import('@/composables/auth/useAuth.js')
      useAuth.mockReturnValue({
        user: { value: mockUser },
      })

      const { collection, getDocs } = await import('firebase/firestore/lite')
      collection.mockReturnValue({ id: `inscripciones${ciclo}` })
      getDocs.mockResolvedValue({ docs: [] })

      // Act
      const { useInscripciones } = await import('@/composables/inscripciones/useInscripciones.js')
      const { cargarInscripciones } = useInscripciones(ciclo)
      await cargarInscripciones()

      // Assert
      expect(collection).toHaveBeenCalledWith(
        expect.anything(),
        'usuarios',
        mockUser.uid,
        `inscripciones${ciclo}`
      )
    })
  })

  describe('inscribirAMateria', () => {
    it('debe retornar { exito: true } al inscribir una materia exitosamente', async () => {
      // Arrange
      const mockUser = createMockUser()
      const ciclo = '20261'
      const materiaId = 'materia-001'
      const comisionId = 'comision-001'
      
      const { useAuth } = await import('@/composables/auth/useAuth.js')
      useAuth.mockReturnValue({
        user: { value: mockUser },
      })

      const { doc, setDoc } = await import('firebase/firestore/lite')
      doc.mockReturnValue({ id: `${materiaId}` })
      setDoc.mockResolvedValue()

      // Act
      const { useInscripciones } = await import('@/composables/inscripciones/useInscripciones.js')
      const { inscribirAMateria } = useInscripciones(ciclo)
      const resultado = await inscribirAMateria(materiaId, comisionId)

      // Assert
      expect(resultado).toEqual({
        exito: true,
        datos: undefined,
        error: undefined,
      })
      expect(setDoc).toHaveBeenCalled()
    })

    it('debe retornar { exito: false, error } al fallar la inscripción', async () => {
      // Arrange
      const mockUser = createMockUser()
      const ciclo = '20261'
      const materiaId = 'materia-001'
      const comisionId = 'comision-001'
      
      const { useAuth } = await import('@/composables/auth/useAuth.js')
      useAuth.mockReturnValue({
        user: { value: mockUser },
      })

      const { doc, setDoc } = await import('firebase/firestore/lite')
      doc.mockReturnValue({ id: `${materiaId}` })
      setDoc.mockRejectedValue(new Error('Permission denied'))

      // Act
      const { useInscripciones } = await import('@/composables/inscripciones/useInscripciones.js')
      const { inscribirAMateria } = useInscripciones(ciclo)
      
      // El composable lanza un error
      await expect(inscribirAMateria(materiaId, comisionId)).rejects.toThrow('Permission denied')
    })

    it('debe lanzar error si el usuario no está autenticado', async () => {
      // Arrange
      const { useAuth } = await import('@/composables/auth/useAuth.js')
      useAuth.mockReturnValue({
        user: { value: null },
      })

      // Act
      const { useInscripciones } = await import('@/composables/inscripciones/useInscripciones.js')
      const { inscribirAMateria } = useInscripciones('20261')
      
      // El composable lanza un error si el usuario no está autenticado
      await expect(inscribirAMateria('materia-001', 'comision-001')).rejects.toThrow('Usuario no autenticado')
    })

    it('debe construir la ruta correcta para la subcolección inscripciones${ciclo}', async () => {
      // Arrange
      const mockUser = createMockUser()
      const ciclo = '20261'
      const materiaId = 'materia-001'
      const comisionId = 'comision-001'
      
      const { useAuth } = await import('@/composables/auth/useAuth.js')
      useAuth.mockReturnValue({
        user: { value: mockUser },
      })

      const { doc } = await import('firebase/firestore/lite')
      doc.mockReturnValue({ id: `${materiaId}` })

      // Act
      const { useInscripciones } = await import('@/composables/inscripciones/useInscripciones.js')
      const { inscribirAMateria } = useInscripciones(ciclo)
      await inscribirAMateria(materiaId, comisionId)

      // Assert - Verificar que se llamó con la ruta correcta
      expect(doc).toHaveBeenCalledWith(
        expect.anything(),
        'usuarios',
        mockUser.uid,
        `inscripciones${ciclo}`,
        materiaId
      )
    })
  })

  describe('loading y error', () => {
    it('debe actualizar loading a true durante la operación', async () => {
      // Arrange
      const mockUser = createMockUser()
      const { useAuth } = await import('@/composables/auth/useAuth.js')
      useAuth.mockReturnValue({
        user: { value: mockUser },
      })

      const { doc, setDoc } = await import('firebase/firestore/lite')
      doc.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ id: 'materia-001' }), 100)))
      setDoc.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(), 100)))

      // Act
      const { useInscripciones } = await import('@/composables/inscripciones/useInscripciones.js')
      const { inscribirAMateria, loading } = useInscripciones('20261')
      
      const promise = inscribirAMateria('materia-001', 'comision-001')
      
      // Assert - loading debería ser true durante la operación
      expect(loading.value).toBe(true)
      
      await promise
      expect(loading.value).toBe(false)
    })
  })
})