<!-- src/views/LoginE.vue -->
<template>
  <div class="min-h-screen flex flex-col bg-gradient-to-br from-teal-600 to-gray-600">
    <!-- Contenedor principal centrado -->
    <main class="flex-1 flex items-center justify-center p-4">
      <div class="max-w-4xl w-full grid md:grid-cols-3 bg-white rounded-xl shadow-2xl overflow-hidden">
        <!-- Panel izquierdo -->
        <div class="md:col-span-1 bg-teal-600 text-white flex flex-col items-center justify-center p-8">
          <img src="/logoesmn140.png" alt="Logo ESMN" class="max-h-36 mb-4">
          <h1 class="text-2xl font-light">RAC - ESMN</h1>
          <p class="font-light text-sm text-center opacity-80 mt-1">Sistema interno de gestión educativa</p>
        </div>

        <!-- Panel derecho -->
        <div class="md:col-span-2 p-8">
          <h2 class="text-xl font-semibold text-center mb-6">Acceso Estudiantes</h2>

          <form @submit.prevent="login" class="space-y-5">
            <!-- Email -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <div class="relative">
                <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <i class="fas fa-user text-gray-400"></i>
                </span>
                <input
                  v-model="email"
                  type="email"
                  placeholder="Tu email"
                  class="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  required
                />
              </div>
            </div>

            <!-- Contraseña -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <div class="relative">
                <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <i class="fas fa-lock text-gray-400"></i>
                </span>
                <input
                  v-model="password"
                  type="password"
                  placeholder="••••••"
                  autocomplete="current-password"
                  class="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  required
                />
              </div>
            </div>

            <!-- Recordarme -->
            <label class="flex items-center text-sm text-gray-600">
              <input v-model="remember" type="checkbox" class="mr-2 rounded" />
              No me olvides
            </label>

            <!-- Botón -->
            <button
              type="submit"
              :disabled="loading"
              class="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2.5 rounded-md disabled:opacity-60"
            >
              {{ loading ? 'Ingresando…' : 'Ingresar' }}
            </button>

            <!-- Links auxiliares -->
            <p class="text-xs text-center text-gray-500 space-x-2">
              <a href="#" class="hover:underline">¿Olvidaste tu contraseña?</a>
              <span>|</span>
              <a href="#" class="hover:underline">¿No tienes cuenta?</a>
            </p>
          </form>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/config/firebase'
import { vincularUsuario } from '@/scripts/vincular.js'

const email    = ref('')
const password = ref('')
const remember = ref(false)
const loading  = ref(false)
const error    = ref('')

const router = useRouter()

const login = async () => {
  loading.value = true
  error.value   = ''
  try {
    await signInWithEmailAndPassword(auth, email.value, password.value)
    await vincularUsuario(auth.currentUser.uid, auth.currentUser.email)
    router.push('/dashboard')
  } catch (e) {
    error.value =
      e.code === 'auth/user-not-found'
        ? 'Usuario no encontrado'
        : e.code === 'auth/wrong-password'
        ? 'Contraseña incorrecta'
        : 'Error al ingresar'
  } finally {
    loading.value = false
  }
}
</script>