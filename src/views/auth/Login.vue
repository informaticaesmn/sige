<!-- src/views/auth/Login.vue -->
<template>
  <!-- panel derecho -->
  <form @submit.prevent="login" class="w-full max-w-sm">
    <div class="space-y-4">
    <h2 class="mb-6">Ingresar</h2>
    
      <!-- Email -->  
      <FormInput 
        id="email" 
        label="Email" 
        name="email" 
        type="email"
        v-model="email" 
        :error="emailError"
      />

      <!-- Password -->
      <FormInput
        id="password"
        label="Contraseña"
        type="password"
        v-model="password"
        :error="passwordError"
      />
      <!-- Botón de login -->
      <button type="submit" class="btn btn-primary w-full my-4">
        Ingresar
      </button>
      <!-- Footer con enlaces a registro y reset -->
             <button
      type="button"
      @click  ="goToReset"
      class="btn btn-link mt-2"
      >
      ¿Olvidaste tu contraseña?
    </button>
          <button
      type="button"
      @click="goToRegister"
      class="btn btn-link mt-2"
      >
      ¿No tenés cuenta? Registrate
    </button>
    </div>
  </form>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import FormInput from '@/components/ui/FormInput.vue'

// Importamos funciones centralizadas de los composables
import { useAuth } from '@/composables/useAuth'
import { obtenerUsuario, getRoles } from '@/composables/useUsuarios.js'

//Reative
const router = useRouter()
const { loginFirebase } = useAuth()
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

  // Intentamos loguear
  try {
    const { uid } = await loginFirebase(email.value, password.value)
    const roles = await getRoles(uid)

    if (roles.length === 1) {
      // Si solo tiene un rol, redirigir directamente
      switch (roles[0]) {
        case 'estudiante': router.push('/estudiante'); break
        case 'teacher': router.push('/docente'); break
        case 'bedel':   router.push('/bedel'); break
        case 'admin':   router.push('/admin'); break
        default: alert('Rol desconocido, contactá al administrador')
      }
    } else {
      // Si tiene varios roles, ir a seleccionar rol
      router.push({ path: '/seleccionar-rol', query: { uid } })
    }
  } catch (e) {
    console.error('Error en login:', e)
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


function goToReset() {
  router.push('/reset-password')
}
function goToRegister() {
  router.push('/registro')
}
</script>
