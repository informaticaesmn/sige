<!-- src/components/FooterApp.vue -->
<template>
  <footer class="bg-stone-800 text-stone-300 text-xs flex-1 grid md:grid-cols-2 text-center">
    
    <!-- Sección Izquierda: Info de Versión y Layout Actual -->
    <div class="flex flex-col md:flex-row items-center justify-center gap-x-4 gap-y-2 p-4">
      <!-- Info de Versión -->
      <div class="flex items-center gap-2">
        <CodeBracketSquareIcon class="h-5 w-5 text-primary-light"/> <!-- THEME-AWARE -->
        <span> 
          {{ branch == "dev" ? 'Desarrollo' : 'Versión' }} | <i>{{ branch }} v{{ version }} ({{ commit }})</i>
        </span>
      </div>

      <!-- Indicador de Layout -->
      <div 
        v-if="currentLayout" 
        class="bg-primary text-white text-xs font-bold uppercase rounded-full px-2 py-0.5"
      >
        {{ layoutDisplay }}
      </div>
    </div>

    <!-- Sección Derecha: Copyright y Enlaces -->
    <div class="flex items-center justify-center gap-4 p-4">
      <!-- Enlace a la ESMN con ícono -->
      <button 
        class="btn btn-link text-stone-300 focus:text-primary-light hover:text-primary-light transition
              focus:ring-2 focus:ring-offset-2 focus:ring-primary-light rounded-sm px-2 py-1 justify-center pr-2">
        <a 
          href="https://esm-nqn.infd.edu.ar/sitio/" 
          target="_blank" 
          rel="noopener noreferrer"
          class="flex items-center gap-2 transition-colors"
        >
          <AcademicCapIcon class="h-5 w-5"/>
          <span>Escuela Superior de Música de Neuquén &copy; {{ new Date().getFullYear() }}</span>
        </a>
      </button>  
      <a 
        href="https://esm-nqn.infd.edu.ar/sitio/" 
        target="_blank" 
        rel="noopener noreferrer" 
        class="shrink-0">
        <img src="/avatar.png" alt="Logo ESMN" class="w-10 rounded-full">
      </a>
    </div>

  </footer>
</template>


<script setup>
  import { CodeBracketSquareIcon } from '@heroicons/vue/16/solid';
  import { AcademicCapIcon } from '@heroicons/vue/24/outline';
  import { computed } from 'vue';
  import { useLayout } from '@/composables/useLayout';


  // Variables de entorno inyectadas en tiempo de compilación
  const version = __APP_VERSION__;
  const branch = __APP_BRANCH__;
  const commit = __APP_COMMIT__;
  const { currentLayout } = useLayout();

  const layoutDisplay = computed(() => {
    if (!currentLayout.value) return ' ';
    return currentLayout.value.charAt(0).toUpperCase() + currentLayout.value.slice(1);
  });
</script>