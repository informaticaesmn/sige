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
          
          <form @submit.prevent="login" class="w-full max-w-sm">
            <!-- Título dinámico -->
            <h2 class="text-xl font-semibold mb-6 text-center">
              {{ isRegisterMode ? 'Registro' : 'Acceso' }}
            </h2>
  
            <!-- Mensaje de error visible -->
            <div v-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4 text-sm" role="alert">
              <span>{{ error }}</span>
            </div>
          <FormInput
            id="email"
            label="Email"
            type="email"
            v-model="email"
            :error="emailError"
          />
          <FormInput
            id="password"
            label="Contraseña"
            type="password"
            v-model="password"
            :error="passwordError"
          />

          <button
            type="submit"
            class="w-full bg-teal-600 text-white py-2 rounded hover:bg-teal-700"
          >
            Ingresar
          </button>

          <AuthFooter
            :isRegisterMode="isRegisterMode"
            @reset="goToReset"
            @toggle="toggleMode"
          />
        </form>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore/lite'
import { auth, db } from '@/config/firebase.js'
import { vincularUsuario } from '@/scripts/vincular.js'
import AuthHeader from '@/components/auth/AuthHeader.vue'
import FormInput from '@/components/auth/FormInput.vue'
import AuthFooter from '@/components/auth/AuthFooter.vue'

const router = useRouter()
const email = ref('')
const password = ref('')
const emailError = ref('')
const passwordError = ref('')
const isRegisterMode = ref(false)

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

function toggleMode() {
  isRegisterMode.value = !isRegisterMode.value
}
</script>