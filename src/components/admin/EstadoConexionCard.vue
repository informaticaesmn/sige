<!-- src/components/admin/EstadoConexionCard.vue -->
<template>
  <div class="card border border-stone-200">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      
      <!-- Información de Estado y Conectividad -->
      <div class="flex items-start sm:items-center gap-3">
        <div 
          class="p-3 rounded-xl flex items-center justify-center shrink-0 transition-colors"
          :class="estadoConexion === 'conectado' ? 'bg-emerald-50 text-emerald-600' : (estadoConexion === 'error' ? 'bg-red-50 text-red-600' : 'bg-stone-100 text-stone-500')"
        >
          <ServerIcon class="h-6 w-6" />
        </div>

        <div>
          <div class="flex items-center gap-2">
            <h3 class="text-base font-semibold text-stone-800">
              Base de Datos Firestore
            </h3>
            <!-- Badge de estado -->
            <span 
              class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium"
              :class="estadoBadgeClass"
            >
              <span class="w-1.5 h-1.5 rounded-full" :class="estadoDotClass"></span>
              {{ estadoTexto }}
            </span>
          </div>

          <p class="text-xs text-stone-500 mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>
              Proyecto: <strong class="text-stone-700">SIGE (Firestore Lite)</strong>
            </span>
            <span v-if="latenciaMs !== null" class="flex items-center gap-1">
              <BoltIcon class="h-3.5 w-3.5 text-amber-500" />
              Latencia: <strong class="text-stone-700">{{ latenciaMs }} ms</strong>
            </span>
            <span v-if="ultimaActualizacion" class="flex items-center gap-1">
              <ClockIcon class="h-3.5 w-3.5 text-stone-400" />
              Última lectura: {{ formatearFecha(ultimaActualizacion) }}
            </span>
          </p>
        </div>
      </div>

      <!-- Acciones de Refresco -->
      <div class="flex items-center gap-2 self-end sm:self-center">
        <button
          @click="$emit('refrescar')"
          :disabled="cargando"
          class="btn btn-primary flex items-center gap-1.5 px-3 py-1.5 text-xs shadow-sm"
          :class="{ 'opacity-70 cursor-not-allowed': cargando }"
          title="Consultar nuevamente Firestore para obtener datos actualizados"
        >
          <ArrowPathIcon 
            class="h-4 w-4" 
            :class="{ 'animate-spin': cargando }"
          />
          <span>{{ cargando ? 'Consultando...' : 'Actualizar Estado' }}</span>
        </button>
      </div>

    </div>

    <!-- Alerta en caso de error -->
    <div v-if="error" class="alert alert-danger mt-4 flex items-start gap-2">
      <ExclamationTriangleIcon class="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
      <div>
        <p class="font-medium text-xs">Error al consultar Firestore:</p>
        <p class="text-xs mt-0.5 text-red-700">{{ error }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * @file EstadoConexionCard.vue
 * @description Tarjeta informativa que visualiza la salud de la conexión a Firestore,
 * la latencia medida en milisegundos y el disparador de refresco de estadísticas.
 */
import { computed } from 'vue'
import {
  ServerIcon,
  BoltIcon,
  ClockIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon
} from '@heroicons/vue/24/outline'

const props = defineProps({
  estadoConexion: {
    type: String,
    default: 'desconocido'
  },
  latenciaMs: {
    type: Number,
    default: null
  },
  ultimaActualizacion: {
    type: Date,
    default: null
  },
  cargando: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: null
  }
})

defineEmits(['refrescar'])

/**
 * Formatea una fecha a hora legible.
 * @param {Date} fecha
 * @returns {string}
 */
function formatearFecha(fecha) {
  if (!fecha) return 'Nunca'
  return new Intl.DateTimeFormat('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(fecha)
}

const estadoTexto = computed(() => {
  if (props.estadoConexion === 'conectado') return 'Operativo'
  if (props.estadoConexion === 'error') return 'Error de conexión'
  return 'Verificando...'
})

const estadoBadgeClass = computed(() => {
  if (props.estadoConexion === 'conectado') return 'bg-emerald-100 text-emerald-800'
  if (props.estadoConexion === 'error') return 'bg-red-100 text-red-800'
  return 'bg-stone-100 text-stone-600'
})

const estadoDotClass = computed(() => {
  if (props.estadoConexion === 'conectado') return 'bg-emerald-500'
  if (props.estadoConexion === 'error') return 'bg-red-500'
  return 'bg-stone-400'
})
</script>

