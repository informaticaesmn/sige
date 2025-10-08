<!-- src/App.vue -->
<template>
  <div class="min-h-screen bg-stone-100 flex flex-col">
    <main class="flex-grow">
      <router-view />
    </main>
    <FooterApp />
  </div>
</template>

<script setup>
import FooterApp from '@/components/FooterApp.vue'
// La lógica de redirección ahora está centralizada en src/router/index.js
</script>
