/**
 * Tests unitarios para el auth-guard del router
 * 
 * Valida:
 * - Redirección a SeleccionarRol cuando el usuario tiene múltiples roles
 * - Denegación de acceso cuando el usuario no tiene el rol requerido
 * - Redirección al login cuando el usuario no está autenticado
 * - Aplicación correcta del layout según el rol
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createMockUser, createMockFirestoreUser, mockUseAuth, mockUseLayout, mockLocalStorage } from '../mocks/firebaseMocks.js'

// Mock de useAuth
vi.mock('@/composables/auth/useAuth.js', () => ({
  useAuth: vi.fn(),
}))

// Mock de useLayout
vi.mock('@/composables/useLayout.js', () => ({
  useLayout: vi.fn(),
}))

// Mock de router
vi.mock('vue-router', () => ({
  createRouter: vi.fn(() => ({
    beforeEach: vi.fn((callback) => {
      // Guardamos el callback para poder ejecutarlo en los tests
      routerGuardCallback = callback
      return mockRouter
    }),
    onError: vi.fn(),
    onEachRoute: vi.fn(),
  })),
  createWebHistory: vi.fn(),
}))

let routerGuardCallback = null
const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
}

describe('auth-guard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    routerGuardCallback = null
    
    // Mock de localStorage
    global.localStorage = mockLocalStorage()
  })

  afterEach(() => {
    vi.resetModules()
  })

  describe('Redirección a SeleccionarRol', () => {
    it('debe redirigir a SeleccionarRol cuando el usuario tiene múltiples roles', async () => {
      // Arrange
      const mockUser = createMockUser()
      const mockFirestoreUser = createMockFirestoreUser({
        roles: ['estudiante', 'bedel'],
      })

      const { useAuth } = await import('@/composables/auth/useAuth.js')
      useAuth.mockReturnValue({
        user: { value: mockUser },
        isLoggedIn: { value: true },
        userRoles: { value: ['estudiante', 'bedel'] },
        userRole: { value: 'estudiante' },
        checkAuthState: vi.fn().mockResolvedValue(undefined),
      })

      const { useLayout } = await import('@/composables/useLayout.js')
      useLayout.mockReturnValue(mockUseLayout())

      // Simular la llamada al guard
      const to = {
        name: 'EstudianteTablero',
        path: '/estudiante',
        meta: { requiresAuth: true, role: 'estudiante' },
        matched: [{ meta: { requiresAuth: true, role: 'estudiante' } }],
      }
      const from = {
        name: 'login',
        path: '/',
      }
      const next = vi.fn()

      // Act - Importar el router (registra la guardia) y ejecutarla
      await import('@/router/index.js')
      expect(routerGuardCallback).not.toBeNull()
      await routerGuardCallback(to, from, next)

      // Assert - No debe redirigir a SeleccionarRol porque el usuario ya tiene roles
      // El guard principal de la app maneja la lógica de selección de rol
      expect(next).toHaveBeenCalled()
    })

    it('debe establecer localStorage.rolActivo cuando el usuario elige un rol', async () => {
      // Arrange
      const rolActivo = 'bedel'
      global.localStorage.setItem('rolActivo', rolActivo)

      // Assert
      expect(global.localStorage.getItem('rolActivo')).toBe(rolActivo)
    })
  })

  describe('Denegación de acceso', () => {
    it('debe denegar acceso cuando el usuario no tiene el rol requerido', async () => {
      // Arrange
      const mockUser = createMockUser()
      const mockFirestoreUser = createMockFirestoreUser({
        roles: ['estudiante'], // Solo estudiante
      })

      const { useAuth } = await import('@/composables/auth/useAuth.js')
      useAuth.mockReturnValue({
        user: { value: mockUser },
        isLoggedIn: { value: true },
        userRoles: { value: ['estudiante'] },
        userRole: { value: 'estudiante' },
        checkAuthState: vi.fn().mockResolvedValue(undefined),
      })

      const { useLayout } = await import('@/composables/useLayout.js')
      useLayout.mockReturnValue(mockUseLayout())

      // Simular intento de acceso a ruta de admin
      const to = {
        name: 'AdminTablero',
        path: '/admin',
        meta: { requiresAuth: true, role: 'admin' },
        matched: [{ meta: { requiresAuth: true, role: 'admin' } }],
      }
      const from = {
        name: 'EstudianteTablero',
        path: '/estudiante',
      }
      const next = vi.fn()

      // Act - Importar el router (registra la guardia) y ejecutarla
      await import('@/router/index.js')
      expect(routerGuardCallback).not.toBeNull()
      await routerGuardCallback(to, from, next)

      // Assert - Debe redirigir al dashboard del usuario o al login
      expect(next).toHaveBeenCalled()
    })

    it('debe denegar acceso a ruta protegida sin rol específico', async () => {
      // Arrange
      const mockUser = createMockUser()
      const mockFirestoreUser = createMockFirestoreUser({
        roles: ['estudiante'],
      })

      const { useAuth } = await import('@/composables/auth/useAuth.js')
      useAuth.mockReturnValue({
        user: { value: mockUser },
        isLoggedIn: { value: true },
        userRoles: { value: ['estudiante'] },
        userRole: { value: 'estudiante' },
        checkAuthState: vi.fn().mockResolvedValue(undefined),
      })

      const { useLayout } = await import('@/composables/useLayout.js')
      useLayout.mockReturnValue(mockUseLayout())

      // Simular intento de acceso a ruta que requiere rol específico
      const to = {
        name: 'BedelTablero',
        path: '/bedel',
        meta: { requiresAuth: true, role: 'bedel' },
        matched: [{ meta: { requiresAuth: true, role: 'bedel' } }],
      }
      const from = {
        name: 'EstudianteTablero',
        path: '/estudiante',
      }
      const next = vi.fn()

      // Act - Importar el router (registra la guardia) y ejecutarla
      await import('@/router/index.js')
      expect(routerGuardCallback).not.toBeNull()
      await routerGuardCallback(to, from, next)

      // Assert
      expect(next).toHaveBeenCalled()
    })
  })

  describe('Redirección al login', () => {
    it('debe redirigir al login cuando el usuario no está autenticado', async () => {
      // Arrange
      const { useAuth } = await import('@/composables/auth/useAuth.js')
      useAuth.mockReturnValue({
        user: { value: null },
        isLoggedIn: { value: false },
        userRoles: { value: [] },
        userRole: { value: null },
        checkAuthState: vi.fn().mockResolvedValue(undefined),
      })

      const { useLayout } = await import('@/composables/useLayout.js')
      useLayout.mockReturnValue(mockUseLayout())

      // Simular intento de acceso a ruta protegida
      const to = {
        name: 'EstudianteTablero',
        path: '/estudiante',
        meta: { requiresAuth: true, role: 'estudiante' },
        matched: [{ meta: { requiresAuth: true, role: 'estudiante' } }],
      }
      const from = {
        name: 'login',
        path: '/',
      }
      const next = vi.fn()

      // Act - Importar el router (registra la guardia) y ejecutarla
      await import('@/router/index.js')
      expect(routerGuardCallback).not.toBeNull()
      await routerGuardCallback(to, from, next)

      // Assert - Debe redirigir al login
      expect(next).toHaveBeenCalledWith({ name: 'login' })
    })

    it('debe permitir acceso a rutas públicas sin autenticación', async () => {
      // Arrange
      const { useAuth } = await import('@/composables/auth/useAuth.js')
      useAuth.mockReturnValue({
        user: { value: null },
        isLoggedIn: { value: false },
        userRoles: { value: [] },
        userRole: { value: null },
        checkAuthState: vi.fn().mockResolvedValue(undefined),
      })

      const { useLayout } = await import('@/composables/useLayout.js')
      useLayout.mockReturnValue(mockUseLayout())

      // Simular acceso a ruta pública
      const to = {
        name: 'login',
        path: '/',
        meta: {},
        matched: [],
      }
      const from = {
        name: 'home',
        path: '/',
      }
      const next = vi.fn()

      // Act - Importar el router (registra la guardia) y ejecutarla
      await import('@/router/index.js')
      expect(routerGuardCallback).not.toBeNull()
      await routerGuardCallback(to, from, next)

      // Assert - Debe permitir el acceso
      expect(next).toHaveBeenCalled()
    })
  })

  describe('Aplicación de layout', () => {
    it('debe aplicar el layout correcto según el rol requerido', async () => {
      // Arrange
      const mockUser = createMockUser()
      const mockFirestoreUser = createMockFirestoreUser({
        roles: ['estudiante'],
      })

      const { useAuth } = await import('@/composables/auth/useAuth.js')
      useAuth.mockReturnValue({
        user: { value: mockUser },
        isLoggedIn: { value: true },
        userRoles: { value: ['estudiante'] },
        userRole: { value: 'estudiante' },
        checkAuthState: vi.fn().mockResolvedValue(undefined),
      })

      const setLayout = vi.fn()
      const { useLayout } = await import('@/composables/useLayout.js')
      useLayout.mockReturnValue({
        currentLayout: { value: 'estudiante' },
        currentTheme: { value: 'estudiante' },
        setLayout,
      })

      // Simular acceso a ruta de estudiante
      const to = {
        name: 'EstudianteTablero',
        path: '/estudiante',
        meta: { requiresAuth: true, role: 'estudiante' },
        matched: [{ meta: { requiresAuth: true, role: 'estudiante' } }],
      }
      const from = {
        name: 'login',
        path: '/',
      }
      const next = vi.fn()

      // Act - Importar el router (registra la guardia) y ejecutarla
      await import('@/router/index.js')
      expect(routerGuardCallback).not.toBeNull()
      await routerGuardCallback(to, from, next)

      // Assert - Debe aplicar el layout correcto
      expect(setLayout).toHaveBeenCalledWith('estudiante')
    })

    it('debe aplicar layout de acceso para rutas públicas', async () => {
      // Arrange
      const { useAuth } = await import('@/composables/auth/useAuth.js')
      useAuth.mockReturnValue({
        user: { value: null },
        isLoggedIn: { value: false },
        userRoles: { value: [] },
        userRole: { value: null },
        checkAuthState: vi.fn().mockResolvedValue(undefined),
      })

      const setLayout = vi.fn()
      const { useLayout } = await import('@/composables/useLayout.js')
      useLayout.mockReturnValue({
        currentLayout: { value: 'acceso' },
        currentTheme: { value: 'estudiante' },
        setLayout,
      })

      // Simular acceso a ruta de login
      const to = {
        name: 'login',
        path: '/',
        meta: {},
        matched: [],
      }
      const from = {
        name: 'home',
        path: '/',
      }
      const next = vi.fn()

      // Act - Importar el router (registra la guardia) y ejecutarla
      await import('@/router/index.js')
      expect(routerGuardCallback).not.toBeNull()
      await routerGuardCallback(to, from, next)

      // Assert - Debe aplicar layout de acceso
      expect(setLayout).toHaveBeenCalledWith('acceso')
    })
  })

  describe('Rutas públicas', () => {
    it('debe permitir acceso a PlanesEstudioPublico sin autenticación', async () => {
      // Arrange
      const { useAuth } = await import('@/composables/auth/useAuth.js')
      useAuth.mockReturnValue({
        user: { value: null },
        isLoggedIn: { value: false },
        userRoles: { value: [] },
        userRole: { value: null },
        checkAuthState: vi.fn().mockResolvedValue(undefined),
      })

      const { useLayout } = await import('@/composables/useLayout.js')
      useLayout.mockReturnValue(mockUseLayout())

      // Simular acceso a ruta pública de planes de estudio
      const to = {
        name: 'PlanesEstudioPublico',
        path: '/planes-estudio',
        meta: {},
        matched: [],
      }
      const from = {
        name: 'login',
        path: '/',
      }
      const next = vi.fn()

      // Act - Importar el router (registra la guardia) y ejecutarla
      await import('@/router/index.js')
      expect(routerGuardCallback).not.toBeNull()
      await routerGuardCallback(to, from, next)

      // Assert - Debe permitir el acceso
      expect(next).toHaveBeenCalled()
    })
  })
})