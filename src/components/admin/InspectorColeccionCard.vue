<!-- src/components/admin/InspectorColeccionCard.vue -->
<template>
  <div class="card border border-stone-200">
    <!-- Encabezado con selector de colección y pestañas -->
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-stone-200">
      <div>
        <div class="flex items-center gap-2">
          <CodeBracketIcon class="h-5 w-5 text-primary" />
          <h3 class="text-base font-bold text-stone-800">
            Inspector de Colección:
            <span class="font-mono text-primary font-semibold">
              {{ infoColeccion?.nombre || coleccionActiva }}
            </span>
          </h3>
        </div>
        <p class="text-xs text-stone-500 mt-0.5">
          {{ infoColeccion?.descripcion }}
        </p>
      </div>

      <!-- Selector de colección y vista -->
      <div class="flex flex-wrap items-center gap-2">
        <!-- Selector rápido de colección -->
        <div class="flex rounded-md shadow-sm border border-stone-300 overflow-hidden text-xs">
          <button
            v-for="col in catalogo"
            :key="col.id"
            @click="$emit('cambiarColeccion', col.id)"
            class="px-3 py-1.5 font-medium transition-colors border-r last:border-r-0 border-stone-200"
            :class="coleccionActiva === col.id ? 'bg-primary text-white' : 'bg-white text-stone-700 hover:bg-stone-50'"
          >
            {{ col.id }}
          </button>
        </div>

        <!-- Toggle Pestañas: Esquema vs JSON -->
        <div class="flex bg-stone-100 p-0.5 rounded-lg text-xs">
          <button
            @click="vistaActiva = 'esquema'"
            class="px-3 py-1 rounded-md font-medium transition-colors"
            :class="vistaActiva === 'esquema' ? 'bg-white shadow text-stone-900' : 'text-stone-500 hover:text-stone-700'"
          >
            Esquema ({{ esquema.length }} campos)
          </button>
          <button
            @click="vistaActiva = 'json'"
            class="px-3 py-1 rounded-md font-medium transition-colors"
            :class="vistaActiva === 'json' ? 'bg-white shadow text-stone-900' : 'text-stone-500 hover:text-stone-700'"
          >
            Documento JSON
          </button>
        </div>
      </div>
    </div>

    <!-- Metadatos de la colección -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-3 my-4 p-3 bg-stone-50 rounded-lg text-xs text-stone-600">
      <div>
        <span class="font-semibold block text-stone-700">Jerarquía:</span>
        <span>{{ infoColeccion?.tipo }}</span>
      </div>
      <div>
        <span class="font-semibold block text-stone-700">Estrategia de Document ID:</span>
        <span class="font-mono">{{ infoColeccion?.estrategiaId }}</span>
      </div>
      <div>
        <span class="font-semibold block text-stone-700">Reglas de Seguridad (Firestore Rules):</span>
        <span>{{ infoColeccion?.reglasAcceso }}</span>
      </div>
    </div>

    <!-- VISTA 1: TABLA DE ESQUEMA -->
    <div v-if="vistaActiva === 'esquema'" class="mt-2">
      <div v-if="esquema.length === 0" class="text-center py-8 text-stone-400 text-xs">
        No se han detectado documentos o campos para esta colección aún.
      </div>
      <div v-else class="overflow-x-auto -mx-6 px-6">
        <table class="min-w-full divide-y divide-stone-200 text-left text-xs">
          <thead class="bg-stone-100/70 text-stone-600 uppercase font-semibold">
            <tr>
              <th scope="col" class="py-2.5 px-4">Campo</th>
              <th scope="col" class="py-2.5 px-4">Tipo Inferencia</th>
              <th scope="col" class="py-2.5 px-4 text-center">Presencia</th>
              <th scope="col" class="py-2.5 px-4">Estado</th>
              <th scope="col" class="py-2.5 px-4">Ejemplo Representativo</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-stone-100 font-sans">
            <tr 
              v-for="item in esquema" 
              :key="item.campo"
              class="hover:bg-stone-50/80 transition-colors"
            >
              <!-- Nombre de campo -->
              <td class="py-2.5 px-4 font-mono font-medium text-stone-800">
                {{ item.campo }}
              </td>

              <!-- Tipo inferido -->
              <td class="py-2.5 px-4">
                <span class="px-2 py-0.5 rounded text-2xs font-mono font-medium bg-amber-50 text-amber-800 border border-amber-200">
                  {{ item.tipo }}
                </span>
              </td>

              <!-- Porcentaje de presencia -->
              <td class="py-2.5 px-4 text-center">
                <div class="flex items-center justify-center gap-1.5">
                  <div class="w-16 bg-stone-200 rounded-full h-1.5 overflow-hidden">
                    <div 
                      class="bg-emerald-500 h-1.5 rounded-full" 
                      :style="{ width: `${item.porcentajePresencia}%` }"
                    ></div>
                  </div>
                  <span class="text-2xs font-semibold text-stone-600">
                    {{ item.porcentajePresencia }}%
                  </span>
                </div>
              </td>

              <!-- Requerido / Opcional -->
              <td class="py-2.5 px-4">
                <span 
                  class="px-2 py-0.5 rounded text-2xs font-medium"
                  :class="item.requerido ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-500'"
                >
                  {{ item.requerido ? 'Universal' : 'Opcional' }}
                </span>
              </td>

              <!-- Ejemplo -->
              <td class="py-2.5 px-4 text-stone-500 font-mono text-2xs max-w-xs truncate" :title="formatearEjemplo(item.ejemplo)">
                {{ formatearEjemplo(item.ejemplo) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- VISTA 2: VISOR JSON DE MUESTRA -->
    <div v-else class="mt-2">
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs text-stone-500">
          Documento representativo extraído de Firestore:
        </span>
        <button
          @click="copiarJson"
          class="btn btn-secondary text-2xs py-1 px-2.5 flex items-center gap-1"
        >
          <DocumentDuplicateIcon class="h-3.5 w-3.5" />
          <span>{{ copiado ? '¡Copiado!' : 'Copiar JSON' }}</span>
        </button>
      </div>

      <div class="bg-stone-900 rounded-lg p-4 font-mono text-xs text-stone-200 overflow-x-auto max-h-96 shadow-inner">
        <pre>{{ jsonFormateado }}</pre>
      </div>
    </div>

  </div>
</template>

<script setup>
/**
 * @file InspectorColeccionCard.vue
 * @description Panel interactivo para inspeccionar a fondo los campos, tipos y documento
 * de muestra de una colección específica de Firestore.
 */
import { ref, computed } from 'vue'
import {
  CodeBracketIcon,
  DocumentDuplicateIcon
} from '@heroicons/vue/24/outline'

const props = defineProps({
  coleccionActiva: {
    type: String,
    required: true,
    default: 'usuarios'
  },
  catalogo: {
    type: Array,
    required: true,
    default: () => []
  },
  esquema: {
    type: Array,
    required: true,
    default: () => []
  },
  muestra: {
    type: Object,
    default: null
  }
})

defineEmits(['cambiarColeccion'])

const vistaActiva = ref('esquema')
const copiado = ref(false)

const infoColeccion = computed(() => {
  return props.catalogo.find(c => c.id === props.coleccionActiva)
})

/**
 * Formatea un valor arbitrario para mostrarlo de forma compacta en la columna de ejemplos.
 * @param {any} val
 * @returns {string}
 */
function formatearEjemplo(val) {
  if (val === null || val === undefined) return 'null'
  if (typeof val === 'object') {
    try {
      return JSON.stringify(val)
    } catch {
      return String(val)
    }
  }
  return String(val)
}

const jsonFormateado = computed(() => {
  if (!props.muestra) {
    return '// No hay documentos disponibles para mostrar en esta colección.'
  }
  return JSON.stringify(props.muestra, null, 2)
})

/**
 * Copia el JSON de muestra al portapapeles.
 */
async function copiarJson() {
  if (!props.muestra) return
  try {
    await navigator.clipboard.writeText(JSON.stringify(props.muestra, null, 2))
    copiado.value = true
    setTimeout(() => {
      copiado.value = false
    }, 2000)
  } catch (err) {
    console.error('No se pudo copiar el JSON:', err)
  }
}
</script>

