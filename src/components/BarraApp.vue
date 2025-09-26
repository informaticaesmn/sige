<!-- src/components/BarraApp.vue -->
<template>
  <nav class="bg-teal-800 text-white px-4 py-3 md:px-6 flex items-center justify-between relative">

  <!-- Menú Mobile -->
    <button
      @click="toggleMenu"
      class="md:hidden text-white hover:text-teal-200 transition"
      aria-label="Menú"
    >
      <Bars3Icon class="h-8 w-8" />
    </button>

    <!-- Links desktop -->
    <div class="hidden md:flex items-center">
      <router-link to="/dashboard" class="hover:bg-teal-500 px-2 py-2 flex rounded transition">
         <BookOpenIcon class="h-5 w-5" /> <span class="px-1">Dashboard</span> 
      </router-link>
      <router-link to="/inscripciones" class="hover:bg-teal-500 px-2 py-2 flex rounded transition">
         <Square3Stack3DIcon class="h-5 w-5" /> <span class="px-1">Inscripciones</span>
      </router-link>
      <router-link to="/otras" @click="menuOpen=false" class="hover:bg-teal-500 px-2 py-2 flex rounded transition">
        <CogIcon class="h-5 w-5" /> <span class="px-1">Funciones</span>
      </router-link>
              <router-link to="/tablero" @click="menuOpen=false" class="hover:bg-teal-500 px-2 py-2 flex rounded transition">
         <WindowIcon class="h-5 w-5" /> <span class="px-1">Tablero</span>
        </router-link>
          <button @click="logout" class="w-full flex text-left hover:bg-red-600 px-2 py-2 rounded transition">
            <arrow-right-start-on-rectangle-icon class="h-6 w-6" /><span class="px-1">Salir</span> 
          </button> 
    </div>

    <!-- Menú móvil desplegable -->
    <transition name="slide">
      <div v-if="menuOpen" class="md:hidden absolute top-full left-0 w-full bg-teal-800 flex flex-col space-y-2 px-4 py-3 shadow-lg">
        <router-link to="/tablero" @click="menuOpen=false" class="hover:bg-teal-500 px-3 py-2 rounded flex transition">
          <WindowIcon class="h-5 w-5" /> <BookOpenIcon class="h-5 w-5" /> <span class="px-2">Tablero</span>
        </router-link>
        <router-link to="/inscripciones" @click="menuOpen=false" class="hover:bg-teal-500 px-3 py-2 flex rounded transition">
          <Square3Stack3DIcon class="h-5 w-5" /> <span class="px-2">Inscripciones</span>
        </router-link>
        <router-link to="/otras" @click="menuOpen=false" class="hover:bg-teal-500 px-3 py-2 rounded flex transition">
          <CogIcon class="h-5 w-5" /> <span class="px-2">Funciones</span>
        </router-link>
          <button @click="logout" class="w-full flex text-left hover:bg-red-600 px-3 py-2 rounded transition">
            <arrow-right-start-on-rectangle-icon class="h-6 w-6" /><span class="px-2">Salir</span>
          </button> 
      </div>
    </transition>

    <!-- Foto / avatar -->
    <div class="flex items-center space-x-2">
      <span class="hidden md:inline text-sm">{{ user?.email || 'Usuario no registrado'  }}</span>
      <img
        src="/avatar.png"
        alt="Usuario"
        class="w-8 h-8 rounded-full object-cover border-2 border-teal-300"
      />
    </div>
  </nav>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { auth } from '@/config/firebase'
import { signOut } from 'firebase/auth'
import { useRouter } from 'vue-router'
import { Bars3Icon, BookOpenIcon, CogIcon, Square3Stack3DIcon, WindowIcon } from '@heroicons/vue/24/outline'
import {ArrowRightStartOnRectangleIcon } from '@heroicons/vue/24/outline'

const menuOpen = ref(false)

function toggleMenu() {
  menuOpen.value = !menuOpen.value
}

const { user } = useAuth()
const router = useRouter()

async function logout() {
  await signOut(auth)
  router.push('/')
}
</script>

<style scoped>
/* Animación suave del menú móvil */
.slide-enter-active,
.slide-leave-active {
  transition: max-height 0.25s ease;
  overflow: hidden;
}
.slide-enter-from,
.slide-leave-to {
  max-height: 0;
}
.slide-enter-to,
.slide-leave-from {
  max-height: 10rem;
}
</style>