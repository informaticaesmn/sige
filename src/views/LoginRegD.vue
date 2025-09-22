<template>
<!-- Estructura base similar a la del Login original, pero adaptada para incluir ambos formularios y el overlay -->
  <div class="flex items-center justify-center min-h-screen bg-gradient-to-r from-teal-500 via-cyan-500 to-stone-500">
    <div class="relative w-[768px] max-w-full min-h-[480px] bg-white rounded-xl shadow-2xl overflow-hidden">
      
      <!-- Sign Up Registro -->
      <div class="absolute top-0 left-0 w-1/2 h-full flex items-center justify-center p-10 transition-transform duration-700"
           :class="{ 'translate-x-full opacity-0': !isRightPanelActive, 'opacity-100': isRightPanelActive }">
        <form @submit.prevent="emitSignUp" class="flex flex-col gap-4 w-full">
          <h1 class="text-2xl font-bold text-gray-700">Crear Cuenta</h1>
          <input v-model="signUpData.name" type="text" placeholder="Nombre" class="p-3 border rounded-lg" />
          <input v-model="signUpData.email" type="email" placeholder="Correo Electrónico" class="p-3 border rounded-lg" />
          <input v-model="signUpData.password" type="password" placeholder="Contraseña" class="p-3 border rounded-lg" />
          <button type="submit" class="bg-teal-600 text-white rounded-lg py-2 hover:bg-teal-700">Registro</button>
        </form>
      </div>

      <!-- Sign In Ingreso -->
      <div class="absolute top-0 left-0 w-1/2 h-full flex items-center justify-center p-10 transition-transform duration-700"
           :class="{ 'translate-x-0 opacity-100': !isRightPanelActive, '-translate-x-full opacity-0': isRightPanelActive }">
        <form @submit.prevent="emitSignIn" class="flex flex-col gap-4 w-full">
          <h1 class="text-2xl font-bold text-gray-700">Ingreso</h1>
          <input v-model="signInData.email" type="email" placeholder="Correo Electrónico" class="p-3 border rounded-lg" />
          <input v-model="signInData.password" type="password" placeholder="Contraseña" class="p-3 border rounded-lg" />
          <button type="submit" class="bg-teal-700 text-white rounded-lg py-2 hover:bg-cyan-600">Ingreso</button>
        </form>
      </div>

      <!-- Overlay -->
      <div class="absolute top-0 left-1/2 w-1/2 h-full bg-gradient-to-r from-teal-600 to-cyan-500 text-white flex flex-col items-center justify-center p-10 transition-transform duration-700"
           :class="{ '-translate-x-full': isRightPanelActive }">
        <img src="/avatar.png" alt="Logo ESMN" class="max-h-36 mb-4">
        <h1 class="text-2xl font-light">RAC - ESMN</h1>
        <p class="mt-4">Sistema interno de gestión educativa</p>
        <div class="mt-6 flex gap-4">
          <button class="border border-white px-4 py-2 rounded-lg hover:bg-white hover:text-teal-700"
                  @click="isRightPanelActive = false">Ingreso</button>
          <button class="border border-white px-4 py-2 rounded-lg hover:bg-white hover:text-teal-700"
                  @click="isRightPanelActive = true">Registro</button>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
  import { ref, computed } from 'vue' // Importa 'computed'
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
</script>