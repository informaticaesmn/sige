<!-- src/views/auth/Login.vue -->
<template>
    <!-- panel derecho (solo login) -->
    <div class="bg-white p-8 flex items-center justify-center">
        <form @submit.prevent="login" class="w-full max-w-sm">
            <h2 class="text-xl font-semibold text-stone-600 mb-4">Ingresar</h2>

            <FormInput v-model="email" label="Email" type="email" :error="emailError" />
            <FormInput v-model="password" label="Contraseña" type="password" :error="passwordError" />

            <button type="submit" class="w-full bg-teal-600 text-white py-2 rounded hover:bg-teal-700">
            Ingresar
            </button>

            <AuthFooter @reset="goToReset" @register="goToRegister" />
        </form>
    </div>
  
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore/lite'
import { auth, db } from '@/config/firebase.js'
import { vincularUsuario } from '@/scripts/vincular.js'
import AuthFooter from '@/components/auth/AuthFooter.vue'
import FormInput from '@/components/auth/FormInput.vue'

const router = useRouter()
const email = ref('')
const password = ref('')
const emailError = ref('')
const passwordError = ref('')

async function login() {
  emailError.value = ''
  passwordError.value = ''

  if (!email.value) { emailError.value = 'Ingresá tu email'; return }
  if (!password.value) { passwordError.value = 'Ingresá tu contraseña'; return }

  try {
    await signInWithEmailAndPassword(auth, email.value, password.value)

    // leer rol desde Firestore
    const userDoc = await getDoc(doc(db, 'Estudiantes', auth.currentUser.uid))
    if (!userDoc.exists()) {
      alert('Usuario no encontrado en base de datos')
      return
    }

    const roles = userDoc.data().roles   // ["student", "teacher", ...]

    if (roles.length === 1) {
      // un solo rol → directo
      if (roles[0] === 'student') router.push('/estudiante')
      if (roles[0] === 'admin') router.push('/admin')
      if (roles[0] === 'bedel') router.push('/bedel')
    } else {
      // múltiples roles → pantalla aparte
      router.push('/seleccionar-rol')
    }

    await vincularUsuario(auth.currentUser.uid, auth.currentUser.email)
  } catch (e) {
    console.error('Error en login o vinculación:', e)
    alert(e.message)
  }
}

function goToReset() {
  router.push('/reset-password')
}
function goToRegister() {
  router.push('/registro')
}
</script>