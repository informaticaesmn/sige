<!-- src/views/auth/Register.vue -->
<template>
  <form @submit.prevent="handleRegister" class="w-full max-w-sm">
    <div class="space-y-4">
    <h2 class="mb-6">Registrate</h2>
      <FormInput
        id="email"
        label="Email"
        type="email"
        name="email"  
        v-model="email"
        placeholder="mail con el que accedés al campus de la ESMN"
        autocomplete="email"
        :error="emailError"
      />
      <FormInput
        id="password"
        label="Contraseña"
        type="password"
        name="password"
        v-model="password"
        placeholder="••••••"
        autocomplete="new-password"
        :error="passwordError"
      />
      <FormInput
        id="passwordConfirm"
        label="Repetir contraseña"
        type="password"
        name="passwordConfirm"
        v-model="passwordConfirm"
        placeholder="••••••"
        autocomplete="new-password"
        :error="passwordConfirmError"
      />
      
      <!-- Mensaje de error general -->
      <p v-if="errorMessage" class="alert alert-danger">
        {{ errorMessage }}
      </p>
      
      <button type="submit" class="btn btn-primary w-full my-4" :disabled="isLoading || !isFormValid">
        {{ isLoading ? 'Registrando...' : 'Confirmar registro' }}
      </button>
    <!--   <button
        type="button"
        @click="router.back()"
        class="btn btn-link mt-2"
        > Volver
    </button> -->

    <button
      type="button"
      @click="() => router.push('/login')"
      class="btn btn-link mt-2"
      >¿Ya tenés cuenta? Ingresá
    </button>

  </div>
  </form>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth.js'
import FormInput from '@/components/ui/FormInput.vue'

const router = useRouter()
const { registrarUsuario } = useAuth()

const email = ref('')
const password = ref('')
const passwordConfirm = ref('')

const emailError = ref('')
const passwordError = ref('')
const passwordConfirmError = ref('')
const errorMessage = ref('') // Para errores generales

const isLoading = ref(false)

const isFormValid = computed(() => {
  return email.value && password.value && password.value === passwordConfirm.value && password.value.length >= 6
})

function validateForm() {
  emailError.value = ''
  passwordError.value = ''
  passwordConfirmError.value = ''
  let isValid = true

  if (!email.value) { emailError.value = 'Ingresá tu email'; isValid = false }
  if (password.value.length < 6) { passwordError.value = 'La contraseña debe tener al menos 6 caracteres'; isValid = false }
  if (password.value !== passwordConfirm.value) { passwordConfirmError.value = 'Las contraseñas no coinciden'; isValid = false }
  
  return isValid
}

async function handleRegister() {
  errorMessage.value = ''
  if (!validateForm()) return

  isLoading.value = true
  try {
    const { exito, error } = await registrarUsuario(email.value, password.value)

    if (exito) {
      // El onAuthStateChanged en useAuth se encargará de redirigir o actualizar el estado.
      // Si se necesita una redirección específica post-registro, aquí es el lugar.
      router.push('/estudiante') // O a una página de "Bienvenido"
    } else {
      if (error.message === 'auth/user-not-pre-approved-or-already-registered') {
        errorMessage.value = 'Tu email no está en la lista de usuarios habilitados para registrarse, o ya te has registrado. Contacta a Bedelía.'
      } else if (error.code === 'auth/email-already-in-use') {
        errorMessage.value = 'El email ya está en uso por otra cuenta. Si olvidaste tu contraseña, puedes restablecerla.'
      } else {
        errorMessage.value = 'Ocurrió un error inesperado durante el registro.'
      }
    }
  } finally {
    isLoading.value = false
  }
}
</script>
