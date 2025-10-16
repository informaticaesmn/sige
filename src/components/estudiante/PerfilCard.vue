<template>
  <!-- Usamos las nuevas clases de style.css para un código más limpio -->
  <div class="card card-interactive">
    <div class="flex flex-col items-center mb-4">
      <img src="/avatar.png" alt="Foto estudiante" class="w-24 h-24 rounded-full border-4 border-primary mb-4">
      <h2 class="text-xl font-bold text-stone-800">{{ user?.nombre || 'Estudiante' }}</h2>
      <p class="text-stone-600">{{ user?.carrera || 'Carrera no definida' }}</p>
    </div>
    
    <div class="space-y-3">
      <div class="flex items-center">
        <EnvelopeIcon class="h-5 w-5 inline-block ml-2 text-primary" />
        <span class="px-2">{{ user?.email }}</span>
      </div>
      <div class="flex items-center">
        <IdentificationIcon class="h-5 w-5 inline-block ml-2 text-primary" />
        <span class="px-2">DNI: {{ user?.dni || 'No definido' }}</span>
      </div>
      <div class="flex items-center">
        <AcademicCapIcon class="h-5 w-5 inline-block ml-2 text-primary" />
        <span class="px-2">Legajo: {{ user?.legajo || 'No definido' }}</span>
      </div>
      <div class="flex items-center">
        <PlayIcon class="h-5 w-5 inline-block ml-2 text-primary" />
        <span class="px-2">Estado: {{ user?.estado || 'Activo' }}</span>
      </div>
    </div>
    
    <!-- El botón ahora usa la clase genérica .btn y .btn-primary -->
    <button class="btn btn-primary w-full mt-6">
      <PencilSquareIcon class="h-5 w-5 mr-2" /> 
      <span>Editar Perfil</span>
    </button>
  </div>
</template>

<script setup>
import { 
  AcademicCapIcon, 
  EnvelopeIcon, 
  IdentificationIcon, 
  PencilSquareIcon, 
  PlayIcon
} from '@heroicons/vue/24/outline';

// El componente recibe el objeto 'user' como una propiedad (prop).
defineProps({
  user: {
    type: Object,
    default: () => ({})
  }
});
</script>

<style scoped>
/* Si hubiera estilos muy específicos para esta tarjeta, irían aquí.
   Por ahora, no son necesarios gracias a las clases de Tailwind y style.css */
</style>
