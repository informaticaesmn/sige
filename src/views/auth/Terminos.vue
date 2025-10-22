<!-- src/views/auth/Terminos.vue -->
<template>
  <!-- panel derecho -->
  <div class="w-full max-w-sm">
    <div class="space-y-2">
      <h2 class="mb-1">Términos y Condiciones de Uso</h2>
      <!-- texto de los terminos -->
      <div class="prose prose-sm max-h-90 overflow-y-auto rounded-md border text-sm p-2">
        <p>La presente aplicación es de uso interno y exclusivo de la institución. Actualmente se encuentra en etapa de desarrollo y período de prueba, por lo que su funcionamiento, contenidos y características podrán ser modificados o mejorados de manera continua, conforme se identifiquen oportunidades de optimización o se detecten dificultades.</p>
        <p>Mientras se mantenga el estado de prueba en desarrollo, los datos suministrados por esta app, no tienen caracter ni de veracidad ni valor legal.</p>
        <p>El uso de esta herramienta implica la aceptación de estas condiciones y el compromiso de emplearla de manera responsable y conforme a los fines académicos previstos.</p>
        <p>Se recuerda que es responsabilidad de cada usuario conocer su plan de estudios y el régimen de correlatividades vigente, con el fin de planificar y gestionar adecuadamente su trayectoria académica dentro de la institución.</p>
      </div>
      <div>
        <FormCheckbox
          id="terms"
          label="He leído y acepto los términos y condiciones para continuar."
          v-model="acceptTerms"
        />
      </div>
      <div>
        <button type="button" @click="router.push('/')" class="btn btn-link">
          Volver al Ingreso
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import FormCheckbox from '@/components/ui/FormCheckbox.vue'

const router = useRouter()
const acceptTerms = ref(false)

watch(acceptTerms, (newValue) => {
  if (newValue === true) {
    router.push('/registro')
  }
})
</script>