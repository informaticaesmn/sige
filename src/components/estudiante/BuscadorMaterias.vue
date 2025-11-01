<template>
  <div class="card">
    <h3 class="text-lg font-semibold text-stone-800 mb-4">Buscar Materias</h3>
    
    <div class="mb-4">
      <div class="relative">
        <input
          v-model="busqueda"
          type="text"
          placeholder="Buscar por nombre, código o nombre corto..."
          class="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          @input="realizarBusqueda"
          aria-label="Buscar materias por nombre, código o nombre corto"
        >
        <div class="absolute inset-y-0 right-0 flex items-center pr-3">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-stone-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
          </svg>
        </div>
      </div>
    </div>

    <div v-if="resultados.length > 0" class="overflow-x-auto">
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
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-stone-200">
          <tr 
            v-for="materia in resultados" 
            :key="materia.codigo"
            @click="$emit('seleccionar', materia)"
            @keydown.enter="$emit('seleccionar', materia)"
            @keydown.space.prevent="$emit('seleccionar', materia)"
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
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else-if="busqueda.length > 2" class="text-center py-4 text-stone-500" role="status">
      <p>No se encontraron materias que coincidan con la búsqueda</p>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  plan: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['seleccionar'])

const busqueda = ref('')
const resultados = ref([])

const realizarBusqueda = () => {
  if (!props.plan || busqueda.value.length < 3) {
    resultados.value = []
    return
  }

  const termino = busqueda.value.toLowerCase()
  resultados.value = Object.entries(props.plan.materias)
    .filter(([codigo, materia]) => 
      materia.nombre.toLowerCase().includes(termino) ||
      materia.nombre_c.toLowerCase().includes(termino) ||
      codigo.includes(termino)
    )
    .map(([codigo, materia]) => ({
      codigo,
      ...materia
    }))
    .slice(0, 10) // Limitar a 10 resultados
}
</script>

<style scoped>
.card {
  @apply bg-white rounded-lg shadow p-6;
}

input {
  @apply w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500;
}
</style>