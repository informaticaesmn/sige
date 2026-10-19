/**
 * Tests unitarios para useAuth.js
 * 
 * Valida:
 * - onAuthStateChanged y actualización del objeto user reactivo
 * - Estructura de retorno { exito, datos, error }
 * - Manejo de estados de autenticación
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createMockUser, createMockFirestoreUser, mockAuth, resetAllFirebaseMocks } from '../mocks/firebaseMocks.js'

// Mock de Firebase Auth
vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
}))

// Mock de Firebase Functions
vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn(),
}))

// Mock de router
vi.mock('@/router/routerInstance.js', () => ({
  routerInstance: {
    router: {
      push: vi.fn(),
    },
  },
}))

// Mock de useUsuarios (la alias válida es '@/composables/...')
vi.mock('@/composables/usuarios/useUsuarios.js', () => ({
  obtenerUsuario: vi.fn(),
}))

// Mock de Firebase config
vi.mock('@/config/firebase.js', () => ({
  auth: {
    currentUser: null,
  },
  functions: {},
}))

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetAllFirebaseMocks()
  })

  afterEach(() => {
    vi.resetModules()
  })

  describe('onAuthStateChanged', () => {
    it('debe actualizar el objeto user cuando el usuario inicia sesión', async () => {
      // Arrange
      const mockUser = createMockUser()
      const mockFirestoreUser = createMockFirestoreUser()
      
      // Mock de onAuthStateChanged
      const { onAuthStateChanged } = await import('firebase/auth')
      onAuthStateChanged.mockImplementation((auth, callback) => {
        // Simular que el usuario está logueado
        callback({
          uid: mockUser.uid,
          email: mockUser.email,
          emailVerified: mockUser.emailVerified,
        })
        return () => {} // Unsubscribe
      })

      // Mock de obtenerUsuario
      const { obtenerUsuario } = await import('@/composables/usuarios/useUsuarios.js')
      obtenerUsuario.mockResolvedValue(mockFirestoreUser)

      // Act - Importar useAuth después de configurar los mocks
      const { useAuth } = await import('@/composables/auth/useAuth.js')
      const { user, isLoggedIn } = useAuth()

      // Assert
      expect(isLoggedIn.value).toBe(true)
      expect(user.value).not.toBeNull()
      expect(user.value.uid).toBe(mockUser.uid)
      expect(user.value.email).toBe(mockUser.email)
      expect(user.value.roles).toEqual(['estudiante'])
    })

    it('debe actualizar el objeto user cuando el usuario cierra sesión', async () => {
      // Arrange
      const { onAuthStateChanged } = await import('firebase/auth')
      
      onAuthStateChanged.mockImplementation((auth, callback) => {
        // Simular que el usuario se deslogueó
        callback(null)
        return () => {} // Unsubscribe
      })

      // Act
      const { useAuth } = await import('@/composables/auth/useAuth.js')
      const { user, isLoggedIn } = useAuth()

      // Assert
      expect(isLoggedIn.value).toBe(false)
      expect(user.value).toBeNull()
    })

    it('debe manejar usuarios con múltiples roles', async () => {
      // Arrange
      const mockUser = createMockUser()
      const mockFirestoreUser = createMockFirestoreUser({
        roles: ['estudiante', 'bedel'],
      })
      
      const { onAuthStateChanged } = await import('firebase/auth')
      onAuthStateChanged.mockImplementation((auth, callback) => {
        callback({
          uid: mockUser.uid,
          email: mockUser.email,
          emailVerified: mockUser.emailVerified,
        })
        return () => {}
      })

     const { obtenerUsuario } = await import('@/composables/usuarios/useUsuarios.js')
      obtenerUsuario.mockResolvedValue(mockFirestoreUser)

      // Act
      const { useAuth } = await import('@/composables/auth/useAuth.js')
      const { user, userRoles, userRole } = useAuth()

      // Assert
      expect(userRoles.value).toEqual(['estudiante', 'bedel'])
      expect(userRole.value).toBe('estudiante') // Primer rol
    })
  })

  describe('loginFirebase', () => {
    it('debe retornar { exito: true } en login exitoso', async () => {
      // Arrange
      const mockUser = createMockUser()
      const mockFirestoreUser = createMockFirestoreUser()
      
      const { signInWithEmailAndPassword } = await import('firebase/auth')
      signInWithEmailAndPassword.mockResolvedValue({
        user: mockUser,
      })

     const { obtenerUsuario } = await import('@/composables/usuarios/useUsuarios.js')
      obtenerUsuario.mockResolvedValue(mockFirestoreUser)

      // Act
      const { useAuth } = await import('@/composables/auth/useAuth.js')
      const { loginFirebase } = useAuth()
      const resultado = await loginFirebase('test@example.com', 'password123')

      // Assert
      expect(resultado).toEqual({
        exito: true,
        datos: undefined,
        error: undefined,
      })
    })

    it('debe retornar { exito: false, error } en login fallido', async () => {
      // Arrange
      const error = new Error('Auth error')
      error.code = 'auth/user-not-found'
      
      const { signInWithEmailAndPassword } = await import('firebase/auth')
      signInWithEmailAndPassword.mockRejectedValue(error)

      // Act
      const { useAuth } = await import('@/composables/auth/useAuth.js')
      const { loginFirebase } = useAuth()
      const resultado = await loginFirebase('notfound@example.com', 'password123')

      // Assert
      expect(resultado.exito).toBe(false)
      expect(resultado.error).toBeDefined()
    })
  })

  describe('logoutFirebase', () => {
    it('debe retornar { exito: true } en logout exitoso', async () => {
      // Arrange
      const { signOut } = await import('firebase/auth')
      signOut.mockResolvedValue()

      // Act
      const { useAuth } = await import('@/composables/auth/useAuth.js')
      const { logoutFirebase } = useAuth()
      const resultado = await logoutFirebase()

      // Assert
      expect(resultado).toEqual({
        exito: true,
        datos: undefined,
        error: undefined,
      })
    })
  })

  describe('resetPassword', () => {
    it('debe retornar { exito: true } en reset exitoso', async () => {
      // Arrange
      const { sendPasswordResetEmail } = await import('firebase/auth')
      sendPasswordResetEmail.mockResolvedValue()

      // Act
      const { useAuth } = await import('@/composables/auth/useAuth.js')
      const { resetPassword } = useAuth()
      const resultado = await resetPassword('test@example.com')

      // Assert
      expect(resultado).toEqual({
        exito: true,
        datos: undefined,
        error: undefined,
      })
    })

    it('debe retornar { exito: false, error } en reset fallido', async () => {
      // Arrange
      const error = new Error('Invalid email')
      error.code = 'auth/invalid-email'
      
      const { sendPasswordResetEmail } = await import('firebase/auth')
      sendPasswordResetEmail.mockRejectedValue(error)

      // Act
      const { useAuth } = await import('@/composables/auth/useAuth.js')
      const { resetPassword } = useAuth()
      const resultado = await resetPassword('invalid-email')

      // Assert
      expect(resultado.exito).toBe(false)
      expect(resultado.error).toBeDefined()
    })
  })

  describe('registrarUsuario', () => {
    it('debe retornar { exito: true } en registro exitoso', async () => {
      // Arrange
      const mockUser = createMockUser()
      const mockFirestoreUser = createMockFirestoreUser()
      
      const { httpsCallable } = await import('firebase/functions')
      httpsCallable.mockReturnValue(async () => ({
        data: { uid: mockUser.uid },
      }))

      const { signInWithEmailAndPassword } = await import('firebase/auth')
      signInWithEmailAndPassword.mockResolvedValue({
        user: mockUser,
      })

      const { obtenerUsuario } = await import('@/composables/usuarios/useUsuarios.js')
      obtenerUsuario.mockResolvedValue(mockFirestoreUser)

      // Act
      const { useAuth } = await import('@/composables/auth/useAuth.js')
      const { registrarUsuario } = useAuth()
      const resultado = await registrarUsuario('newuser@example.com', 'password123')

      // Assert
      expect(resultado).toEqual({
        exito: true,
        datos: undefined,
        error: undefined,
      })
    })

    it('debe retornar { exito: false, error } cuando el usuario ya existe', async () => {
      // Arrange
      const error = new Error('User already exists')
      error.code = 'functions/already-exists'
      
      const { httpsCallable } = await import('firebase/functions')
      httpsCallable.mockReturnValue(async () => {
        throw error
      })

      // Act
      const { useAuth } = await import('@/composables/auth/useAuth.js')
      const { registrarUsuario } = useAuth()
      const resultado = await registrarUsuario('existing@example.com', 'password123')

      // Assert
      expect(resultado.exito).toBe(false)
      expect(resultado.error).toBeDefined()
    })
  })
})