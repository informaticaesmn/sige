<!-- src/views/auth/Register.vue -->
<template>
  <form @submit.prevent="register" class="w-full max-w-sm">
    <h2 class="text-xl font-semibold text-stone-600 mb-4">Registrate</h2>

    <FormInput v-model="email" label="Email" type="email" :error="emailError" />
    <FormInput v-model="password" label="Contraseña" type="password" :error="passwordError" />
    <FormInput v-model="passwordConfirm" label="Repetir contraseña" type="password" :error="passwordConfirmError" />

    <button type="submit" class="w-full bg-teal-600 text-white py-2 rounded hover:bg-teal-700">
      Confirmar registro
    </button>
    <button
      type="button"
      @click="router.back()"
      class="text-xs text-stone-600 hover:text-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500 rounded px-2 py-1 mt-4">
      Volver
    </button>
  </form>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth'
import FormInput from '@/components/ui/FormInput.vue'
import { vincularUsuario, crearUsuario } from '@/composables/useUsuarios.js'

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
