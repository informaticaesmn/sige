import { createRouter, createWebHistory } from 'vue-router'
import { onAuthStateChanged } from 'firebase/auth'
import { getAuth } from 'firebase/auth'

import LoginE         from '@/views/LoginE.vue'
import DashboardE     from '@/views/DashboardE.vue'
import InscripcionesE from '@/views/InscripcionesE.vue'
import OtrasFunciones from '@/views/OtrasFunciones.vue'
import TableroE       from '@/views/TableroE.vue'  


const routes = [
  { path: '/',              name: 'Login',          component: LoginE },
  { path: '/dashboard',     name: 'Dashboard',      component: DashboardE },
  { path: '/inscripciones', name: 'Inscripciones',  component: InscripcionesE },
  { path: '/otras',         name: 'OtrasFunciones', component: OtrasFunciones, meta: { requiresAuth: true } },
  { path: '/tablero',       name: 'Tablero',        component: TableroE}
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 👇 Guardia global para no dar acceso hasta que Firebase responda
router.beforeEach(async (to, from, next) => {
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
  const auth =getAuth()
  const user = auth.currentUser

   // onAuthStateChanged se dispara inmediatamente con el valor actual
  onAuthStateChanged(auth, (user) => {
    if (requiresAuth && !user) {
      next('/')           // sin usuario → login
    } else {
      next()              // todo OK
    }
  })
})
  
export default router