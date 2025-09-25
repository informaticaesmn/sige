<template>
  <div class="min-h-screen bg-stone-100 flex flex-col">
    <main class="flex-grow">
    <router-view />
    </main>
    <FooterApp />
  </div>
</template>

<script setup>
import { useRoute } from 'vue-router'
import FooterApp from './components/FooterApp.vue'

const route = useRoute()

</script>