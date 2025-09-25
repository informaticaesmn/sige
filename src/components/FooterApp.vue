<!-- src/components/FooterApp.vue -->
<template>
  <footer class="bg-gray-700 text-white text-xs flex-1 grid md:grid-cols-2 text-center">
    <div class="flex flex-col md:flex-row items-center justify-center gap-2 p-4">
      <span>Sistema en desarrollo | <i>Versión {{ version }} ({{ commit }})</i>
      <CodeBracketSquareIcon class="h-5 w-5 inline-block ml-2 mr-2 text-teal-200"/>
      <i>InformaticaESMN</i>  </span>
      <!-- <CubeTransparentIcon class="h-5 w-5 inline-block ml-2 text-teal-200"/> -->
    </div>
    <div class="flex items-center justify-center">
      <AcademicCapIcon class="h-5 w-5 inline-block ml-2 mr-2 hover:text-teal-200"/>  
      <span class="hover:text-teal-200">
        <a href="https://www.esm-nqn.infd.edu.ar" target="_blank" rel="noopener noreferrer">
          Escuela Superior de Música de Neuquén &copy; {{ new Date().getFullYear() }}</a></span>
      <a href="https://www.esm-nqn.infd.edu.ar" target="_blank" rel="noopener noreferrer">
        <img src="/avatar.png" alt="Logo ESMN" class="w-10 mx-auto m-1 ml-6"></a>
    </div>
  </footer>
</template>
<script setup>
  import { CodeBracketSquareIcon } from '@heroicons/vue/16/solid';
  import { AcademicCapIcon, CubeTransparentIcon } from '@heroicons/vue/24/outline';
  const version = __APP_VERSION__;
  const commit = __APP_COMMIT__;
</script>