<!-- src/components/admin/MetricasResumenCard.vue -->
<template>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

    <!-- KPI 1: Total Documentos -->
    <div class="card card-interactive border border-stone-200 p-5 flex flex-col justify-between">
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold tracking-wider text-stone-500 uppercase">
          Total Documentos
        </span>
        <div class="p-2 rounded-lg bg-rose-50 text-rose-600">
          <CircleStackIcon class="h-5 w-5" />
        </div>
      </div>

      <div class="mt-3">
        <div class="text-3xl font-bold text-stone-900">
          {{ totalDocumentos }}
        </div>
        <p class="text-xs text-stone-500 mt-1">
          En colecciones principales monitoreadas
        </p>
      </div>

      <div class="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
        <span>Usuarios + Oferta</span>
        <span class="font-medium text-stone-700">{{ metricasUsuarios.total + metricasOferta.totalCiclos }} docs</span>
      </div>
    </div>

    <!-- KPI 2: Usuarios (Registrados vs Pre-aprobados) -->
    <div class="card card-interactive border border-stone-200 p-5 flex flex-col justify-between">
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold tracking-wider text-stone-500 uppercase">
          Colección Usuarios
        </span>
        <div class="p-2 rounded-lg bg-sky-50 text-sky-600">
          <UsersIcon class="h-5 w-5" />
        </div>
      </div>

      <div class="mt-3">
        <div class="text-3xl font-bold text-stone-900">
          {{ metricasUsuarios.total }}
        </div>
        <p class="text-xs text-stone-500 mt-1">
          Documentos en <code>usuarios/</code>
        </p>
      </div>

      <div class="mt-3 pt-3 border-t border-stone-100 grid grid-cols-2 gap-2 text-xs">
        <div class="flex items-center gap-1.5 text-emerald-700 font-medium">
          <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>{{ metricasUsuarios.registrados }} Activos</span>
        </div>
        <div class="flex items-center gap-1.5 text-amber-700 font-medium justify-end">
          <span class="w-2 h-2 rounded-full bg-amber-500"></span>
          <span>{{ metricasUsuarios.preAprobados }} Pre-aprobados</span>
        </div>
      </div>
    </div>

    <!-- KPI 3: Distribución por Roles -->
    <div class="card card-interactive border border-stone-200 p-5 flex flex-col justify-between">
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold tracking-wider text-stone-500 uppercase">
          Roles Asignados
        </span>
        <div class="p-2 rounded-lg bg-indigo-50 text-indigo-600">
          <ShieldCheckIcon class="h-5 w-5" />
        </div>
      </div>

      <div class="mt-3 space-y-1.5">
        <div class="flex items-center justify-between text-xs">
          <span class="text-stone-600">Estudiantes:</span>
          <span class="font-semibold text-stone-800 bg-stone-100 px-2 py-0.5 rounded">
            {{ metricasUsuarios.porRol.estudiante }}
          </span>
        </div>
        <div class="flex items-center justify-between text-xs">
          <span class="text-stone-600">Docentes:</span>
          <span class="font-semibold text-stone-800 bg-stone-100 px-2 py-0.5 rounded">
            {{ metricasUsuarios.porRol.docente }}
          </span>
        </div>
        <div class="flex items-center justify-between text-xs">
          <span class="text-stone-600">Bedeles / Admins:</span>
          <span class="font-semibold text-stone-800 bg-stone-100 px-2 py-0.5 rounded">
            {{ metricasUsuarios.porRol.bedel }} / {{ metricasUsuarios.porRol.admin }}
          </span>
        </div>
      </div>

      <div class="mt-3 pt-3 border-t border-stone-100 text-xs text-stone-400 text-right">
        Basado en campo <code>roles[]</code>
      </div>
    </div>

    <!-- KPI 4: Oferta Académica -->
    <div class="card card-interactive border border-stone-200 p-5 flex flex-col justify-between">
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold tracking-wider text-stone-500 uppercase">
          Oferta Académica
        </span>
        <div class="p-2 rounded-lg bg-teal-50 text-teal-600">
          <CalendarDaysIcon class="h-5 w-5" />
        </div>
      </div>

      <div class="mt-3">
        <div class="text-3xl font-bold text-stone-900">
          {{ metricasOferta.totalCiclos }}
        </div>
        <p class="text-xs text-stone-500 mt-1">
          Ciclos registrados en <code>ofertaAcademica/</code>
        </p>
      </div>

      <div class="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
        <span class="text-stone-500">Etapas vigentes hoy:</span>
        <span 
          class="font-medium px-2 py-0.5 rounded-full"
          :class="metricasOferta.etapasActivas > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-600'"
        >
          {{ metricasOferta.etapasActivas }} activas
        </span>
      </div>
    </div>

  </div>
</template>

<script setup>
/**
 * @file MetricasResumenCard.vue
 * @description Muestra las tarjetas con las métricas cuantitativas clave de la base de datos Firestore.
 */
import { computed } from 'vue'
import {
  CircleStackIcon,
  UsersIcon,
  CalendarDaysIcon,
  ShieldCheckIcon
} from '@heroicons/vue/24/outline'

const props = defineProps({
  metricasUsuarios: {
    type: Object,
    required: true,
    default: () => ({
      total: 0,
      registrados: 0,
      preAprobados: 0,
      porRol: { admin: 0, bedel: 0, docente: 0, estudiante: 0 }
    })
  },
  metricasOferta: {
    type: Object,
    required: true,
    default: () => ({
      totalCiclos: 0,
      ciclos: [],
      etapasActivas: 0
    })
  }
})

const totalDocumentos = computed(() => {
  return (props.metricasUsuarios?.total || 0) + (props.metricasOferta?.totalCiclos || 0)
})
</script>

