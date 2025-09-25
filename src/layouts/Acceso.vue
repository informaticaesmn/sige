<!-- src/layouts/Acceso.vue -->
<template>
  <div class="min-h-screen flex flex-col">
   
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
import { useRouter } from 'vue-router'

defineProps({ showBack: Boolean })
const router = useRouter()
</script>