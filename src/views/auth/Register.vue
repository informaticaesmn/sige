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
      
      <button
        type="submit"
        class="btn btn-primary w-full my-4"
        :class="{ 'opacity-50 cursor-not-allowed': isLoading }"
        @click="handleRegister"
      >
        {{ isLoading ? 'Registrando...' : 'Confirmar registro' }}
      </button>
      <!-- tenemos que agregar terminos y condiciones y politica de privacidad??? -->
      <div class="text-center text-xs text-stone-400">
        <FormCheckbox 
          id="terms"
          v-model="acceptTerms"
          class="inline-block"
        />
        <span>Al registrarte, aceptás nuestros  </span>
        <button class="btn-min"
          type="button"
          @click="() => router.push('/terminos')"
        >Términos y Condiciones</button>
      </div>


    <button
      type="button"
      @click="() => router.push('/')"
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
import FormCheckbox from '@/components/ui/FormCheckbox.vue'

const router = useRouter()
const { registrarUsuario } = useAuth()

const email = ref('')
const password = ref('')
const passwordConfirm = ref('')

const emailError = ref('')
const passwordError = ref('')
const passwordConfirmError = ref('')
const errorMessage = ref('') // Para errores generales
const acceptTerms = ref(false)

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
  if (isLoading.value) return

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
      if (error?.code === 'auth/weak-password') {
        errorMessage.value = 'La contraseña es demasiado débil. Debe tener al menos 6 caracteres.'
      } else if (error?.message === 'auth/user-not-pre-approved-or-already-registered' || error?.code === 'auth/email-already-in-use') {
        errorMessage.value = 'Error: su mail no se encuentra entre los usuarios con registro pendiente. Si cree que esto es un error y su mail es el que usa para el acceso al campus, por favor comuníquese con Bedelía.'
      } else {
        errorMessage.value = 'Ocurrió un error inesperado durante el registro.'
      }
    }
  } finally {
    isLoading.value = false
  }
}
</script>
