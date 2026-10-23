<!-- src/views/bedel/TableroB.vue -->

<template>
  <div class="min-h-screen font-sans">
    <!-- Contenido Principal -->
    <div class="container mx-auto px-4 py-6">
      <h1 class="text-2xl font-medium mb-4">Tablero Bedel</h1>
      <!-- Grid Principal -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <!-- Columna Izquierda -->
        <div class="lg:col-span-1 space-y-6">
          <!-- Componente de Perfil de Usuario -->
          <PerfilCard :user="user" />

          <!-- Card de resumen de inscripciones pendientes -->
          <div class="card p-4">
            <h3 class="text-sm font-medium text-stone-500 mb-2">Inscripciones pendientes</h3>
            <p class="text-2xl font-bold text-primary">{{ inscripcionesPendientes.length }}</p>
          </div>
        </div>

        <!-- Columna Derecha -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Tabla de inscripciones pendientes -->
          <div v-if="cargandoInscripciones" class="card p-6 text-center text-stone-500">
            Cargando inscripciones...
          </div>
          <div v-else-if="inscripcionesPendientes.length === 0" class="card p-6 text-center text-stone-500">
            No hay inscripciones pendientes de confirmacion.
          </div>
          <div v-else class="card p-6">
            <h3 class="text-lg font-medium mb-4">Inscripciones pendientes</h3>
            <p class="text-sm text-stone-500">
              La funcionalidad completa esta en desarrollo.
              Esta seccion permite confirmar o rechazar inscripciones de estudiantes.
            </p>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { useBedel } from "@/composables/bedel/useBedel.js"
import PerfilCard from "@/components/estudiante/PerfilCard.vue"

const { user, inscripcionesPendientes, cargandoInscripciones } = useBedel()
</script>