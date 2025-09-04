<!-- src/components/BarraApp.vue -->
<template>
  <nav class="bg-teal-800 text-white px-4 py-3 md:px-6 flex items-center justify-between relative">

    <!-- Logo / nombre -->
   <!--  <router-link to="/dashboard" class="tracking-tight">
      RAC - ESMN
    </router-link> -->

    <!-- Hamburguesa móvil -->
    <!-- class="md:hidden text-white hover:text-teal-200 transition" -->
    <!-- <button
      @click="toggleMenu"
      class="md:hidden bg-red text-white hover:text-teal-200 transition"
      aria-label="Menú"
    >
     Men <i class="fas fa-bars text-xl"></i>
    </button>
 -->    <!-- Menú Mobile -->
    <button
      @click="toggleMenu"
      class="md:hidden text-white hover:text-teal-200 transition"
      aria-label="Menú"
    >
      <Bars3Icon class="h-8 w-8" />
    </button>

    <!-- Links desktop -->
    <div class="hidden md:flex items-center space-x-4">
      <router-link to="/dashboard" class="hover:bg-teal-500 px-3 py-2 rounded transition">
        Dashboard
      </router-link>
      <router-link to="/inscripciones" class="hover:bg-teal-500 px-3 py-2 rounded transition">
        Inscripciones
      </router-link>
      <router-link to="/otras" @click="menuOpen=false" class="hover:bg-teal-500 px-5 py-2 rounded transition">
          Funciones
      </router-link>
              <router-link to="/tablero" @click="menuOpen=false" class="hover:bg-teal-500 px-3 py-2 rounded transition">
          Tablero
        </router-link>
          <button @click="logout" class="w-full flex text-left hover:bg-red-600 px-3 py-2 rounded transition">
            Salir <arrow-right-start-on-rectangle-icon class="h-6 w-6" />
          </button> 
    </div>

    <!-- Menú móvil desplegable -->
    <transition name="slide">
      <div v-if="menuOpen" class="md:hidden absolute top-full left-0 w-full bg-teal-800 flex flex-col space-y-2 px-4 py-3 shadow-lg">
        <router-link to="/dashboard" @click="menuOpen=false" class="hover:bg-teal-500 px-3 py-2 rounded transition">
          Dashboard
        </router-link>
        <router-link to="/inscripciones" @click="menuOpen=false" class="hover:bg-teal-500 px-3 py-2 rounded transition">
          Inscripciones
        </router-link>
        <router-link to="/otras" @click="menuOpen=false" class="hover:bg-teal-500 px-3 py-2 rounded transition">
          Otras Funciones
        </router-link>
        <router-link to="/tablero" @click="menuOpen=false" class="hover:bg-teal-500 px-3 py-2 rounded transition">
          Tablero
        </router-link>
          <button @click="logout" class="w-full flex text-left hover:bg-red-600 px-3 py-2 rounded transition">
              Salir <arrow-right-start-on-rectangle-icon class="h-6 w-6" />
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
import { Bars3Icon } from '@heroicons/vue/24/outline'
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