<!-- src/components/FooterApp.vue -->
<template>
  <footer class="bg-stone-700 text-white text-xs flex-1 grid md:grid-cols-2 text-center">
    <div class="flex flex-col md:flex-row items-center justify-center gap-2 p-4">
      <span> {{ branch == "dev" ? 'Sistema en Desarrollo' : 'Versión' }} | <i>{{ branch }} v{{ version }} ({{ commit }})</i>
      <CodeBracketSquareIcon class="h-5 w-5 inline-block ml-2 mr-2 text-teal-200"/>
      <i>InformaticaESMN</i>  </span>
    </div>
    <div class="flex items-center justify-center">
      <button class="focus:text-teal-200 hover:text-teal-200 transition flex items-center justify-center pr-2">
        <AcademicCapIcon class="h-5 w-5 inline-block ml-2 mr-2"/>
        <a href="https://esm-nqn.infd.edu.ar/sitio/" target="_blank" rel="noopener noreferrer">
          Escuela Superior de Música de Neuquén &copy; {{ new Date().getFullYear() }}</a>
       </button>
      <a href="https://esm-nqn.infd.edu.ar/sitio/" target="_blank" rel="noopener noreferrer">
        <img src="/avatar.png" alt="Logo ESMN" class="w-10 mx-auto m-1 ml-3"></a>
    </div>
  </footer>
</template>
<script setup>
  import { CodeBracketSquareIcon } from '@heroicons/vue/16/solid';
  import { AcademicCapIcon } from '@heroicons/vue/24/outline';

  // Variables de entorno inyectadas en tiempo de compilación
  const version = __APP_VERSION__;
  const branch = __APP_BRANCH__;
  const commit = __APP_COMMIT__;

</script>