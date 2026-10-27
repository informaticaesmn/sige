<template>
  <div class="max-w-sm mx-auto p-8">
    <!-- Mensaje de error en UI (no alert, AGENTS.md §5) -->
    <div
      v-if="errorMsg"
      class="mb-4 p-3 text-sm text-red-800 bg-red-100 border border-red-200 rounded"
    >
      {{ errorMsg }}
    </div>

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
import { obtenerUsuario } from '@/composables/usuarios/useUsuarios.js'
import { useLayout } from '@/composables/useLayout.js'

// reactive
const roles = ref([])

// Router y ruta actual
const router = useRouter()
const route = useRoute()

// Layout — el router guard llama setLayout(undefined) para esta ruta
// (no tiene meta.role), lo que limpia el tema y deja los botones sin estilos.
// Aplicamos el layout de acceso al montar para heredar el theme vigente.
const { setLayout } = useLayout()
setLayout('acceso')

// Estado de error en UI (reemplaza alert(), AGENTS.md §5)
const errorMsg = ref(null)

// Diccionario para mostrar labels amigables
const labels = {
  estudiante: 'Estudiante',
  docente: 'Docente',
  bedel: 'Bedel',
  coordinacion: 'Coordinación',
  admin: 'Administrador'
}

// UID del usuario logueado (desde query o props)
const uid = route.query.uid || null

onMounted(async () => {
  if (!uid) {
    errorMsg.value = 'Usuario no definido'
    setTimeout(() => router.push({ name: 'login' }), 2000)
    return
  }

  // Traemos datos desde Firestore
  const usuario = await obtenerUsuario(uid)
  if (!usuario) {
    errorMsg.value = 'Usuario no encontrado'
    setTimeout(() => router.push({ name: 'login' }), 2000)
    return
  }

  // Cargamos roles en la UI
  roles.value = usuario.roles || []
})

/**
 * Elegir rol y redirigir al layout correspondiente
 */
function elegir(rol) {
  // El rol ya viene en minúsculas desde el composable useUsuarios
  setLayout(rol); // Forzamos el cambio de layout/tema inmediatamente
  localStorage.setItem('rolActivo', rol) // guardo rol en el localStorage

  // redirigir directamente - ya no necesito el switch
  router.push({ path: `/${rol}` })
}
</script>
