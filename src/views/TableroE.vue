<template>
   <div class="bg-stone-100 min-h-screen font-sans">
    <!-- Contenido Principal -->
    <div class="container mx-auto px-4 py-6">
      <h1 class="text-2xl md:text-3xl font-bold text-stone-800 mb-6">Dashboard Estudiantil</h1>
      
      <!-- Grid Principal -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Columna 1: Información Personal -->
        <div class="lg:col-span-1">
          <div class="bg-white rounded-lg shadow-md p-6 mb-6 card-hover transition-all duration-300">
            <div class="flex flex-col items-center mb-4">
              <img src="/logoesmn140.png" alt="Foto estudiante" class="w-24 h-24 rounded-full border-4 border-teal-500 mb-4">
              <h2 class="text-xl font-bold text-stone-800">Juan Perez</h2>
              <p class="text-stone-600">662- Profesorado de Música</p>
            </div>
            
            <div class="space-y-3">
              <div class="flex items-center">
                <envelope-icon class="h-5 w-5 inline-block ml-2 text-teal-600" />
                <span class="px-2">juanperez@gmail.com</span>
              </div>
              <div class="flex items-center">
                <IdentificationIcon class="h-5 w-5 inline-block ml-2 text-teal-600" />
                <span class="px-2">DNI: 40123123</span>
              </div>
              <div class="flex items-center">
                <AcademicCapIcon class="h-5 w-5 inline-block ml-2 text-teal-600" />
                <span class="px-2">Legajo: 40123123</span>
              </div>
              <div class="flex items-center">
                <PlayIcon class="h-5 w-5 inline-block ml-2 text-teal-600" />
                <span class="px-2">Estado: Activo</span>
              </div>
            </div>
            
            <button class="mt-6 w-full py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition">
              <PencilSquareIcon class="h-5 w-5 inline-block ml-2" /> 
              <span class="px-2">Editar Perfil</span>
            </button>
          </div>
          
          <!-- Acciones-->
          <div class="bg-white rounded-lg shadow-md p-6 card-hover transition-all duration-300">
            <div class="flex items-center mb-4">
            <WrenchIcon class="h-5 w-5 inline-block ml-2 text-teal-600" />
            <span class="text-lg font-bold flex items-center text-stone-800 px-2">Acciones</span></div>
            <button class="mt-4 w-full py-2 bg-stone-100 text-stone-800 rounded-lg hover:bg-stone-200 transition">
              <FingerPrintIcon class="h-5 w-5 inline-block text-stone-400" /> Datos Personales</button>
            <button  class="mt-4 w-full py-2 bg-stone-100 text-stone-800 rounded-lg hover:bg-stone-200 transition">
              <ArchiveBoxIcon class="h-5 w-5 inline-block text-stone-400" /> Legajo</button>
             <button class="mt-4 w-full py-2 bg-stone-100 text-stone-800 rounded-lg hover:bg-stone-200 transition">
              <ChatBubbleLeftEllipsisIcon class="h-5 w-5 inline-block text-stone-400" /> Mensaje a Bedelia</button>
          </div>
        </div>
        
        <!-- Columna 2: Planes y Materias -->
        <div class="lg:col-span-2">
          <!-- Planes de Estudio -->
          <div class="bg-white rounded-lg shadow-md p-6 mb-6 card-hover transition-all duration-300">
             <div class="flex items-center mb-4">
            <ChevronDoubleDownIcon class="h-5 w-5 inline-block ml-2 text-teal-600" />
            <span class="text-lg font-bold flex items-center text-stone-800 px-2">Planes de Estudio</span></div>
            
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead>
                  <tr class="bg-stone-100 text-left text-stone-800">
                    <th class="p-3">Plan</th>
                    <th class="p-3">Estado</th>
                    <th class="p-3">Progreso</th>
                    <th class="p-3">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  <tr class="border-b" >
                    <td class="p-3 font-medium">662 Profesorado de Música</td>
                    <td class="p-3">
                      <span class="px-2 py-1 rounded-full text-sm bg-green-100 text-green-800">
                        Activo
                      </span>
                    </td>
                    <td class="p-3">
                      <div class="w-full bg-stone-200 rounded-full h-2.5">
                        <div class="bg-teal-600 h-2.5 rounded-full progress-bar"></div>
                      </div>
                    </td>
                    <td class="p-3">
                      <button class="text-teal-600 hover:text-teal-800">
                        <EyeIcon class="h-5 w-5 inline-block" /> Detalle
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          <!-- Materias Aprobadas -->
          <div class="bg-white rounded-lg shadow-md p-6 card-hover transition-all duration-300">
              <div class="flex items-center mb-4">
            <CheckCircleIcon class="h-5 w-5 inline-block ml-2 text-teal-600" />
            <span class="text-lg font-bold flex items-center text-stone-800 px-2">Materias Aprobadas</span></div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Materia -->
              <div class="bg-stone-100 rounded-lg p-4">
                <div class="flex justify-between items-start">
                  <h4 class="font-medium text-stone-800">Psicología General</h4>
                  <span class="px-2 py-1 rounded-full text-sm bg-green-100 text-green-800">
                    Nota: 8
                  </span>
                </div>
                <p class="text-sm text-stone-600 mt-2">Código: 6620105</p>
                <p class="text-sm text-stone-600">Aprobada: 11/2022</p>
              </div>
            </div>
            
            <button class="mt-4 w-full py-3 bg-stone-100 text-stone-800 rounded-lg hover:bg-stone-200 transition">
              <ListBulletIcon class="h-6 w-6 inline-block text-stone-400" /> Detalle del historial académico
            </button>
          </div>
        </div>
      </div>
    </div>

    </div>
</template>

<script setup>
  import { AcademicCapIcon, ArchiveBoxIcon, ChatBubbleLeftEllipsisIcon, CheckCircleIcon, ChevronDoubleDownIcon, EnvelopeIcon, EyeIcon, FingerPrintIcon, IdentificationIcon, ListBulletIcon, PencilSquareIcon, PlayIcon,  WrenchIcon } from '@heroicons/vue/24/outline';
</script>

<style scoped>
    .fade-enter-active, .fade-leave-active {
      transition: opacity 0.3s;
    }
    .fade-enter, .fade-leave-to {
      opacity: 0;
    }
    .card-hover:hover {
      transform: translateY(-5px);
      box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
    }
    .progress-bar {
      transition: width 0.5s ease-in-out;
    }
</style>