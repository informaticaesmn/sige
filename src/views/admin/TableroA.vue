<!-- src/views/admin/TableroA.vue -->
<template>
  <div class="min-h-screen font-sans">
    <!-- Contenedor Principal del Tablero -->
    <div class="container mx-auto px-4 py-6 space-y-6">

      <!-- Encabezado del Dashboard -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-stone-200">
        <div>
          <h1 class="text-2xl font-bold text-stone-900 flex items-center gap-2">
            <span>Tablero de Administración</span>
            <span class="text-xs bg-rose-100 text-rose-800 font-semibold px-2.5 py-0.5 rounded-full uppercase">
              Admin
            </span>
          </h1>
          <p class="text-sm text-stone-500 mt-1">
            Monitoreo en tiempo real del estado, estructura y documentos de la base de datos Firestore de SIGE.
          </p>
        </div>

        <!-- Indicador de Usuario Administrador -->
        <div class="text-xs text-stone-600 bg-white border border-stone-200 rounded-lg px-3 py-2 flex items-center gap-2 shadow-sm self-start md:self-auto">
          <div class="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
          <div>
            <span class="font-medium text-stone-800">{{ user?.nombre || user?.email || 'Administrador' }}</span>
            <span class="text-stone-400 block text-2xs">Sesión activa como Administrador</span>
          </div>
        </div>
      </div>

      <!-- Tarjeta 1: Estado del Servicio y Conexión con Firestore -->
      <EstadoConexionCard 
        :estado-conexion="estadoConexion"
        :latencia-ms="latenciaMs"
        :ultima-actualizacion="ultimaActualizacion"
        :cargando="cargando"
        :error="error"
        @refrescar="cargarEstadisticas"
      />

      <!-- Tarjeta 2: Resumen Cuantitativo y KPIs Principales -->
      <MetricasResumenCard 
        :metricas-usuarios="metricasUsuarios"
        :metricas-oferta="metricasOferta"
      />

      <!-- Tarjeta 3: Estructura e Inventario de Colecciones -->
      <EstructuraColeccionesCard 
        :colecciones="resumenColecciones"
        :coleccion-seleccionada="coleccionSeleccionada"
        @seleccionar="seleccionarColeccion"
      />

      <!-- Tarjeta 4: Inspector de Campos y Documento de Muestra -->
      <InspectorColeccionCard 
        :coleccion-activa="coleccionSeleccionada"
        :catalogo="catalogoEstructura"
        :esquema="esquemaColeccionActiva"
        :muestra="muestraColeccionActiva"
        @cambiar-coleccion="seleccionarColeccion"
      />

    </div>
  </div>
</template>

<script setup>
/**
 * @file TableroA.vue
 * @description Vista principal del Tablero de Administrador.
 * Muestra el estado operativo de Firestore, el desglose métrico de usuarios y ciclos,
 * la estructura de colecciones y el inspector de esquema en vivo.
 * 
 * Lógica 100% desacoplada en composables conforme a las reglas de AGENTS.md.
 */
import { onMounted } from 'vue'
import { useAuth } from '@/composables/auth/useAuth.js'
import { useFirestoreStats } from '@/composables/admin/useFirestoreStats.js'

// Componentes modulares del Administrador
import EstadoConexionCard from '@/components/admin/EstadoConexionCard.vue'
import MetricasResumenCard from '@/components/admin/MetricasResumenCard.vue'
import EstructuraColeccionesCard from '@/components/admin/EstructuraColeccionesCard.vue'
import InspectorColeccionCard from '@/components/admin/InspectorColeccionCard.vue'

// Sesión del usuario autenticado
const { user } = useAuth()

// Composable especializado en métricas y estructura de Firestore
const {
  cargando,
  error,
  ultimaActualizacion,
  latenciaMs,
  estadoConexion,
  coleccionSeleccionada,
  metricasUsuarios,
  metricasOferta,
  resumenColecciones,
  catalogoEstructura,
  esquemaColeccionActiva,
  muestraColeccionActiva,
  cargarEstadisticas,
  seleccionarColeccion
} = useFirestoreStats()

// Cargar estadísticas automáticamente al montar la vista
onMounted(async () => {
  await cargarEstadisticas()
})
</script>

<style scoped>
/* Los estilos residen en las clases utilitarias de Tailwind y style.css */
</style>