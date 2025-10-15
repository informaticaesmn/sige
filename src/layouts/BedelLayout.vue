<template>
  <div class="min-h-screen flex flex-col">
    <BarraApp />

    <!-- Contenido de la vista hija -->
    <main class="flex-1 p-6">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import BarraApp from '@/components/BarraApp.vue';
</script>