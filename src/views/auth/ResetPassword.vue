<template>
  <!-- panel derecho -->
  <form @submit.prevent="sendReset">
    <h2 class="text-xl font-semibold text-stone-600 mb-4">Restablecer contraseña</h2>
    <label class="block text-sm text-stone-600 mb-1">Email</label>
    <input
      v-model="email"
      type="email"
      required
      class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-teal-500"
      >
      <button
        type="submit"
        class="w-full bg-teal-600 text-white py-2 rounded hover:bg-teal-700 mt-4"
      >
        Enviar enlace
      </button>

      <button
        type="button"
        @click="router.back()"
        class="text-xs text-stone-600 hover:text-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500 rounded px-2 py-1 mt-4"
      >
        Volver
      </button>
  </form>
</template>

<script setup>
import { ref } from 'vue'
import { getAuth, sendPasswordResetEmail } from 'firebase/auth'
import { useRouter } from 'vue-router'

const router = useRouter()
const auth = getAuth()
const email = ref('')

async function sendReset() {
  try {
    await sendPasswordResetEmail(auth, email.value)
    alert('Te enviamos un enlace a tu correo.')
    router.push('/')
  } catch (e) {
    alert(e.message)
  }
}
</script>