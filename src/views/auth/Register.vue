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
        info="Mínimo 6 caracteres"
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
      
      <button type="submit" class="btn btn-primary w-full my-4" :disabled="isLoading">
        {{ isLoading ? 'Registrando...' : 'Confirmar registro' }}
      </button>
      <button
        type="button"
        @click="router.back()"
        class="btn btn-link mt-2"
        > Volver
    </button>

    <router-link to="/auth/login" class="btn btn-link mt-2">
      ¿Ya tenés cuenta? Ingresá
    </router-link>
      
  </div>
  </form>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth'
import { vincularUsuario, crearUsuario } from '@/composables/useUsuarios.js'
import FormInput from '@/components/ui/FormInput.vue'

const router = useRouter()
const email = ref('')
const password = ref('')
const passwordConfirm = ref('')
const emailError = ref('')
const passwordError = ref('')
const passwordConfirmError = ref('')


async function register() {
  emailError.value = ''
  passwordError.value = ''
  passwordConfirmError.value = ''

  if (!email.value) { emailError.value = 'Ingresá tu email'; return }
  if (!password.value) { passwordError.value = 'Ingresá tu contraseña'; return }
  if (password.value !== passwordConfirm.value) { passwordConfirmError.value = 'Las contraseñas no coinciden'; return }

  try {
    const authInstance = getAuth()
    await createUserWithEmailAndPassword(authInstance, email.value, password.value)
    const uid = authInstance.currentUser.uid
    const userEmail = authInstance.currentUser.email

    // intentar vincular con doc existente, si no existe lo crea
    const vinculo = await vincularUsuario(uid, userEmail)
    if (!vinculo) {
      await crearUsuario(uid, userEmail)
    }

    // 🔹 Guardar rol activo en localStorage
    const usuario = await obtenerUsuario(uid)      // traer datos actualizados
    if (usuario.roles && usuario.roles.length > 0) {
      localStorage.setItem('rolActivo', usuario.roles[0]) // el primer rol por defecto
    }

    router.push('/estudiante')
  } catch (e) {
    console.error('Error en registro o vinculación:', e)
    if (e.code === 'auth/email-already-in-use') {
      alert('El email ya está registrado. En caso de no recordar la contraseña, ir a restablecer contraseña')
      return
    }
    alert(e.message)
  }
}
</script>
