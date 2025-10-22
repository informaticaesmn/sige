<!-- src/components/AppLoading.vue -->
<template>
  <div v-if="estaCargando" class="fixed inset-0 bg-stone-100 bg-opacity-80 flex items-center justify-center z-50">
    <div class="text-center">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
      <p class="mt-4 text-stone-600">Cargando aplicación...</p>
    </div>
  </div>
</template>

<script setup>
import { useAuth } from '@/composables/auth/useAuth'
const { estaCargando } = useAuth()
</script>