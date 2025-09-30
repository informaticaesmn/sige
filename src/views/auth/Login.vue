<template>
  <!-- panel derecho (solo login) -->
  <form @submit.prevent="login" class="w-full max-w-sm">
    <h2 class="text-xl font-semibold text-stone-600 mb-4">Ingresar</h2>

    <!-- Inputs de email y contraseña -->
     <FormInput
        id="email"
        name="email"
        v-model="email"
        label="Email"
        type="email"
        :error="emailError"
      />
    
      <FormInput
        id="password"
        name="password"
        v-model="password"
        label="Contraseña"
        type="password"
        :error="passwordError"
      />

    <!-- Botón de login -->
    <button type="submit" class="w-full bg-teal-600 text-white py-2 rounded hover:bg-teal-700">
      Ingresar
    </button>

    <!-- Footer con enlaces a registro y reset -->
    <AuthFooter @reset="goToReset" @register="goToRegister" />
  </form>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import AuthFooter from '@/components/auth/AuthFooter.vue'
import FormInput from '@/components/ui/FormInput.vue'

// Importamos funciones centralizadas de usuarios
import { obtenerUsuario } from '@/composables/useUsuarios.js'

const router = useRouter()

// Reactive refs para inputs y errores
const email = ref('')
const password = ref('')
const emailError = ref('')
const passwordError = ref('')

/**
 * Función principal de login
 */
async function login() {
  // Limpiamos errores
  emailError.value = ''
  passwordError.value = ''

  // Validaciones simples
  if (!email.value) { emailError.value = 'Ingresá tu email'; return }
  if (!password.value) { passwordError.value = 'Ingresá tu contraseña'; return }

  try {
    const authInstance = getAuth()
    // Intentamos loguear al usuario con Firebase Auth
    await signInWithEmailAndPassword(authInstance, email.value, password.value)
    const uid = authInstance.currentUser.uid

    // 🔹 Obtenemos el usuario desde Firestore usando la función centralizada
    const usuario = await obtenerUsuario(uid)
    if (!usuario) {
      alert('Usuario no encontrado en la base de datos')
      return
    }

    const roles = usuario.roles   // ej: ["student", "teacher"]

    // 🔹 Redirección según roles
    if (roles.length === 1) {
      // Un solo rol → redirigimos directo a la vista correspondiente
      switch (roles[0]) {
        case 'student':
          router.push('/estudiante')
          break
        case 'teacher':
          router.push('/docente')
          break
        case 'bedel':
          router.push('/bedel')
          break
        case 'admin':
          router.push('/admin')
          break
        default:
          alert('Rol desconocido, contactá al administrador')
      }
    } else {
      // Múltiples roles → redirigir a la pantalla de SeleccionarRol
      router.push({
        path: '/seleccionar-rol',
        query: { uid }  // opcional, si querés pasar info al componente
      })
    }

  } catch (e) {
    console.error('Error en login:', e)
    // Mensajes de error amigables según código de Firebase Auth
    switch (e.code) {
      case 'auth/user-not-found':
        emailError.value = 'Usuario no encontrado'
        break
      case 'auth/wrong-password':
        passwordError.value = 'Contraseña incorrecta'
        break
      default:
        alert(e.message)
    }
  }
}

/**
 * Funciones de navegación a registro y reset
 */
function goToReset() {
  router.push('/reset-password')
}
function goToRegister() {
  router.push('/registro')
}
</script>
