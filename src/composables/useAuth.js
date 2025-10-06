// src/composables/useAuth.js
import { ref, computed } from 'vue'
import { auth } from '@/config/firebase'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  createUserWithEmailAndPassword
} from 'firebase/auth'
// Necesitaremos interactuar con Firestore desde aquí
import { verificarPerfilPreAprobado, migrarPerfilARegistroCompleto } from './useUsuarios'

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
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password)
      // La magia sucede en onAuthStateChanged, que se disparará automáticamente
      // y cargará el perfil completo.
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
    // 1. Verificar si el usuario está pre-aprobado en Firestore
    const perfilTemporal = await verificarPerfilPreAprobado(email)

    if (!perfilTemporal) {
      throw new Error('auth/user-not-pre-approved-or-already-registered')
    }

    // 2. Si es válido, crear el usuario en Auth
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    const nuevoUid = cred.user.uid

    // 3. Migrar el documento de Firestore al nuevo UID
    await migrarPerfilARegistroCompleto(email, nuevoUid, perfilTemporal)
    
    console.log('✅ Usuario registrado y vinculado exitosamente:', nuevoUid)
    return { exito: true }
    
  } catch (error) {
    console.error('Error en el registro:', error.message)
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