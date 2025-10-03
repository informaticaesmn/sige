<!-- src/views/auth/Register.vue -->
<template>
  <form @submit.prevent="register" class="w-full max-w-sm">
    <div class="space-y-4">
    <h2 class="mb-6">Registrate</h2>
      <FormInput
        id="email"
        name="email"  
        label="Email"
        type="email"
        v-model="email"
        :error="emailError"
      />
      <FormInput
        id="password"
        name="password"
        label="Contraseña"
        type="password"
        v-model="password"
        :error="passwordError"
      />
      <FormInput
        id="passwordConfirm"
        name="passwordConfirm"
        label="Repetir contraseña"
        type="password"
        v-model="passwordConfirm"
        :error="passwordConfirmError"
      />
      
      <button type="submit" class="btn btn-primary w-full my-4">
        Confirmar registro
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
