<!-- src/views/auth/Login.vue -->
<template>
  <form @submit.prevent="handleLogin" class="w-full max-w-sm">
    <div class="space-y-4">
      <h2 class="mb-6">Ingresar</h2>
      <FormInput
        id="email"
        label="Email"
        type="email"
        name="email"
        v-model="email"
        autocomplete="email"
        :error="emailError"
        :info="'Mail con el que accedés al campus de la ESMN'"
      />  
      <FormInput
        id="password"
        label="Contraseña"
        type="password"
        name="password"
        v-model="password"
        placeholder="••••••"
        autocomplete="current-password"
        :error="passwordError"
      />

      <!-- Mensaje de error general -->
      <p v-if="errorMessage" class="alert alert-danger">
        {{ errorMessage }}
      </p>
      <button
        type="submit"
        class="btn btn-primary w-full my-4"
        :disabled="isLoginDisabled"
        :class="{ 'opacity-50 cursor-not-allowed': isLoginDisabled }"
      >
        {{ buttonText }}
      </button>

      <div class="flex justify-between items-center text-sm">
        <button
          type="button"
          @click="() => router.push('/reset-password')"
          class="btn btn-link"
        >
          ¿Olvidaste tu contraseña?
        </button>
        <button
          type="button"
          @click="() => router.push('/registro')"
          class="btn btn-link"
        >
          ¿No tenés cuenta? Registrate
        </button>
      </div>
    </div>
  </form>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '@/composables/useAuth.js';
import FormInput from '@/components/ui/FormInput.vue';

const router = useRouter();
const { loginFirebase } = useAuth();

const email = ref('')
const password = ref('')
const emailError = ref('')
const passwordError = ref('')
const errorMessage = ref('');
const isLoading = ref(false);

// --- Lógica anti-fuerza bruta ---
const loginAttempts = ref(0);
const isLocked = ref(false);
const MAX_ATTEMPTS = 5;
const LOCKOUT_TIME = 60000; // 60 segundos

const isLoginDisabled = computed(() => isLoading.value || isLocked.value);
const buttonText = computed(() => {
  if (isLoading.value) return 'Ingresando...';
  if (isLocked.value) return `Demasiados intentos. Esperá...`;
  return 'Ingresar';
});

async function handleLogin() {
  errorMessage.value = '';
  if (isLoginDisabled.value) return;

  isLoading.value = true;
  try {
    const { exito, error } = await loginFirebase(email.value, password.value);
    isLoading.value = false;

    if (exito) {
      // La redirección por rol ahora la maneja App.vue o el router guard.
      // Aquí solo nos aseguramos de que el login fue exitoso.
      // Podríamos redirigir a una ruta "neutra" como '/dashboard' y dejar que el guard haga el resto.
      router.push('/estudiante');
    } else {
      errorMessage.value = 'El email o la contraseña son incorrectos.';
      loginAttempts.value++;
      if (loginAttempts.value >= MAX_ATTEMPTS) {
        isLocked.value = true;
        setTimeout(() => {
          isLocked.value = false;
          loginAttempts.value = 0;
          errorMessage.value = 'Ahora podés intentar ingresar nuevamente.';
        }, LOCKOUT_TIME);
      }
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
