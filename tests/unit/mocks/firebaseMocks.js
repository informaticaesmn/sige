import { vi } from 'vitest'
import { ref } from 'vue'

export const mockAuth = {
  currentUser: null,
  onAuthStateChanged: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
}

export const mockFirestore = {
  doc: vi.fn(),
  collection: vi.fn(),
  getDoc: vi.fn().mockResolvedValue({ exists: () => true, data: () => ({}) }),
  getDocs: vi.fn().mockResolvedValue({ docs: [] }),
  setDoc: vi.fn().mockResolvedValue(),
  updateDoc: vi.fn().mockResolvedValue(),
  deleteDoc: vi.fn().mockResolvedValue(),
  query: vi.fn(),
  where: vi.fn(),
  writeBatch: vi.fn(() => ({ 
    set: vi.fn(), 
    delete: vi.fn(), 
    commit: vi.fn().mockResolvedValue() 
  })),
}

export const createMockUser = (overrides = {}) => ({
  uid: 'test-user-123',
  email: 'test@example.com',
  emailVerified: true,
  displayName: 'Test User',
  roles: ['estudiante'],
  ...overrides,
})

// ¡AGREGADO DE NUEVO! Esta era la causa de la mayoría de los fallos
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

export const resetAllFirebaseMocks = () => {
  vi.clearAllMocks()
  mockAuth.currentUser = null
}

export const mockUseAuth = (overrides = {}) => {
  const user = ref(overrides.user || createMockUser())
  const isLoggedIn = ref(overrides.isLoggedIn ?? !!user.value)
  const userRoles = ref(overrides.userRoles ?? (user.value?.roles || []))
  
  return {
    user,
    isLoggedIn,
    userRoles,
    userRole: ref(userRoles.value[0] || null),
    estaCargando: ref(false),
    checkAuthState: vi.fn().mockResolvedValue(undefined),
    loginFirebase: vi.fn().mockResolvedValue({ exito: true, datos: user.value, error: null }),
    logoutFirebase: vi.fn().mockResolvedValue({ exito: true, datos: null, error: null }),
    registrarUsuario: vi.fn().mockResolvedValue({ exito: true, datos: user.value, error: null }),
  }
}

export const mockUseInscripciones = (inscripciones = []) => {
  return {
    inscribirAMateria: vi.fn().mockResolvedValue({ exito: true, datos: null, error: null }),
    cargarInscripciones: vi.fn().mockResolvedValue({ exito: true, datos: inscripciones, error: null }),
    loading: ref(false),
    error: ref(null),
  }
}

export const mockUseLayout = () => {
  return {
    currentLayout: ref('acceso'),
    currentTheme: ref('estudiante'),
    setLayout: vi.fn(),
  }
}

export const mockLocalStorage = () => {
  const store = {}
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => { store[key] = String(value) }),
    removeItem: vi.fn((key) => { delete store[key] }),
    clear: vi.fn(() => { Object.keys(store).forEach((key) => delete store[key]) }),
  }
}

export const mockRouter = () => ({
  push: vi.fn(),
  currentRoute: ref({ name: 'login', path: '/', meta: {} }),
  replace: vi.fn(),
})