// src/composables/useBarraApp.js
//
// Estado y lógica de `src/components/BarraApp.vue` (barra de navegación
// superior). Encapsula el menú mobile, el menú de usuario, la derivación del
// rol activo y los enlaces por rol, y las acciones de navegación y salida
// (AGENTS.md §3). El componente queda como consumidor "tonto".
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/auth/useAuth'
import {
  AcademicCapIcon,
  ArrowUpTrayIcon,
  Square3Stack3DIcon,
  WindowIcon
} from '@heroicons/vue/24/outline'

/** Enlaces de navegación del menú superior, por rol. */
export const MENU_LINKS = {
  estudiante: [
    { to: '/estudiante', text: 'Tablero', icon: WindowIcon },
    { to: '/estudiante/inscripciones', text: 'Inscripciones', icon: Square3Stack3DIcon },
    { to: '/estudiante/historial', text: 'Historial', icon: AcademicCapIcon }
  ],
  admin: [
    { to: '/admin', text: 'Tablero Admin', icon: WindowIcon }
  ],
  bedel: [
    { to: '/bedel', text: 'Tablero Bedel', icon: WindowIcon },
    { to: '/bedel/inscripciones', text: 'Confirmar Inscripciones', icon: Square3Stack3DIcon }
  ],
  coordinacion: [
    { to: '/coordinacion', text: 'Tablero Coordinación', icon: WindowIcon },
    { to: '/coordinacion/carga', text: 'Carga de Datos', icon: ArrowUpTrayIcon },
    { to: '/coordinacion/editor-planes', text: 'Editor de Planes', icon: AcademicCapIcon }
  ],
  docente: [
    { to: '/docente', text: 'Tablero Docente', icon: WindowIcon }
  ]
}

/**
 * Composable de la barra de navegación.
 */
export function useBarraApp() {
  const { user, logoutFirebase } = useAuth()
  const router = useRouter()

  const menuOpen = ref(false)
  const userMenuOpen = ref(false)
  const showTerminos = ref(false)

  /**
   * Rol activo: el guardado en `localStorage` si el usuario lo tiene; si no, el
   * primer rol del usuario (`estudiante` como último fallback).
   */
  const rolActivo = computed(() => {
    const rolGuardado = localStorage.getItem('rolActivo')
    if (rolGuardado && user.value?.roles?.includes(rolGuardado)) {
      return rolGuardado
    }
    return user.value?.roles?.[0] || 'estudiante'
  })

  /** `true` si el usuario tiene más de un rol. */
  const userHasMultipleRoles = computed(
    () => Array.isArray(user.value?.roles) && user.value.roles.length > 1
  )

  /** Nombre completo (nombre + apellido) con fallback a email. */
  const userName = computed(() => {
    const nombreCompleto = [user.value?.nombre, user.value?.apellido]
      .filter(Boolean)
      .join(' ')
      .trim()
    return nombreCompleto || user.value?.email || 'Usuario'
  })

  /** Enlaces del menú superior para el rol activo. */
  const roleLinks = computed(() => MENU_LINKS[rolActivo.value] || [])

  /** Abre/cierra el menú mobile. */
  function toggleMenu() {
    menuOpen.value = !menuOpen.value
  }

  /** Abre/cierra el menú de usuario. */
  function toggleUserMenu() {
    userMenuOpen.value = !userMenuOpen.value
  }

  /** Cierra el menú de usuario. */
  function closeUserMenu() {
    userMenuOpen.value = false
  }

  /**
   * Navega a una ruta y, opcionalmente, cierra los menús abiertos.
   * @param {string|Object} path
   * @param {boolean} [closeMenus]
   */
  function navigate(path, closeMenus = false) {
    if (closeMenus) {
      menuOpen.value = false
      userMenuOpen.value = false
    }
    router.push(path)
  }

  /** Cierra la sesión y vuelve al inicio. */
  async function logout() {
    await logoutFirebase()
    router.push('/')
  }

  /**
   * Solicitar baja de usuario — funcionalidad pendiente de implementar.
   * @todo: Implementar el flujo de solicitud de baja con validación y confirmación.
   */
  function solicitarBaja() {
    console.warn('[TODO] Solicitar Baja: funcionalidad no implementada todavía')
  }

  return {
    user,
    menuOpen,
    userMenuOpen,
    showTerminos,
    rolActivo,
    userHasMultipleRoles,
    userName,
    menuLinks: MENU_LINKS,
    roleLinks,
    toggleMenu,
    toggleUserMenu,
    closeUserMenu,
    navigate,
    logout,
    solicitarBaja
  }
}
