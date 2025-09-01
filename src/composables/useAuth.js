// src/composables/useAuth.js
import { ref, computed } from 'vue'
import { auth } from '@/config/firebase'
import { onAuthStateChanged } from 'firebase/auth'

const user = ref(null)

onAuthStateChanged(auth, (firebaseUser) => {
  user.value = firebaseUser
})

export function useAuth() {
  const isLoggedIn = computed(() => !!user.value)
  const email = computed(() => user.value?.email || '')

  return { user, isLoggedIn, email }
}