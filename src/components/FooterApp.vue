<!-- src/components/FooterApp.vue -->
<template>
  <footer class="bg-gray-700 text-white text-xs text-center py-2">
    <span>Sistema en desarrollo |</span> 
    <span><i>Versión 0.1.3</i></span> 
    <CodeBracketSquareIcon class="h-5 w-5 inline-block ml-2 mr-4 text-teal-200"/>
    <span> <i> InformaticaESMN</i>  </span>
    <!-- <CubeTransparentIcon class="h-5 w-5 inline-block ml-2 text-teal-200"/> -->
    <div flex>
    <span>&copy; {{ new Date().getFullYear() }} Escuela Superior de Música de Neuquén</span>
    <AcademicCapIcon class="h-5 w-5 inline-block ml-2"/>  
    </div>
  </footer>
</template>
<script setup>
  import { CodeBracketSquareIcon } from '@heroicons/vue/16/solid';
import { AcademicCapIcon, CubeTransparentIcon } from '@heroicons/vue/24/outline'
</script>