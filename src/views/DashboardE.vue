<!-- src/views/DashboardE.vue -->
<template>
  <div class="p-8">
    <h1 class="text-2xl font-bold mb-4">Tablero, Ficha, Legajo Estudiante</h1>

    <p v-if="user">
      Bienvenido/a <strong>{{ user.email }}</strong>
    </p>
    <p v-else>Cargando…</p>

    <button
      @click="logout"
      class="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
    >
      Cerrar sesión
    </button>
  </div>
  <main>
    <h1 class="text-2xl font-bold mb-4">Dashboard Estudiante</h1>
    <p>Contenido del dashboard para estudiantes. Aca tienen que ir sus datos personales</p>
  </main>
</template>

<script setup>
import { useAuth } from '@/composables/useAuth'
import { auth } from '@/config/firebase'
import { signOut } from 'firebase/auth'
import { useRouter } from 'vue-router'

const { user } = useAuth()
const router   = useRouter()

const logout = async () => {
  await signOut(auth)
  router.push('/')
}
</script>

