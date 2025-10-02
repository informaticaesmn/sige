<template>
<!-- Estructura original-->
<div class="min-h-screen flex flex-col bg-gradient-to-br from-teal-600 to-stone-600">
    <main class="flex-1 flex items-center justify-center p-4">
      <div class="max-w-4xl w-full grid md:grid-cols-3 bg-white rounded-xl shadow-2xl overflow-hidden">
        <!-- Panel izquierdo (sin cambios) -->
        <div class="md:col-span-1 bg-teal-600 text-white flex flex-col items-center justify-center p-8">
          <img src="/avatar.png" alt="Logo ESMN" class="max-h-36 mb-4">
          <h1 class="text-2xl font-light">SIGE - ESMN</h1>
          <p class="font-light text-sm text-center opacity-80 mt-1">Sistema Interno de Gestión Educativa</p>
        </div>

        <!-- Panel derecho (con cambios) -->
        <div class="md:col-span-2 p-8">
          <!-- Título dinámico -->
          <h2 class="text-xl font-semibold text-center mb-6">
            {{ isRegisterMode ? 'Registro' : 'Acceso' }}
          </h2>

          <!-- Mensaje de error visible -->
          <div v-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4 text-sm" role="alert">
            <span>{{ error }}</span>
          </div>

          <!-- Cambiamos el @submit.prevent para llamar a la nueva función -->
          <form @submit.prevent="submitForm" class="space-y-5">
            <!-- Email (sin cambios) -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <div class="relative">
                <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <i class="fas fa-user text-gray-400"></i>
                </span>
                <input v-model="email" type="email" placeholder="Tu email" 
                  class="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500" required />
              </div>
            </div>

            <!-- Contraseña (sin cambios) -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <div class="relative">
                <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <i class="fas fa-lock text-gray-400"></i>
                </span>
                <input v-model="password" type="password" placeholder="••••••" autocomplete="current-password" 
                  class="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500" required />
              </div>
            </div>

            <!-- NUEVO: Campo para confirmar contraseña (solo en modo registro) -->
            <div v-if="isRegisterMode">
              <label class="block text-sm font-medium text-gray-700 mb-1">Confirmar Contraseña</label>
              <div class="relative">
                <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <i class="fas fa-lock text-gray-400"></i>
                </span>
                <input v-model="passwordConfirm" type="password" placeholder="••••••" 
                  class="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500" required />
              </div>
            </div>

            <!-- Recordarme (lo ocultamos en modo registro para simplificar) -->
            <label v-if="!isRegisterMode" class="flex items-center py-2 pb-9 text-sm text-gray-600">
              <input v-model="remember" type="checkbox" class="mr-2 rounded" />
              No me olvides
            </label>

            <!-- Botón dinámico -->
            <button type="submit" :disabled="loading" 
              class="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2.5 rounded-md disabled:opacity-60">
              <span v-if="loading">{{ isRegisterMode ? 'Registrando…' : 'Ingresando…' }}</span>
              <span v-else>{{ isRegisterMode ? 'Crear Cuenta' : 'Ingresar' }}</span>
            </button>

           <!-- Links auxiliares dinámicos -->
            <div class="text-xs text-center text-gray-500 flex items-center justify-center gap-2">
              <button
                v-if="!isRegisterMode"
                type="button"
                @click="goToReset"
                @keydown.space.prevent="goToReset"
                class="text-gray-500 hover:text-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500 rounded px-2 py-1"
              >
                ¿Olvidaste tu contraseña?
              </button>

              <span v-if="!isRegisterMode">|</span>

              <button
                type="button"
                @click="toggleMode"
                @keydown.space.prevent="toggleMode"
                class="text-gray-500 hover:text-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500 rounded px-2 py-1"
              >
                {{ isRegisterMode ? '¿Ya tenés cuenta? Ingresar' : '¿No tenés cuenta? Registrate' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
  import { ref, computed } from 'vue'
  import { useRouter } from 'vue-router'
  // Importa la función para crear usuarios
  import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth'
  import { auth } from '@/config/firebase'
  import { vincularUsuario } from '@/scripts/vincular.js'
  
  // --- Refs existentes ---
  const email = ref('')
  const password = ref('')
  const remember = ref(false)
  const loading = ref(false)
  const error = ref('')
  
  // --- Nuevos Refs ---
  const isRegisterMode = ref(false) // Para controlar el modo (login/registro)
  const passwordConfirm = ref('') // Para el campo de confirmar contraseña
  
  const router = useRouter()
  
  // Función para cambiar de modo
  const toggleMode = () => {
    isRegisterMode.value = !isRegisterMode.value
    error.value = '' // Limpiamos errores al cambiar de modo
    password.value = ''
    passwordConfirm.value = ''
  }
  
  // Unificamos la lógica en una sola función de envío
  const submitForm = async () => {
    loading.value = true
    error.value = ''
    
    // --- Lógica de Registro ---
    if (isRegisterMode.value) {
      if (password.value !== passwordConfirm.value) {
        error.value = 'Las contraseñas no coinciden'
        loading.value = false
        return
      }
      try {
        // Creamos el usuario en Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email.value, password.value)
        // Vinculamos el nuevo usuario con los datos de Firestore
        await vincularUsuario(userCredential.user.uid, userCredential.user.email)
        router.push('/dashboard')
      } catch (e) {
        // Manejamos errores comunes de registro
        if (e.code === 'auth/email-already-in-use') {
          error.value = 'Este email ya está registrado.'
        } else if (e.code === 'auth/weak-password') {
          error.value = 'La contraseña debe tener al menos 6 caracteres.'
        } else {
          error.value = 'Error al registrar el usuario.'
        }
      } finally {
        loading.value = false
      }
    }
    // --- Lógica de Login (la que ya tenías) ---
    else {
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email.value, password.value)
        // Aquí también es buena idea llamar a vincularUsuario por si acaso
        await vincularUsuario(userCredential.user.uid, userCredential.user.email)
        router.push('/dashboard')
      } catch (e) {
        error.value =
        e.code === 'auth/user-not-found'
        ? 'Usuario no encontrado. ¿Quieres registrarte?'
        : e.code === 'auth/wrong-password'
        ? 'Contraseña incorrecta'
        : 'Error al ingresar'
      } finally {
        loading.value = false
      }
    }

    const roles = userDoc.data().roles
    if (roles.length === 1) {
      // un solo rol → directo
      router.push('/' + roles[0])
    } else {
      // múltiples roles → pantalla aparte
      router.push('/seleccionar-rol')
    }
  }
  
  /// Código para el componente de Login/Registro combinado
      const emit = defineEmits(["sign-in", "sign-up"]);
      const isRightPanelActive = ref(false);
      
      const signUpData = ref({ name: "", email: "", password: "" });
      const signInData = ref({ email: "", password: "" });
      
      function emitSignUp() {
        emit("sign-up", signUpData.value);
      }
      function emitSignIn() {
        emit("sign-in", signInData.value);
      }
      function goToReset() {
        router.push('/reset-password'); // Asegúrate de tener esta ruta configurada
      }
</script>