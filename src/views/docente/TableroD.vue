<!-- src/views/docente/TableroD.vue -->

<template>
  <div class="min-h-screen font-sans text-stone-600">
    <!-- Contenido Principal -->
    <div class="container mx-auto px-4 py-6">
      <h1 class="text-2xl font-medium mb-4">Tablero Docente</h1>
      <!-- Grid Principal -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <!-- Columna Izquierda -->
        <div class="lg:col-span-1 space-y-6">
          <!-- Componente de Perfil de Usuario -->
          <PerfilCard :user="user" />

          <!-- Card de resumen de materias asignadas -->
          <div class="card p-4">
            <h3 class="text-sm font-medium text-stone-500 mb-2">Materias asignadas</h3>
            <p class="text-2xl font-bold text-primary">{{ materiasAsignadas.length }}</p>
          </div>
        </div>

        <!-- Columna Derecha -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Lista de materias asignadas -->
          <div v-if="cargandoMaterias" class="card p-6 text-center text-stone-500">
            Cargando materias...
          </div>
          <div v-else-if="materiasAsignadas.length === 0" class="card p-6 text-center text-stone-500">
            No hay materias asignadas.
          </div>
          <div v-else class="card p-6">
            <h3 class="text-lg font-medium mb-4">Materias asignadas</h3>
            <p class="text-sm text-stone-500">
              La funcionalidad completa esta en desarrollo.
              Esta seccion permite visualizar las materias asignadas y su carga horaria.
            </p>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { useDocente } from "@/composables/docente/useDocente.js"
import PerfilCard from "@/components/estudiante/PerfilCard.vue"

const { user, materiasAsignadas, cargandoMaterias } = useDocente()
</script>