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
        placeholder="mail con el que accedés al campus de la ESMN"
        autocomplete="email"
        :error="emailError"
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
          @click="() => router.push('/terminos')"
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
import { useAuth } from '@/composables/auth/useAuth.js';
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
  const { exito } = await loginFirebase(email.value, password.value);

  if (exito) {
    // El login fue exitoso. La redirección es manejada por useAuth.js
    // y el router guard. Limpiamos los intentos de error.
    loginAttempts.value = 0;
  } else {
    // Si el login falla, el error es manejado dentro de loginFirebase.
    // Aquí solo gestionamos la lógica de bloqueo por fuerza bruta.
    errorMessage.value = 'El email o la contraseña son incorrectos. Intenta de nuevo.';
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
  isLoading.value = false;
}


function goToReset() {
  router.push('/reset-password')
}
function goToRegister() {
  router.push('/registro')
}
</script>
