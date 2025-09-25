<!-- src/layouts/Acceso.vue -->
<template>
  <div class="min-h-screen flex flex-col">
    <!-- header opcional -->
   <!--  <header class="bg-teal-800 text-white px-4 py-3 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <img src="/avatar.png" alt="Logo ESMN" class="w-10 object-contain">
        <div>
          <h1 class="text-lg font-semibold">SIGE - ESMN</h1>
          <p class="text-xs opacity-80">Sistema interno de gestión educativa</p>
        </div>
      </div>

      <button
        v-if="showBack"
        type="button"
        @click="router.back()"
        class="text-white hover:text-teal-200 focus:outline-none focus:ring-2 focus:ring-teal-300 rounded px-2 py-1"
        aria-label="Volver"
      >
        <ArrowLeftIcon class="h-5 w-5" />
      </button>
    </header> -->

    <!-- contenido de la vista hija -->
    <main class="flex-1 grid md:grid-cols-2">
      <!-- panel izquierdo (logo grande, título) -->
      <div class="bg-teal-800 text-white p-8 flex items-center justify-center">
        <div class="text-center">
          <img src="/avatar.png" alt="Logo ESMN" class="w-24 mx-auto mb-4">
          <h2 class="text-2xl">SIGE - ESMN</h2>
          <p class="text-sm opacity-80">Sistema interno de gestión educativa</p>
        </div>
      </div>

      <!-- panel derecho (formulario específico) -->
      <div class="bg-white p-8 flex items-center justify-center">
        <router-view />
      </div>
    </main>

  </div>
</template>

<script setup>
import { ArrowLeftIcon } from '@heroicons/vue/24/outline'
import { useRouter } from 'vue-router'
import FooterApp from '@/components/FooterApp.vue'

defineProps({ showBack: Boolean })
const router = useRouter()
</script>