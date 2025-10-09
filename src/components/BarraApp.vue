<!-- src/components/BarraApp.vue -->
<template>
  <nav class="bg-primary-dark text-white px-4 py-2 md:px-6 flex items-center justify-between relative shadow-lg">

  <!-- Menú Mobile -->
    <button
      @click="toggleMenu"
      class="md:hidden text-white hover:text-teal-200 transition"
      aria-label="Menú"
    >
      <Bars3Icon class="h-8 w-8" />
    </button>

    <!-- Links desktop -->
    <div class="hidden md:flex items-center space-x-1">
      <button v-for="link in roleLinks" :key="link.to" @click="navigate(link.to)" class="hover:bg-teal-600 px-3 py-2 flex items-center rounded transition">
        <component :is="link.icon" class="h-5 w-5" />
        <span class="px-2">{{ link.text }}</span>
      </button>
    </div>

    <!-- Menú móvil desplegable -->
    <transition name="slide">
      <div v-if="menuOpen" class="md:hidden absolute top-full left-0 w-full bg-primary-dark flex flex-col space-y-2 px-4 py-3 shadow-lg z-20">
        <button v-for="link in roleLinks" :key="link.to" @click="navigate(link.to, true)" class="hover:bg-teal-600 px-3 py-2 rounded flex items-center transition text-left">
          <component :is="link.icon" class="h-5 w-5" />
          <span class="px-2">{{ link.text }}</span>
        </button>

        <!-- Botón de Salir (común a todos) -->
        <button @click="logout" class="w-full flex text-left hover:bg-red-700 px-3 py-2 rounded transition">
          <ArrowRightStartOnRectangleIcon class="h-6 w-6" /><span class="px-2">Salir</span>
        </button>
      </div>
    </transition>

    <!-- Menú de Usuario (derecha) -->
    <div class="relative">
      <button @click="toggleUserMenu" class="flex items-center space-x-2 hover:bg-teal-600 p-1 rounded-md transition">
        <span class="hidden md:inline text-sm font-medium">{{ userName }}</span>
        <img
          src="/avatar.png"
          alt="Usuario"
          class="w-8 h-8 rounded-full object-cover border-2 border-teal-300"
        />
      </button>

      <!-- Dropdown del menú de usuario -->
      <transition name="fade">
        <div v-if="userMenuOpen" v-on-click-outside="closeUserMenu" class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-20 text-stone-800">
          <button @click="navigate('/perfil', true)" class="w-full text-left block px-4 py-2 text-sm hover:bg-stone-100">
            Mi Perfil
          </button>
          <button v-if="userHasMultipleRoles" @click="navigate('/seleccionar-rol', true)" class="w-full text-left block px-4 py-2 text-sm hover:bg-stone-100">
            Cambiar Rol
          </button>
          <button @click="alert('Función no implementada')" class="w-full text-left block px-4 py-2 text-sm hover:bg-stone-100">
            Solicitar Baja
          </button>
          <div class="border-t border-stone-200 my-1"></div>
          <button @click="logout" class="w-full text-left block px-4 py-2 text-sm text-red-700 hover:bg-red-50">
            Salir
          </button>
        </div>
      </transition>
    </div>
  </nav>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useRouter } from 'vue-router'
import { vOnClickOutside } from '@vueuse/components'
import { Bars3Icon, Square3Stack3DIcon, WindowIcon, AcademicCapIcon, ArrowRightStartOnRectangleIcon } from '@heroicons/vue/24/outline'

const menuOpen = ref(false)

function toggleMenu() {
  menuOpen.value = !menuOpen.value
}

const userMenuOpen = ref(false)
const toggleUserMenu = () => {
  userMenuOpen.value = !userMenuOpen.value
}
const closeUserMenu = () => {
  userMenuOpen.value = false
}


const { user, logoutFirebase } = useAuth()
const router = useRouter()

// Obtenemos el primer rol del usuario para simplificar la lógica de la UI
const userRole = computed(() => {
  if (Array.isArray(user.value?.rol) && user.value.rol.length > 0) {
    return user.value.rol[0].toLowerCase();
  }
  return null;
});

const userHasMultipleRoles = computed(() => {
  return Array.isArray(user.value?.rol) && user.value.rol.length > 1;
});

const userName = computed(() => {
  return user.value?.displayName || user.value?.email || 'Usuario';
});

// --- Lógica de Menú Dinámico ---
const menuLinks = {
  estudiante: [
    { to: '/estudiante', text: 'Tablero', icon: WindowIcon },
    { to: '/estudiante/inscripciones', text: 'Inscripciones', icon: Square3Stack3DIcon },
    { to: '/estudiante/historial', text: 'Historial', icon: AcademicCapIcon },
  ],
  admin: [
    { to: '/admin', text: 'Tablero Admin', icon: WindowIcon },
  ],
  bedel: [
    { to: '/bedel', text: 'Tablero Bedel', icon: WindowIcon },
  ],
};

const roleLinks = computed(() => menuLinks[userRole.value] || []);

function navigate(path, closeMenus = false) {
  if (closeMenus) {
    menuOpen.value = false;
    userMenuOpen.value = false;
  }
  router.push(path);
}

async function logout() {
  await logoutFirebase()
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
  max-height: 15rem; /* Aumentado para dar espacio a más items */
}

/* Animación suave del dropdown de usuario */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>