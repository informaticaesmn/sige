<!-- src/views/auth/Terminos.vue -->
<template>
  <!-- panel derecho -->
  <form @submit.prevent="sendReset" class="w-full max-w-sm">
    <div class="space-y-4">
    <h2 class="mb-6">Terminos y Condiciones</h2>
      <!-- texto de los terminos -->    
      <p class="text-sm text-gray-600">
        Términos y Condiciones de Uso

La presente aplicación es de uso interno y exclusivo de la institución. Actualmente se encuentra en etapa de desarrollo y período de prueba, por lo que su funcionamiento, contenidos y características podrán ser modificados o mejorados de manera continua, conforme se identifiquen oportunidades de optimización o se detecten dificultades.

El uso de esta herramienta implica la aceptación de estas condiciones y el compromiso de emplearla de manera responsable y conforme a los fines académicos previstos.

Se recuerda que es responsabilidad de cada usuario conocer su plan de estudios y el régimen de correlatividades vigente, con el fin de planificar y gestionar adecuadamente su trayectoria académica dentro de la institución.</p>
      <FormCheckbox
        id="terms"
        label="He leído y acepto los términos y condiciones"
        v-model="acceptTerms"
      />
      <span v-if="!acceptTerms" class="text-xs text-red-500">Debes aceptar los términos y condiciones para continuar.</span>
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