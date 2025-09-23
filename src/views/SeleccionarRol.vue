<template>
  <div class="max-w-sm mx-auto p-8">
    <h1 class="text-xl font-bold mb-4">Seleccioná tu rol</h1>

    <div class="space-y-3">
      <button
        v-for="r in roles"
        :key="r"
        @click="elegir(r)"
        class="w-full text-left p-3 bg-teal-600 text-white rounded hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-400"
      >
        {{ r === 'student' ? 'Estudiante' : r === 'teacher' ? 'Docente' : 'Bedel' }}
      </button>
    </div>

    <button
      @click="router.back()"
      class="text-sm text-gray-500 hover:text-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-400 rounded px-2 py-1 mt-4"
    >
      Volver
    </button>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

defineProps({ roles: Array })
const router = useRouter()

function elegir(rol) {
  router.push('/' + rol)
}
</script>