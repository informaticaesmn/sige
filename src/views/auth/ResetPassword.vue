<template>
  <!-- panel derecho -->
  <form @submit.prevent="sendReset" class="w-full max-w-sm">
    <div class="space-y-4">
    <h2 class="mb-6">Restablecer contraseña</h2>
      <!-- Email -->
      <FormInput
        id="email"
        label="Email"
        name="email"
        type="email"
        v-model="email"
        :error="errorMensaje"
      />

      <!-- Mensaje de éxito -->
      <div v-if="exitoMensaje" class="bg-green-100 text-green-800 text-sm p-3 rounded-md">
        {{ exitoMensaje }}
      </div>

      <button
        type="submit"
        class="btn btn-primary w-full my-4"
        :disabled="enviando"
      >
        {{ enviando ? 'Enviando...' : 'Enviar enlace' }}
      </button>

      <button
        type="button"
        @click="router.back()"
        class="btn btn-link mt-2"
      >
        Volver al Ingreso
      </button>
    </div>
  </form>
</template> 

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/auth/useAuth'
import FormInput from '@/components/ui/FormInput.vue'

const router = useRouter()
const { resetPassword } = useAuth()

const email = ref('')
const errorMensaje = ref('')
const exitoMensaje = ref('')
const enviando = ref(false)

/**
 * Envía el enlace de recuperación de contraseña usando el composable useAuth.
 * Evita importar directamente de firebase/auth (ver AGENTS.md §4).
 */
async function sendReset() {
  errorMensaje.value = ''
  exitoMensaje.value = ''
  enviando.value = true

  const result = await resetPassword(email.value)

  if (result.exito) {
    exitoMensaje.value = 'Te enviamos un enlace a tu correo.'
    // Redirigir al login después de mostrar el mensaje
    setTimeout(() => router.push('/'), 3000)
  } else {
    errorMensaje.value = result.error?.message || 'Error al enviar el enlace.'
  }

  enviando.value = false
}
</script>