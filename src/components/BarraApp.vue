<!-- src/components/BarraApp.vue -->
<template>
  <nav class="bg-primary-dark text-white px-4 py-2 md:px-6 flex items-center justify-between relative shadow-lg">

  <!-- Menú Mobile -->
    <button
      @click="toggleMenu"
      class="md:hidden p-2 -ml-2 text-white rounded-md transition-colors hover:bg-primary focus:outline-none focus:ring-2 focus:ring-primary-light"
      aria-label="Menú"
    >
      <Bars3Icon class="h-8 w-8" />
    </button>

    <!-- Links desktop -->
    <div class="hidden md:flex items-center space-x-1">
      <button v-for="link in roleLinks" :key="link.to" @click="navigate(link.to)" class="btn-nav flex items-center">
        <component :is="link.icon" class="h-5 w-5" />
        <span class="px-2">{{ link.text }}</span>
      </button>
    </div>

    <!-- Menú móvil desplegable -->
    <transition name="slide">
      <div v-if="menuOpen" class="md:hidden absolute top-full left-0 w-full bg-primary-dark flex flex-col space-y-2 px-4 py-3 shadow-lg z-20">
        <button v-for="link in roleLinks" :key="link.to" @click="navigate(link.to, true)" class="btn-nav flex justify-start text-left">
          <component :is="link.icon" class="h-5 w-5" />
          <span class="px-2">{{ link.text }}</span>
        </button>

        <!-- Botón de Salir (común a todos) -->
        <button @click="logout" class="btn btn-primary !bg-red-600 hover:!bg-red-700 w-full justify-start mt-2">
          <ArrowRightStartOnRectangleIcon class="h-5 w-5" /><span class="px-2">Salir</span>
        </button>
      </div>
    </transition>

    <!-- Menú de Usuario (derecha) -->
    <div class="relative">
      <button @click="toggleUserMenu" class="flex items-center space-x-2 p-1 pr-2 rounded-full transition-colors hover:bg-primary focus:outline-none focus:ring-2 focus:ring-primary-light">
        <span class="inline text-sm font-medium">{{ userName }}</span>
        <img
          src="/avatar.png"
          alt="Usuario"
          class="w-9 h-9 rounded-full object-cover border-2 border-primary-light"
        />
      </button>

      <!-- Dropdown del menú de usuario -->
      <transition name="fade">
        <div v-if="userMenuOpen" v-on-click-outside="closeUserMenu" class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-20 text-stone-800">
          <button @click="navigate('/perfil', true)" class="dropdown-item">
            Mi Perfil
          </button>
          <button 
            v-if="userHasMultipleRoles" 
            @click="navigate({ name: 'seleccionar-rol', query: { uid: user.uid } }, true)" 
            class="dropdown-item">
            Cambiar Rol
          </button>
          <button @click="alert('Función no implementada')" class="dropdown-item">
            Solicitar Baja
          </button>
          <div class="border-t border-stone-200 my-1"></div>
          <button @click="logout" class="dropdown-item dropdown-item-danger">
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

// Obtenemos el rol activo desde localStorage para mostrar el menú correcto.
const rolActivo = ref(localStorage.getItem('rolActivo') || 'estudiante');

// Escuchamos cambios en el storage para mantener la UI sincronizada
// si el usuario cambia de rol en otra pestaña.
onMounted(() => {
  window.addEventListener('storage', () => {
    rolActivo.value = localStorage.getItem('rolActivo') || 'estudiante';
  });
});

const userHasMultipleRoles = computed(() => {
  return Array.isArray(user.value?.roles) && user.value.roles.length > 1;
});

const userName = computed(() => {
  return user.value?.nombre || user.value?.email || 'Usuario';
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
  docente: [
    { to: '/docente', text: 'Tablero Docente', icon: WindowIcon },
  ],
};

const roleLinks = computed(() => menuLinks[rolActivo.value] || []);

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