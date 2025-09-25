<template>
  <div class="min-h-screen flex flex-col">
    <main class="flex-1 grid md:grid-cols-2">
      <!-- panel izquierdo -->
      <div class="bg-teal-800 text-white p-8 flex items-center justify-center">
        <div class="text-center">
          <img src="/avatar.png" alt="Logo ESMN" class="w-24 mx-auto mb-4">
          <h1 class="text-2xl">SIGE - ESMN</h1>
          <p class="text-sm opacity-80">Sistema Interno de Gestión Educativa</p>
        </div>
      </div>

      <!-- panel derecho -->
      <div class="bg-white p-8 flex items-center justify-center">
        <div class="max-w-sm mx-auto p-8">
          <h1 class="text-2xl font-bold mb-4">Restablecer contraseña</h1>

          <form @submit.prevent="sendReset">
            <label class="block text-sm font-medium mb-1">Email</label>
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
          </form>

          <button
            type="button"
            @click="router.back()"
            class="text-sm text-gray-500 hover:text-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500 rounded px-2 py-1 mt-4"
          >
            Volver
          </button>
        </div>
      </div>
    </main>
  </div>
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