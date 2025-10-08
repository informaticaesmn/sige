// src/composables/useAuth.js
import { ref, computed } from 'vue'
import { auth, functions } from '@/config/firebase'
import { httpsCallable } from 'firebase/functions' // Importar httpsCallable
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword, // No estaba, pero debería estar para la función original
  signOut,
  sendPasswordResetEmail
} from 'firebase/auth'
// Necesitaremos interactuar con Firestore desde aquí
import { obtenerUsuario } from './useUsuarios'

// El 'user' ahora contendrá tanto datos de Auth como de Firestore
const user = ref(null)
const estaCargando = ref(true)

onAuthStateChanged(auth, async (firebaseUser) => {
  if (firebaseUser) {
    // Cuando el usuario se autentica, enriquecemos el objeto 'user'
    // con los datos de nuestro perfil de Firestore (roles, nombre, etc.)
    const perfilFirestore = await obtenerUsuario(firebaseUser.uid)
    user.value = {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      ...perfilFirestore // Expandimos los datos del perfil aquí
    }
  } else {
    user.value = null
  }
  estaCargando.value = false
})

export function useAuth() {
  const isLoggedIn = computed(() => !!user.value)

  /**
   * Login con Firebase y carga de datos de Firestore
   */
  async function loginFirebase(email, password) {
    // Necesitamos el router aquí para poder redirigir
    const router = (await import('@/router')).default

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password)
      // La magia sucede en onAuthStateChanged, que se disparará automáticamente
      // y cargará el perfil completo.
      router.push('/') // Forzamos la re-evaluación de la guardia de navegación
      return { exito: true, user: cred.user }
    } catch (error) {
      console.error('Error en login:', error.code)
      // Devolvemos el error para que la UI pueda mostrar un mensaje
      return { exito: false, error }
    }
  }

  /**
   * Registro de un usuario que YA DEBE existir en Firestore
   */
  async function registrarUsuario(email, password) {
    try {
      // 1. Llamar a la Cloud Function para que haga el trabajo pesado
      const registrarConFuncion = httpsCallable(functions, 'registrarUsuario')
      const result = await registrarConFuncion({ email, password })
      
      // 2. Si la Cloud Function tuvo éxito, hacemos login en el cliente
      await loginFirebase(email, password)
      
      // El onAuthStateChanged se encargará de poblar el 'user' reactivo.
      console.log('✅ Usuario registrado y logueado exitosamente:', result.data.uid)
      return { exito: true }
      
    } catch (error) {
      console.error('Error en el registro (cliente):', error.message)
      // La Cloud Function devuelve errores con un formato específico que podemos usar.
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
    await signOut(auth)
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
    loginFirebase, 
    registrarUsuario,
    logoutFirebase, 
    resetPassword 
  }
}