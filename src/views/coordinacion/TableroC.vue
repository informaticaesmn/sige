<!-- src/views/coordinacion/TableroC.vue -->
<template>
  <div class="bg-stone-100 min-h-screen font-sans">
    <div class="container mx-auto px-4 py-6">
      <h1 class="text-2xl font-medium mb-4">Tablero Coordinación</h1>
      <p class="text-muted mb-6">
        Hola{{ nombreUsuario ? `, ${nombreUsuario}` : '' }}. Desde acá gestionás la carga masiva
        de usuarios y la oferta académica.
      </p>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Carga de usuarios -->
        <div class="card">
          <h4 class="card-header">Carga masiva de usuarios</h4>
          <p class="text-muted mb-4">
            Importa estudiantes, docentes y bedeles desde un CSV. Quedarán en estado
            <strong>pendiente_registro</strong> hasta que se registren en la app.
          </p>
          <button class="btn btn-primary" @click="irACarga">Ir a la carga de usuarios</button>
        </div>

        <!-- Carga de oferta -->
        <div class="card">
          <h4 class="card-header">Oferta académica</h4>
          <p class="text-muted mb-4">
            Publica (o reemplazá por completo) la oferta de un ciclo lectivo a partir de un CSV.
            Esta acción reemplaza la oferta vigente del ciclo.
          </p>
          <button class="btn btn-primary" @click="irACarga">Ir a la carga de oferta</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/auth/useAuth.js'

const router = useRouter()
const { user } = useAuth()

// Nombre para el saludo (con fallback a email)
const nombreUsuario = computed(() => {
  const nombre = [user.value?.nombre, user.value?.apellido].filter(Boolean).join(' ').trim()
  return nombre || user.value?.email || ''
})

function irACarga() {
  router.push({ name: 'CoordinacionCarga' })
}
</script>
