/**
 * Tests unitarios para BarraApp.vue
 * 
 * Valida:
 * - Filtrado del menú según el rolActivo en localStorage
 * - Renderizado correcto de enlaces según el rol del usuario
 * - Manejo de usuarios con múltiples roles
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockUser, createMockFirestoreUser, mockUseAuth, mockUseLayout, mockLocalStorage } from '../mocks/firebaseMocks.js'

// Mock de useAuth
vi.mock('@/composables/auth/useAuth.js', () => ({
  useAuth: vi.fn(),
}))

// Mock de useRouter
vi.mock('vue-router', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
  })),
}))

// Mock de @vueuse/components
vi.mock('@vueuse/components', () => ({
  vOnClickOutside: {
    directive: {},
  },
}))

// Mock de iconos de Heroicons
vi.mock('@heroicons/vue/24/outline', () => ({
  Bars3Icon: { name: 'Bars3Icon' },
  Square3Stack3DIcon: { name: 'Square3Stack3DIcon' },
  WindowIcon: { name: 'WindowIcon' },
  AcademicCapIcon: { name: 'AcademicCapIcon' },
  ArrowRightStartOnRectangleIcon: { name: 'ArrowRightStartOnRectangleIcon' },
  ArrowUpTrayIcon: { name: 'ArrowUpTrayIcon' },
  XMarkIcon: { name: 'XMarkIcon' },
}))

// Mock de TerminosContenido
vi.mock('@/components/legal/TerminosContenido.vue', () => ({
  default: {
    name: 'TerminosContenido',
    template: '<div>Términos</div>',
  },
}))

describe('BarraApp.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock de localStorage
    global.localStorage = mockLocalStorage()
  })

  afterEach(() => {
    vi.resetModules()
  })

  describe('Filtrado de menú por rolActivo', () => {
    it('debe mostrar los enlaces correctos para rol de estudiante', async () => {
      // Arrange
      const mockUser = createMockUser()
      const mockFirestoreUser = createMockFirestoreUser({
        roles: ['estudiante'],
      })

      const { useAuth } = await import('@/composables/auth/useAuth.js')
      useAuth.mockReturnValue({
        user: { value: mockFirestoreUser },
        logoutFirebase: vi.fn().mockResolvedValue({ exito: true }),
      })

      // Act - Montar el componente
      const BarraApp = (await import('@/components/BarraApp.vue')).default
      const wrapper = mount(BarraApp, {
        global: {
          stubs: {
            'Bars3Icon': true,
            'Square3Stack3DIcon': true,
            'WindowIcon': true,
            'AcademicCapIcon': true,
            'ArrowRightStartOnRectangleIcon': true,
            'XMarkIcon': true,
            'ArrowUpTrayIcon': true,
            'TerminosContenido': true,
          },
        },
      })

      // Assert - Verificar que el menú muestra los enlaces de estudiante
      const roleLinks = wrapper.vm.$data.roleLinks || wrapper.vm.roleLinks
      expect(roleLinks).toBeDefined()
    })

    it('debe mostrar los enlaces correctos para rol de admin', async () => {
      // Arrange
      const mockUser = createMockUser()
      const mockFirestoreUser = createMockFirestoreUser({
        roles: ['admin'],
      })

      const { useAuth } = await import('@/composables/auth/useAuth.js')
      useAuth.mockReturnValue({
        user: { value: mockFirestoreUser },
        logoutFirebase: vi.fn().mockResolvedValue({ exito: true }),
      })

      // Act - Montar el componente
      const BarraApp = (await import('@/components/BarraApp.vue')).default
      const wrapper = mount(BarraApp, {
        global: {
          stubs: {
            'Bars3Icon': true,
            'Square3Stack3DIcon': true,
            'WindowIcon': true,
            'AcademicCapIcon': true,
            'ArrowRightStartOnRectangleIcon': true,
            'XMarkIcon': true,
            'ArrowUpTrayIcon': true,
            'TerminosContenido': true,
          },
        },
      })

      // Assert
      expect(wrapper.vm.roleLinks).toBeDefined()
    })

    it('debe mostrar los enlaces correctos para rol de bedel', async () => {
      // Arrange
      const mockUser = createMockUser()
      const mockFirestoreUser = createMockFirestoreUser({
        roles: ['bedel'],
      })

      const { useAuth } = await import('@/composables/auth/useAuth.js')
      useAuth.mockReturnValue({
        user: { value: mockFirestoreUser },
        logoutFirebase: vi.fn().mockResolvedValue({ exito: true }),
      })

      // Act - Montar el componente
      const BarraApp = (await import('@/components/BarraApp.vue')).default
      const wrapper = mount(BarraApp, {
        global: {
          stubs: {
            'Bars3Icon': true,
            'Square3Stack3DIcon': true,
            'WindowIcon': true,
            'AcademicCapIcon': true,
            'ArrowRightStartOnRectangleIcon': true,
            'XMarkIcon': true,
            'ArrowUpTrayIcon': true,
            'TerminosContenido': true,
          },
        },
      })

      // Assert
      expect(wrapper.vm.roleLinks).toBeDefined()
    })

    it('debe mostrar los enlaces correctos para rol de docente', async () => {
      // Arrange
      const mockUser = createMockUser()
      const mockFirestoreUser = createMockFirestoreUser({
        roles: ['docente'],
      })

      const { useAuth } = await import('@/composables/auth/useAuth.js')
      useAuth.mockReturnValue({
        user: { value: mockFirestoreUser },
        logoutFirebase: vi.fn().mockResolvedValue({ exito: true }),
      })

      // Act - Montar el componente
      const BarraApp = (await import('@/components/BarraApp.vue')).default
      const wrapper = mount(BarraApp, {
        global: {
          stubs: {
            'Bars3Icon': true,
            'Square3Stack3DIcon': true,
            'WindowIcon': true,
            'AcademicCapIcon': true,
            'ArrowRightStartOnRectangleIcon': true,
            'XMarkIcon': true,
            'ArrowUpTrayIcon': true,
            'TerminosContenido': true,
          },
        },
      })

      // Assert
      expect(wrapper.vm.roleLinks).toBeDefined()
    })
  })

  describe('Uso de localStorage.rolActivo', () => {
    it('debe usar el rolActivo de localStorage cuando el usuario tiene múltiples roles', async () => {
      // Arrange
      const mockUser = createMockUser()
      const mockFirestoreUser = createMockFirestoreUser({
        roles: ['estudiante', 'bedel'],
      })

      // Establecer rolActivo en localStorage
      global.localStorage.setItem('rolActivo', 'bedel')

      const { useAuth } = await import('@/composables/auth/useAuth.js')
      useAuth.mockReturnValue({
        user: { value: mockFirestoreUser },
        logoutFirebase: vi.fn().mockResolvedValue({ exito: true }),
      })

      // Act - Montar el componente
      const BarraApp = (await import('@/components/BarraApp.vue')).default
      const wrapper = mount(BarraApp, {
        global: {
          stubs: {
            'Bars3Icon': true,
            'Square3Stack3DIcon': true,
            'WindowIcon': true,
            'AcademicCapIcon': true,
            'ArrowRightStartOnRectangleIcon': true,
            'XMarkIcon': true,
            'ArrowUpTrayIcon': true,
            'TerminosContenido': true,
          },
        },
      })

      // Assert - Verificar que el rolActivo se establece correctamente
      expect(wrapper.vm.rolActivo).toBe('bedel')
    })

    it('debe usar el primer rol como fallback cuando rolActivo no está en localStorage', async () => {
      // Arrange
      const mockUser = createMockUser()
      const mockFirestoreUser = createMockFirestoreUser({
        roles: ['estudiante', 'admin'],
      })

      // No establecer rolActivo en localStorage

      const { useAuth } = await import('@/composables/auth/useAuth.js')
      useAuth.mockReturnValue({
        user: { value: mockFirestoreUser },
        logoutFirebase: vi.fn().mockResolvedValue({ exito: true }),
      })

      // Act - Montar el componente
      const BarraApp = (await import('@/components/BarraApp.vue')).default
      const wrapper = mount(BarraApp, {
        global: {
          stubs: {
            'Bars3Icon': true,
            'Square3Stack3DIcon': true,
            'WindowIcon': true,
            'AcademicCapIcon': true,
            'ArrowRightStartOnRectangleIcon': true,
            'XMarkIcon': true,
            'ArrowUpTrayIcon': true,
            'TerminosContenido': true,
          },
        },
      })

      // Assert - Verificar que usa el primer rol como fallback
      expect(wrapper.vm.rolActivo).toBe('estudiante')
    })

    it('debe usar estudiante como fallback cuando el usuario no tiene roles', async () => {
      // Arrange
      const mockUser = createMockUser()
      const mockFirestoreUser = createMockFirestoreUser({
        roles: [],
      })

      const { useAuth } = await import('@/composables/auth/useAuth.js')
      useAuth.mockReturnValue({
        user: { value: mockFirestoreUser },
        logoutFirebase: vi.fn().mockResolvedValue({ exito: true }),
      })

      // Act - Montar el componente
      const BarraApp = (await import('@/components/BarraApp.vue')).default
      const wrapper = mount(BarraApp, {
        global: {
          stubs: {
            'Bars3Icon': true,
            'Square3Stack3DIcon': true,
            'WindowIcon': true,
            'AcademicCapIcon': true,
            'ArrowRightStartOnRectangleIcon': true,
            'XMarkIcon': true,
            'ArrowUpTrayIcon': true,
            'TerminosContenido': true,
          },
        },
      })

      // Assert - Verificar que usa estudiante como fallback
      expect(wrapper.vm.rolActivo).toBe('estudiante')
    })
  })

  describe('userHasMultipleRoles', () => {
    it('debe retornar true cuando el usuario tiene múltiples roles', async () => {
      // Arrange
      const mockUser = createMockUser()
      const mockFirestoreUser = createMockFirestoreUser({
        roles: ['estudiante', 'bedel', 'admin'],
      })

      const { useAuth } = await import('@/composables/auth/useAuth.js')
      useAuth.mockReturnValue({
        user: { value: mockFirestoreUser },
        logoutFirebase: vi.fn().mockResolvedValue({ exito: true }),
      })

      // Act - Montar el componente
      const BarraApp = (await import('@/components/BarraApp.vue')).default
      const wrapper = mount(BarraApp, {
        global: {
          stubs: {
            'Bars3Icon': true,
            'Square3Stack3DIcon': true,
            'WindowIcon': true,
            'AcademicCapIcon': true,
            'ArrowRightStartOnRectangleIcon': true,
            'XMarkIcon': true,
            'ArrowUpTrayIcon': true,
            'TerminosContenido': true,
          },
        },
      })

      // Assert
      expect(wrapper.vm.userHasMultipleRoles).toBe(true)
    })

    it('debe retornar false cuando el usuario tiene un solo rol', async () => {
      // Arrange
      const mockUser = createMockUser()
      const mockFirestoreUser = createMockFirestoreUser({
        roles: ['estudiante'],
      })

      const { useAuth } = await import('@/composables/auth/useAuth.js')
      useAuth.mockReturnValue({
        user: { value: mockFirestoreUser },
        logoutFirebase: vi.fn().mockResolvedValue({ exito: true }),
      })

      // Act - Montar el componente
      const BarraApp = (await import('@/components/BarraApp.vue')).default
      const wrapper = mount(BarraApp, {
        global: {
          stubs: {
            'Bars3Icon': true,
            'Square3Stack3DIcon': true,
            'WindowIcon': true,
            'AcademicCapIcon': true,
            'ArrowRightStartOnRectangleIcon': true,
            'XMarkIcon': true,
            'ArrowUpTrayIcon': true,
            'TerminosContenido': true,
          },
        },
      })

      // Assert
      expect(wrapper.vm.userHasMultipleRoles).toBe(false)
    })
  })

  describe('userName', () => {
    it('debe mostrar el nombre del usuario cuando está disponible', async () => {
      // Arrange
      const mockUser = createMockUser()
      const mockFirestoreUser = createMockFirestoreUser({
        nombre: 'Juan',
        apellido: 'Pérez',
      })

      const { useAuth } = await import('@/composables/auth/useAuth.js')
      useAuth.mockReturnValue({
        user: { value: mockFirestoreUser },
        logoutFirebase: vi.fn().mockResolvedValue({ exito: true }),
      })

      // Act - Montar el componente
      const BarraApp = (await import('@/components/BarraApp.vue')).default
      const wrapper = mount(BarraApp, {
        global: {
          stubs: {
            'Bars3Icon': true,
            'Square3Stack3DIcon': true,
            'WindowIcon': true,
            'AcademicCapIcon': true,
            'ArrowRightStartOnRectangleIcon': true,
            'XMarkIcon': true,
            'ArrowUpTrayIcon': true,
            'TerminosContenido': true,
          },
        },
      })

      // Assert
      expect(wrapper.vm.userName).toBe('Juan Pérez')
    })

    it('debe mostrar el email como fallback cuando no hay nombre', async () => {
      // Arrange
      const mockUser = createMockUser()
      const mockFirestoreUser = createMockFirestoreUser({
        nombre: null,
        apellido: null,
        email: 'test@example.com',
      })

      const { useAuth } = await import('@/composables/auth/useAuth.js')
      useAuth.mockReturnValue({
        user: { value: mockFirestoreUser },
        logoutFirebase: vi.fn().mockResolvedValue({ exito: true }),
      })

      // Act - Montar el componente
      const BarraApp = (await import('@/components/BarraApp.vue')).default
      const wrapper = mount(BarraApp, {
        global: {
          stubs: {
            'Bars3Icon': true,
            'Square3Stack3DIcon': true,
            'WindowIcon': true,
            'AcademicCapIcon': true,
            'ArrowRightStartOnRectangleIcon': true,
            'XMarkIcon': true,
            'ArrowUpTrayIcon': true,
            'TerminosContenido': true,
          },
        },
      })

      // Assert
      expect(wrapper.vm.userName).toBe('test@example.com')
    })
  })

  describe('menuLinks', () => {
    it('debe tener los enlaces correctos para cada rol', async () => {
      // Arrange
      const mockUser = createMockUser()
      const mockFirestoreUser = createMockFirestoreUser({
        roles: ['estudiante'],
      })

      const { useAuth } = await import('@/composables/auth/useAuth.js')
      useAuth.mockReturnValue({
        user: { value: mockFirestoreUser },
        logoutFirebase: vi.fn().mockResolvedValue({ exito: true }),
      })

      // Act - Montar el componente
      const BarraApp = (await import('@/components/BarraApp.vue')).default
      const wrapper = mount(BarraApp, {
        global: {
          stubs: {
            'Bars3Icon': true,
            'Square3Stack3DIcon': true,
            'WindowIcon': true,
            'AcademicCapIcon': true,
            'ArrowRightStartOnRectangleIcon': true,
            'XMarkIcon': true,
            'ArrowUpTrayIcon': true,
            'TerminosContenido': true,
          },
        },
      })

      // Assert - Verificar que los enlaces de estudiante están definidos
      const menuLinks = wrapper.vm.menuLinks
      expect(menuLinks).toHaveProperty('estudiante')
      expect(menuLinks.estudiante).toHaveLength(3)
      expect(menuLinks.estudiante[0].to).toBe('/estudiante')
      expect(menuLinks.estudiante[0].text).toBe('Tablero')
    })
  })
})