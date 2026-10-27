<!-- src/App.vue -->
<template>
  <div class="min-h-screen bg-stone-100 flex flex-col">
    <main class="flex-grow">
      <AppLoading />
      <router-view />
    </main>
    <FooterApp />
  </div>
</template>

<script setup>
import { onErrorCaptured } from 'vue'
import FooterApp from '@/components/FooterApp.vue'
import AppLoading from '@/components/AppLoading.vue'

// Error boundary global: registra errores no capturados sin cambiar el comportamiento actual
onErrorCaptured((err, instance, info) => {
  console.error('[SIGE] Error no capturado:', err, info)
  // No retornar false → deja que el error siga propagándose (por ahora)
  return false
})
</script>
