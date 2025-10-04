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
        :error="emailError"
      />
      
      <button
        type="button"
        class="btn btn-primary w-full my-4"
        @click="sendReset"
        >
        Enviar enlace
      </button>
    
      <button
        type="button"
        @click="router.back()"
        class="btn btn-link mt-2"
        >
        Volver
      </button>
    </div>
  </form>
</template> 

<script setup>
import { ref } from 'vue'
import { getAuth, sendPasswordResetEmail } from 'firebase/auth'
import { useRouter } from 'vue-router'
import FormInput from '@/components/ui/FormInput.vue'

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