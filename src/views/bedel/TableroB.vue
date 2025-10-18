/* src/views/bedel/TableroB.vue */
<template>
  <div class="bg-stone-100 min-h-screen font-sans">
    <!-- Contenido Principal -->
    <div class="container mx-auto px-4 py-6">
      <h1 class="text-2xl font-medium mb-4">Tablero Bedel</h1>
      <p>Tablero en construcción... por ahora copiado del Tablero Estudiante</p>
      <!-- Grid Principal -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <!-- Columna Izquierda -->
        <div class="lg:col-span-1 space-y-6">
          <!-- Componente de Perfil de Usuario -->
          <PerfilCard :user="user" />

          <!-- Componente de Planes de Estudio (simplificado) -->
          <PlanesEstudioCard :planes="user?.planes" />
        </div>

        <!-- Columna Derecha -->
        <div class="lg:col-span-2 space-y-6">
          <!-- NUEVO: Componente de Inscripciones Vigentes -->
          <InscripcionesVigentesCard :user-id="user?.uid" />

          <!-- Componente de Resumen de Materias Aprobadas -->
          <MateriasAprobadasCard :user-id="user?.uid" />
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { useAuth } from '@/composables/useAuth.js';

// Importar los nuevos componentes.
// Asegúrate de crear estos archivos en la ruta especificada.
import PerfilCard from '@/components/estudiante/PerfilCard.vue';
import PlanesEstudioCard from '@/components/estudiante/PlanesEstudioCard.vue';
import InscripcionesVigentesCard from '@/components/estudiante/InscripcionesVigentesCard.vue';
import MateriasAprobadasCard from '@/components/estudiante/MateriasAprobadasCard.vue';

const { user } = useAuth();

// La lógica de obtención de datos más específica (como inscripciones o historial)
// se moverá dentro de cada componente hijo para mantener este archivo limpio.
</script>

<style scoped>
/* Los estilos específicos ahora residen en sus respectivos componentes.
   Este bloque puede quedar vacío o eliminarse si no hay estilos
   que apliquen únicamente al layout del tablero. */
</style>
