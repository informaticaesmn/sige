<template>
  <div class="min-h-screen bg-stone-100 flex flex-col">
    <main class="flex-grow">
      <router-view />
    </main>
    <FooterApp />
  </div>
</template>

<script setup>
import FooterApp from './components/FooterApp.vue'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { useRouter } from 'vue-router'

const router = useRouter()
const authInstance = getAuth()

onAuthStateChanged(authInstance, (user) => {
  if (user) {
    // usuario logueado
    const rol = localStorage.getItem('rolActivo')
    const currentRoute = router.currentRoute.value.path

    if (rol && currentRoute !== '/'+rol) {
      // redirige directo al layout correspondiente si no estamos ya ahí
      switch (rol) {
        case 'student': router.push('/estudiante'); break
        case 'teacher': router.push('/docente'); break
        case 'bedel': router.push('/bedel'); break
        case 'admin': router.push('/admin'); break
      }
    } else if (!rol) {
      // si no hay rol activo → mostrar seleccionar rol
      localStorage.removeItem('rolActivo') // limpiar cualquier dato corrupto
      router.push('/seleccionar-rol?uid=' + user.uid)
    }
  } else {
    // no hay usuario → ir a login
    router.push('/login')
  }
})
</script>
