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
import FooterApp from '@/components/FooterApp.vue'
import AppLoading from '@/components/AppLoading.vue'
</script>
