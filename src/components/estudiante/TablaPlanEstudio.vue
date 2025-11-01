<template>
  <div class="card">
    <h3 class="text-lg font-semibold text-stone-800 mb-4">
      Plan de Estudio: {{ plan?.nombre }} ({{ plan?.plan }})
    </h3>
    
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-stone-200">
        <thead class="bg-stone-50">
          <tr>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
              Código
            </th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
              Materia
            </th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
              Nombre Corto
            </th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
              Cursada
            </th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
              Correlativas
            </th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-stone-200">
          <tr 
            v-for="materia in materias" 
            :key="materia.codigo"
            @click="seleccionarMateria(materia)"
            @keydown.enter="seleccionarMateria(materia)"
            @keydown.space.prevent="seleccionarMateria(materia)"
            class="hover:bg-stone-50 cursor-pointer focus:outline-none focus:bg-stone-100 focus:ring-2 focus:ring-blue-500"
            tabindex="0"
            :aria-label="`Ver detalles de ${materia.nombre}`"
          >
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-stone-900">
              {{ materia.codigo }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-stone-500">
              {{ materia.nombre }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-stone-500">
              {{ materia.nombre_c }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-stone-500">
              {{ materia.cursada }}
            </td>
            <td class="px-6 py-4 text-sm text-stone-500">
              {{ materia.correlativas }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  plan: {
    type: Object,
    required: true
  },
  materias: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['seleccionar-materia'])

const seleccionarMateria = (materia) => {
  emit('seleccionar-materia', materia)
}
</script>

<style scoped>
.card {
  @apply bg-white rounded-lg shadow p-6;
}

table {
  @apply min-w-full divide-y divide-stone-200;
}

thead {
  @apply bg-stone-50;
}

th {
  @apply px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider;
}

td {
  @apply px-6 py-4 whitespace-nowrap text-sm;
}

tbody tr:hover {
  @apply bg-stone-50;
}
</style>