<!-- src/layouts/AccesoLayout.vue -->
<template>
  <div class="min-h-screen flex flex-col">
    <main class="flex-1 grid md:grid-cols-2">
      <!-- panel izquierdo -->
      <div class="bg-primary-dark text-white p-8 flex items-center justify-center">
        <div class="text-center">
          <img src="/avatar.png" alt="Logo ESMN" class="w-24 mx-auto mb-4">
          <h2 class="text-stone-400">SIGE - ESMN</h2>
          <p class="text-sm opacity-80">Sistema interno de gestión educativa</p>
        </div>
      </div>

      <!-- panel derecho -->
      <div class="bg-white p-8 flex items-center justify-center">
        <router-view />
      </div>
    </main>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { onMounted } from 'vue'
import { useLayout } from '@/composables/useLayout.js'

const { setLayout } = useLayout()
onMounted(() => {
  setLayout('estudiante') // fuerza el layout a "estudiante" al entrar aquí
}) 

defineProps({ showBack: Boolean })
const router = useRouter()
</script>