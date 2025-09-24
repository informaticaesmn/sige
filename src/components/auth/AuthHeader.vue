<!-- src/components/auth/AuthHeader.vue -->
<template>
  <header class="bg-teal-800 text-white px-4 py-3 md:px-6 flex items-center justify-between">
    <router-link to="/" class="flex items-center gap-3">
      <img src="/avatar.png" alt="Logo ESMN" class="h-12 w-12 object-contain">
      <div>
        <h1 class="text-lg font-bold tracking-tight">SIGE - ESMN</h1>
        <p class="text-xs opacity-80">Sistema interno de gestión educativa</p>
      </div>
    </router-link>

    <button
      v-if="showBack"
      type="button"
      @click="router.back()"
      class="text-white hover:text-teal-200 focus:outline-none focus:ring-2 focus:ring-teal-300 rounded px-2 py-1"
      aria-label="Volver"
    >
      <ArrowLeftIcon class="h-5 w-5" />
    </button>
  </header>
</template>

<script setup>
import { ArrowLeftIcon } from '@heroicons/vue/24/outline'
import { useRouter } from 'vue-router'

defineProps({ showBack: Boolean })
const router = useRouter()
</script>