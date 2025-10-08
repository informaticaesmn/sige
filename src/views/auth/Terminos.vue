<!-- src/views/auth/Terminos.vue -->
<template>
  <!-- panel derecho -->
  <form @submit.prevent="sendReset" class="w-full max-w-sm">
    <div class="space-y-4">
    <h2 class="mb-6">Terminos y Condiciones</h2>
      <!-- texto de los terminos -->    
      <p class="text-sm text-gray-600">
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
      </p>
      <FormCheckbox
        id="terms"
        label="Acepto los términos y condiciones"
        v-model="acceptTerms"
      />
      <button
        type="button"
        @click="router.back()"
        class="btn btn-link mt-2"
        >
        Volver al Ingreso
      </button>
    </div>
  </form>
</template> 

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import FormCheckbox from '@/components/ui/FormCheckbox.vue'

const router = useRouter()
const acceptTerms = ref(false)

</script>