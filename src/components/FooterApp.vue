<!-- src/components/FooterApp.vue -->
<template>
  <footer class="bg-gray-700 text-white text-xs flex-1 grid md:grid-cols-2 text-center">
    <div class="flex flex-col md:flex-row items-center justify-center gap-2 p-4">
      <span>Sistema en desarrollo | <i>Versión 0.1.3 {{ version }}</i></span> 
      <CodeBracketSquareIcon class="h-5 w-5 inline-block ml-2 mr-4 text-teal-200"/>
      <span> <i> InformaticaESMN</i>  </span>
      <!-- <CubeTransparentIcon class="h-5 w-5 inline-block ml-2 text-teal-200"/> -->
    </div>
    <div class="flex items-center justify-center">
      <AcademicCapIcon class="h-5 w-5 inline-block ml-2"/>  
      <span> Escuela Superior de Música de Neuquén &copy; {{ new Date().getFullYear() }}</span>
      <img src="/avatar.png" alt="Logo ESMN" class="w-14 mx-auto mb-4">
    </div>
  </footer>
</template>
<script setup>
  import { CodeBracketSquareIcon } from '@heroicons/vue/16/solid';
  import { AcademicCapIcon, CubeTransparentIcon } from '@heroicons/vue/24/outline';
  const version = __APP_VERSION__;
</script>