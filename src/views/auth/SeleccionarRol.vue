<template>
  <div class="max-w-sm mx-auto p-8">
    <h1 class="text-xl font-semibold mb-4">Seleccioná tu rol</h1>

    <div class="space-y-3">
      <!-- Botón por cada rol -->
      <button
        v-for="r in roles"
        :key="r"
        @click="elegir(r)"
        class="w-full text-left p-3 bg-teal-600 text-white rounded hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-400"
      >
        {{ labels[r] || r }}
      </button>
    </div>

    <button
      @click="router.back()"
      class="text-sm text-gray-500 hover:text-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-400 rounded px-2 py-1 mt-4"
    >
      Volver
    </button>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { obtenerUsuario } from '@/composables/useUsuarios.js'

// reactive
const roles = ref([])

// Router y ruta actual
const router = useRouter()
const route = useRoute()

// Diccionario para mostrar labels amigables
const labels = {
  student: 'Estudiante',
  teacher: 'Docente',
  bedel: 'Bedel',
  admin: 'Administrador'
}

// UID del usuario logueado (desde query o props)
const uid = route.query.uid || null

onMounted(async () => {
  if (!uid) {
    alert('Usuario no definido')
    router.push('/login')
    return
  }

  // Traemos datos desde Firestore
  const usuario = await obtenerUsuario(uid)
  if (!usuario) {
    alert('Usuario no encontrado')
    router.push('/login')
    return
  }

  // Cargamos roles en la UI
  roles.value = usuario.roles
})

/**
 * Elegir rol y redirigir al layout correspondiente
 */
function elegir(rol) {
  localStorage.setItem('rolActivo', rol) // guardo rol en el localStorage
  switch (rol) {
    case 'student':
      router.push('/estudiante')
      break
    case 'teacher':
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
