<template>
  <div class="max-w-sm mx-auto p-8">
    <h1 class="text-xl font-semibold mb-4">Seleccioná tu rol</h1>

    <div class="space-y-3">
      <!-- Botón por cada rol -->
      <button
        v-for="r in roles"
        :key="r"
        @click="elegir(r)"
        class="btn btn-primary w-full"
      >
        {{ labels[r] || r }}
      </button>
    </div>

    <button
      @click="router.back()"
      class="text-sm text-stone-500 hover:text-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-400 rounded px-2 py-1 mt-4"
    >
      Volver
    </button>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { obtenerUsuario } from '@/composables/useUsuarios.js'
import { useLayout } from '@/composables/useLayout.js'

// reactive
const roles = ref([])

// Router y ruta actual
const router = useRouter()
const route = useRoute()

// Layout
const { setLayout } = useLayout()

// Diccionario para mostrar labels amigables
const labels = {
  estudiante: 'Estudiante',
  docente: 'Docente',
  bedel: 'Bedel',
  admin: 'Administrador'
}

// UID del usuario logueado (desde query o props)
const uid = route.query.uid || null

onMounted(async () => {
  if (!uid) {
    alert('Usuario no definido')
    router.push({ name: 'login' }) // Correcto: navegar por nombre a la ruta raíz
    return
  }

  // Traemos datos desde Firestore
  const usuario = await obtenerUsuario(uid)
  if (!usuario) {
    alert('Usuario no encontrado')
    router.push({ name: 'login' }) // Correcto: navegar por nombre a la ruta raíz
    return
  }

  // Cargamos roles en la UI
  roles.value = usuario.rol
})

/**
 * Elegir rol y redirigir al layout correspondiente
 */
function elegir(rol) {
  const rolEnMinusculas = rol.toLowerCase();
  setLayout(rolEnMinusculas); // Forzamos el cambio de layout/tema inmediatamente
  localStorage.setItem('rolActivo', rolEnMinusculas) // guardo rol en el localStorage
  switch (rolEnMinusculas) {
    case 'estudiante':
      router.push('/estudiante')
      break
    case 'docente': // Corregido para que coincida con el rol en la base de datos
      router.push('/docente')
      break
    case 'bedel':
      router.push('/bedel')
      break
    case 'admin':
      router.push('/admin')
      break
    default:
      alert('Rol desconocido')
  }
}
</script>
