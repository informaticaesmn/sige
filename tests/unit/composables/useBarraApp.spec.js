/**
 * Tests unitarios para useBarraApp.js
 *
 * Valida la derivación del rol activo, los datos de usuario, los enlaces por
 * rol y las acciones del menú (navegación, cierre de menús y logout).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockLocalStorage } from '../mocks/firebaseMocks.js'

const h = vi.hoisted(() => ({
  user: null,
  logout: null,
  push: null
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: h.push })
}))

vi.mock('@/composables/auth/useAuth.js', async () => {
  const { ref } = await import('vue')
  h.user = ref(null)
  h.logout = vi.fn(() => Promise.resolve({ exito: true }))
  h.push = vi.fn()
  return {
    useAuth: () => ({ user: h.user, logoutFirebase: h.logout })
  }
})

import { MENU_LINKS, useBarraApp } from '@/composables/useBarraApp.js'

beforeEach(() => {
  global.localStorage = mockLocalStorage()
  h.user.value = null
})

describe('useBarraApp.js', () => {
  it('usa el rolActivo de localStorage cuando el usuario lo tiene', () => {
    h.user.value = { roles: ['estudiante', 'bedel'] }
    localStorage.setItem('rolActivo', 'bedel')

    const { rolActivo, roleLinks } = useBarraApp()

    expect(rolActivo.value).toBe('bedel')
    expect(roleLinks.value).toEqual(MENU_LINKS.bedel)
  })

  it('cae al primer rol cuando rolActivo no está en localStorage', () => {
    h.user.value = { roles: ['estudiante', 'admin'] }

    expect(useBarraApp().rolActivo.value).toBe('estudiante')
  })

  it('cae a estudiante cuando el usuario no tiene roles', () => {
    h.user.value = { roles: [] }

    expect(useBarraApp().rolActivo.value).toBe('estudiante')
  })

  it('userHasMultipleRoles distingue uno y varios roles', () => {
    h.user.value = { roles: ['estudiante', 'bedel'] }
    expect(useBarraApp().userHasMultipleRoles.value).toBe(true)

    h.user.value = { roles: ['estudiante'] }
    expect(useBarraApp().userHasMultipleRoles.value).toBe(false)
  })

  it('userName prioriza nombre completo y cae al email', () => {
    h.user.value = { nombre: 'Juan', apellido: 'Pérez', email: 'j@test.com' }
    expect(useBarraApp().userName.value).toBe('Juan Pérez')

    h.user.value = { nombre: null, apellido: null, email: 'j@test.com' }
    expect(useBarraApp().userName.value).toBe('j@test.com')

    h.user.value = {}
    expect(useBarraApp().userName.value).toBe('Usuario')
  })

  it('navigate cierra los menús cuando se pide y hace push', () => {
    const { menuOpen, userMenuOpen, navigate } = useBarraApp()
    menuOpen.value = true
    userMenuOpen.value = true

    navigate('/planes-estudio', true)

    expect(menuOpen.value).toBe(false)
    expect(userMenuOpen.value).toBe(false)
    expect(h.push).toHaveBeenCalledWith('/planes-estudio')
  })

  it('logout cierra la sesión y vuelve al inicio', async () => {
    const { logout } = useBarraApp()
    await logout()

    expect(h.logout).toHaveBeenCalledTimes(1)
    expect(h.push).toHaveBeenCalledWith('/')
  })

  it('alterna y cierra el menú de usuario', () => {
    const { userMenuOpen, toggleUserMenu, closeUserMenu, toggleMenu, menuOpen } = useBarraApp()

    toggleUserMenu()
    expect(userMenuOpen.value).toBe(true)
    closeUserMenu()
    expect(userMenuOpen.value).toBe(false)

    toggleMenu()
    expect(menuOpen.value).toBe(true)
  })
})
