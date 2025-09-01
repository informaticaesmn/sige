<template>
  <div class="min-h-screen bg-stone-100 flex flex-col">
    <!-- BarraApp oculta en la página de login por el v-if y la funcion computada -->
    <BarraApp v-if="!isLoginPage"/>
    <main class="flex-grow">
    <router-view />
    </main>
    <FooterApp />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import BarraApp from '@/components/BarraApp.vue'
import FooterApp from './components/FooterApp.vue'

const route = useRoute()

const isLoginPage = computed(() => route.name === 'Login')
</script>