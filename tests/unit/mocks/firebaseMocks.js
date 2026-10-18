/**
 * Mocks reutilizables para Firebase en tests
 * 
 * Este archivo contiene mocks para Firebase Auth y Firestore
 * que pueden ser importados y usados en los tests unitarios.
 */

import { vi } from 'vitest'

// Mock de Firebase Auth
export const mockAuth = {
  currentUser: null,
  onAuthStateChanged: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
}

// Mock de Firebase Firestore
export const mockFirestore = {
  doc: vi.fn(),
  collection: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  serverTimestamp: vi.fn(() => new Date()),
}

// Mock de Firebase Functions
export const mockFunctions = {
  httpsCallable: vi.fn(),
}

// Mock de Firebase App
export const mockApp = {
  name: 'sige-test',
}

// Mock de Firebase Analytics
export const mockAnalytics = null

// Helper para crear un usuario mock
export const createMockUser = (overrides = {}) => ({
  uid: 'test-user-123',
  email: 'test@example.com',
  emailVerified: true,
  displayName: 'Test User',
  ...overrides,
})

// Helper para crear un usuario de Firestore mock
export const createMockFirestoreUser = (overrides = {}) => ({
  uid: 'test-user-123',
  email: 'test@example.com',
  nombre: 'Test',
  apellido: 'User',
  roles: ['estudiante'],
  carrera: 'Ingeniería',
  legajo: '12345',
  dni: '12345678',
  estado: 'activo',
  ...overrides,
})

// Helper para resetear todos los mocks
export const resetAllFirebaseMocks = () => {
  vi.clearAllMocks()
  mockAuth.currentUser = null
}

// Helper para simular login exitoso
export const mockSuccessfulLogin = (user = createMockUser()) => {
  mockAuth.currentUser = user
  mockAuth.onAuthStateChanged.mockImplementation((auth, callback) => {
    callback(user)
    return () => {} // Unsubscribe function
  })
}

// Helper para simular logout
export const mockLogout = () => {
  mockAuth.currentUser = null
  mockAuth.onAuthStateChanged.mockImplementation((auth, callback) => {
    callback(null)
    return () => {} // Unsubscribe function
  })
}

// Helper para simular error de autenticación
export const mockAuthError = (errorCode = 'auth/user-not-found', message = 'User not found') => {
  const error = new Error(message)
  error.code = errorCode
  mockAuth.signInWithEmailAndPassword.mockRejectedValue(error)
  return error
}

// Mock de useAuth
export const mockUseAuth = (overrides = {}) => {
  const user = overrides.user || createMockUser()
  const isLoggedIn = overrides.isLoggedIn ?? !!user
  const userRoles = overrides.userRoles ?? (user?.roles || [])
  const userRole = overrides.userRole ?? (userRoles[0] || null)
  
    return {
      user: { value: user },
      isLoggedIn: { value: isLoggedIn },
      userRole: { value: userRole },
      userRoles: { value: userRoles },
      estaCndando: { value: !isLoggedIn },
    checkAuthState: vi.fn().mockResolvedValue(undefined),
    loginFirebase: vi.fn().mockResolvedValue({ exito: true }),
    logoutFirebase: vi.fn().mockResolvedValue({ exito: true }),
    registrarUsuario: vi.fn().mockResolvedValue({ exito: true }),
    resetPassword: vi.fn().mockResolvedValue({ exito: true }),
  }
}

// Mock de useInscripciones
export const mockUseInscripciones = (inscripciones = []) => {
  return {
    inscribirAMateria: vi.fn().mockResolvedValue({ exito: true, datos: null, error: null }),
    cargarInscripciones: vi.fn().mockResolvedValue({ exito: true, datos: inscripciones, error: null }),
    loading: { value: false },
    error: { value: null },
  }
}

// Mock de useLayout
export const mockUseLayout = () => {
  const currentLayout = { value: 'acceso' }
  const currentTheme = { value: 'estudiante' }

  return {
    currentLayout,
    currentTheme,
    setLayout: vi.fn(),
  }
}

// Mock de localStorage
export const mockLocalStorage = () => {
  const store = {}
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = value
    }),
    removeItem: vi.fn((key) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach((key) => delete store[key])
    }),
    get store() {
      return store
    },
  }
}

// Mock de router
export const mockRouter = () => ({
  push: vi.fn(),
  currentRoute: {
    value: {
      name: 'login',
      path: '/',
      meta: {},
    },
  },
  replace: vi.fn(),
})

// Mock de useRouter
export const mockUseRouter = () => ({
  router: mockRouter(),
})

// Mock de Firestore collection para inscripciones
export const mockInscripcionesCollection = (ciclo = '20261') => {
  const inscripciones = [
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

  mockFirestore.collection.mockReturnValue({
    id: `inscripciones${ciclo}`,
  })

  mockFirestore.getDocs.mockResolvedValue({
    docs: inscripciones.map((inscripcion) => ({
      id: inscripcion.id,
      data: () => inscripcion,
    })),
  })

  return inscripciones
}