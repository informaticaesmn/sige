import { createRouter, createWebHistory } from 'vue-router'

import LoginE         from '@/views/LoginE.vue'
import DashboardE    from '@/views/DashboardE.vue'
import InscripcionesE from '@/views/InscripcionesE.vue'

const routes = [
  { path: '/',              name: 'Login',          component: LoginE },
  { path: '/dashboard',     name: 'Dashboard',      component: DashboardE },
  { path: '/inscripciones', name: 'Inscripciones',  component: InscripcionesE },
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router