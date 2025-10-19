// src/composables/useAuth.js
import { ref, computed } from 'vue'
import { routerInstance } from '@/router/routerInstance'
import {
  auth,
  functions
} from '@/config/firebase'
import { httpsCallable } from 'firebase/functions'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail
} from 'firebase/auth'
import { obtenerUsuario } from './useUsuarios'

// Estado reactivo
const user = ref(null)
const estaCargando = ref(true)

// Promesa para asegurar que la inicialización de auth se complete una sola vez
let authReadyPromise = null
let resolveAuthReady = null

/**
 * Función para cargar datos del usuario desde Firestore
 */
async function loadUserData(uid) {
  try {
    const perfilFirestore = await obtenerUsuario(uid)
    // obtenerUsuario ya normaliza los roles a minúsculas
    return perfilFirestore
  } catch (error) {
    console.error('Error cargando datos de usuario:', error)
    return null
  }
}

/**
 * Verificar estado de autenticación (para usar en el router)
 */
function checkAuthState() {
  if (!authReadyPromise) {
    authReadyPromise = new Promise((resolve) => {
      resolveAuthReady = resolve
    })

    // onAuthStateChanged se ejecuta una vez al inicio y cada vez que cambia el estado de auth
    onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const perfilFirestore = await loadUserData(firebaseUser.uid)
        user.value = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          emailVerified: firebaseUser.emailVerified,
          ...perfilFirestore
        }
      } else {
        user.value = null
      }
      estaCargando.value = false

      // Si la promesa de inicialización aún no se ha resuelto, la resolvemos.
      if (resolveAuthReady) {
        resolveAuthReady()
        resolveAuthReady = null // Evita que se resuelva múltiples veces
      }
    })
  }

  // Devuelve la promesa existente para que las guardias del router puedan esperarla.
  return authReadyPromise
}

// Inicializar auth state al cargar el composable
checkAuthState()

export function useAuth() {
  const isLoggedIn = computed(() => !!user.value)
const userRole = computed(() => user.value?.roles?.[0] || null)
const userRoles = computed(() => user.value?.roles || [])

  /**
   * Login con Firebase y carga de datos de Firestore
   */
  async function loginFirebase(email, password) {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password)
      
      // Recargar datos del usuario después del login
      const perfilFirestore = await loadUserData(cred.user.uid)
      
      user.value = {
        uid: cred.user.uid,
        email: cred.user.email,
        emailVerified: cred.user.emailVerified,
        ...perfilFirestore
      }

      // Lógica de redirección
      const roles = perfilFirestore?.roles || [] // <-- CORRECCIÓN: Usar 'roles' en lugar de 'rol'
      if (roles.length > 1) {
        // Pasamos el UID para que la vista de selección pueda cargar los roles
        routerInstance.router.push({ name: 'seleccionar-rol', query: { uid: cred.user.uid } })
      } else if (roles.length === 1) {
        const rol = roles[0].toLowerCase()
        routerInstance.router.push(`/${rol}`)
      } else {
        routerInstance.router.push('/')
      }
      
      return { exito: true }
    } catch (error) {
      console.error('Error en login:', error.code)
      return { exito: false, error }
    }
  }

  /**
   * Registro de usuario
   */
  async function registrarUsuario(email, password) {
    try {
      const registrarConFuncion = httpsCallable(functions, 'registrarUsuario')
      const result = await registrarConFuncion({ email, password })
      
      await loginFirebase(email, password)
      
      console.log('✅ Usuario registrado y logueado exitosamente:', result.data.uid)
      return { exito: true }
      
    } catch (error) {
      console.error('Error en el registro (cliente):', error.message)
      
      // Manejo mejorado de errores
      if (error.code === 'functions/not-found') {
        return { exito: false, error: { message: 'auth/user-not-pre-approved-or-already-registered' } }
      } else if (error.code === 'functions/already-exists') {
        return { exito: false, error: { code: 'auth/email-already-in-use' } }
      } else if (error.code === 'functions/invalid-argument' && error.message.includes('weak-password')) {
        return { exito: false, error: { code: 'auth/weak-password' } }
      }
      
      return { exito: false, error }
    }
  }

  /**
   * Logout
   */
  async function logoutFirebase() {
    try {
      await signOut(auth)
      user.value = null
      routerInstance.router.push({ name: 'login' })
    } catch (error) {
      console.error('Error en logout:', error)
    }
  }

  /**
   * Reset password
   */
  async function resetPassword(email) {
    try {
      await sendPasswordResetEmail(auth, email)
      return { exito: true }
    } catch(error) {
      console.error('Error en reset password:', error.code)
      return { exito: false, error }
    }
  }

  return { 
    user, 
    isLoggedIn, 
    estaCargando,
    userRole,
    userRoles,
    checkAuthState,
    loginFirebase, 
    registrarUsuario,
    logoutFirebase, 
    resetPassword 
  }
}