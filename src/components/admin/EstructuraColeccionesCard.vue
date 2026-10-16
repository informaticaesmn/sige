<!-- src/components/admin/EstructuraColeccionesCard.vue -->
<template>
  <div class="card border border-stone-200">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
      <div>
        <h3 class="card-header !mb-0 flex items-center gap-2">
          <TableCellsIcon class="h-5 w-5 text-primary" />
          <span>Estructura de la Base de Datos Firestore</span>
        </h3>
        <p class="text-xs text-stone-500 mt-1">
          Inventario de colecciones, jerarquía, reglas de ID y conteo de documentos activos en SIGE.
        </p>
      </div>

      <span class="text-xs bg-stone-100 text-stone-600 px-2.5 py-1 rounded-md self-start sm:self-auto font-medium">
        {{ colecciones.length }} Colecciones Monitoreadas
      </span>
    </div>

    <!-- Tabla Responsive -->
    <div class="overflow-x-auto -mx-6 px-6">
      <table class="min-w-full divide-y divide-stone-200 text-left text-xs">
        <thead class="bg-stone-50 text-stone-600 uppercase font-semibold">
          <tr>
            <th scope="col" class="py-3 px-4">Colección / Ruta</th>
            <th scope="col" class="py-3 px-4">Jerarquía</th>
            <th scope="col" class="py-3 px-4 text-center">Documentos</th>
            <th scope="col" class="py-3 px-4">Estrategia de ID</th>
            <th scope="col" class="py-3 px-4">Propósito</th>
            <th scope="col" class="py-3 px-4 text-right">Acción</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-stone-100 font-sans">
          <tr 
            v-for="col in colecciones" 
            :key="col.id"
            class="hover:bg-stone-50 transition-colors"
            :class="{ 'bg-rose-50/40': coleccionSeleccionada === col.id }"
          >
            <!-- Nombre de Colección -->
            <td class="py-3.5 px-4 font-mono font-medium text-stone-800 flex items-center gap-2">
              <FolderIcon class="h-4 w-4 text-stone-400 shrink-0" />
              <span>{{ col.nombre }}</span>
            </td>

            <!-- Jerarquía -->
            <td class="py-3.5 px-4">
              <span 
                class="inline-block px-2 py-0.5 rounded text-2xs font-medium"
                :class="col.tipo === 'Colección Raíz' ? 'bg-sky-50 text-sky-700 border border-sky-200' : 'bg-purple-50 text-purple-700 border border-purple-200'"
              >
                {{ col.tipo }}
              </span>
            </td>

            <!-- Cantidad de Documentos -->
            <td class="py-3.5 px-4 text-center">
              <span 
                class="inline-block px-2 py-0.5 rounded-full font-semibold text-xs"
                :class="typeof col.cantidadDocs === 'number' && col.cantidadDocs > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-600'"
              >
                {{ col.cantidadDocs }}
              </span>
            </td>

            <!-- Estrategia de ID -->
            <td class="py-3.5 px-4 text-stone-600 max-w-xs truncate" :title="col.estrategiaId">
              {{ col.estrategiaId }}
            </td>

            <!-- Propósito -->
            <td class="py-3.5 px-4 text-stone-500 max-w-sm truncate" :title="col.descripcion">
              {{ col.descripcion }}
            </td>

            <!-- Acción de Selección -->
            <td class="py-3.5 px-4 text-right">
              <button
                @click="$emit('seleccionar', col.id)"
                class="btn text-xs py-1 px-2.5 transition-colors"
                :class="coleccionSeleccionada === col.id ? 'btn-primary' : 'btn-secondary'"
              >
                <EyeIcon class="h-3.5 w-3.5 mr-1" />
                <span>{{ coleccionSeleccionada === col.id ? 'Inspeccionando' : 'Inspeccionar' }}</span>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

  </div>
</template>

<script setup>
/**
 * @file EstructuraColeccionesCard.vue
 * @description Tabla estructurada con las colecciones principales y subcolecciones de Firestore,
 * mostrando su jerarquía, estrategia de identificación y cantidad de documentos.
 */
import {
  TableCellsIcon,
  FolderIcon,
  EyeIcon
} from '@heroicons/vue/24/outline'

defineProps({
  colecciones: {
    type: Array,
    required: true,
    default: () => []
  },
  coleccionSeleccionada: {
    type: String,
    default: 'usuarios'
  }
})

defineEmits(['seleccionar'])
</script>

