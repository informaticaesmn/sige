<!-- src/views/auth/Register.vue -->
<template>
      <!-- panel derecho (solo registro) -->
      <div class="bg-white p-8 flex items-center justify-center">
        <form @submit.prevent="register" class="w-full max-w-sm">
          <h2 class="text-xl font-semibold text-stone-600 mb-4">Registrate</h2>

          <FormInput v-model="email" label="Email" type="email" :error="emailError" />
          <FormInput v-model="password" label="Contraseña" type="password" :error="passwordError" />
          <FormInput v-model="passwordConfirm" label="Repetir contraseña" type="password" :error="passwordConfirmError" />

          <button type="submit" class="w-full bg-teal-600 text-white py-2 rounded hover:bg-teal-700">
            Registrarse
          </button>
          <button
              type="button"
              @click="router.back()"
              class="text-sm text-stone-600 hover:text-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500
                    rounded px-2 py-1 mt-4">
              Volver
          </button>
        </form>
        
      </div>



</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore/lite'
import { auth, db } from '@/config/firebase.js'
import { vincularUsuario } from '@/scripts/vincular.js'
import FormInput from '@/components/auth/FormInput.vue'

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

  if (!email.value) 
    { emailError.value = 'Ingresá tu email'; return }
  if (!password.value) 
    { passwordError.value = 'Ingresá tu contraseña'; return }
  if (password.value !== passwordConfirm.value)
    { passwordConfirmError.value = 'Las contraseñas no coinciden'; return }

  try {
    await createUserWithEmailAndPassword(auth, email.value, password.value)

    // vincular con rol
    await vincularUsuario(auth.currentUser.uid, auth.currentUser.email)

    router.push('/estudiante')
  } catch (e) {
    alert(e.message)
  }
}
</script>