<!-- src/views/auth/Terminos.vue -->
<template>
  <!-- panel derecho -->
  <div class="w-full max-w-sm">
    <div class="space-y-2">
      <h2 class="mb-1">Términos y Condiciones de Uso</h2>
      <!-- texto de los terminos -->
      <TerminosContenido />
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
import TerminosContenido from '@/components/TerminosContenido.vue'

const router = useRouter()
const acceptTerms = ref(false)

watch(acceptTerms, (newValue) => {
  if (newValue === true) {
    router.push('/registro')
  }
})
</script>