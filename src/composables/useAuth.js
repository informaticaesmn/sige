// src/composables/useAuth.js
import { ref, computed } from 'vue'
import { auth } from '@/config/firebase'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail
} from 'firebase/auth'

const user = ref(null)

onAuthStateChanged(auth, (firebaseUser) => {
  user.value = firebaseUser
})

export function useAuth() {
  const isLoggedIn = computed(() => !!user.value)
  const email = computed(() => user.value?.email || '')

  /**
   * Login con Firebase
   */
  async function loginFirebase(email, password) {
    const cred = await signInWithEmailAndPassword(auth, email, password)
    return { uid: cred.user.uid, email: cred.user.email }
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
    await sendPasswordResetEmail(auth, email)
  }

  return { user, isLoggedIn, email, loginFirebase, logoutFirebase, resetPassword }
}
