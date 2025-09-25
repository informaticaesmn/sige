// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import { getAuth } from 'firebase/auth'

const routes = [
  // SIN LAYOUT (autenticación)
  {
    path: '/',
    component: () => import('@/layouts/Acceso.vue'),
    children: [
      { path: '', name: 'Login', component: () => import('@/views/auth/Login.vue') },
      { path: 'registro', name: 'Registro', component: () => import('@/views/auth/Register.vue') },
      { path: 'reset-password', name: 'ResetPassword', component: () => import('@/views/auth/ResetPassword.vue') },
      { path: 'seleccionar-rol', name: 'SeleccionarRol', component: () => import('@/views/auth/SeleccionarRol.vue') }
    ]
  },

  // CON LAYOUT (estudiante)
  {
    path: '/estudiante',
    component: () => import('@/layouts/EstudianteLayout.vue'),
    meta: { requiresAuth: true, role: 'student' },
    children: [
      { path: '', name: 'EstudianteTablero', component: () => import('@/views/student/TableroE.vue') },
      { path: 'inscripciones', name: 'EstudianteInscripciones', component: () => import('@/views/student/InscripcionesE.vue') }
    ]
  },

  // CON LAYOUT (admin)
  {
    path: '/admin',
    component: () => import('@/layouts/AdminLayout.vue'),
    meta: { requiresAuth: true, role: 'admin' },
    children: [
      { path: '', name: 'AdminTablero', component: () => import('@/views/admin/TableroA.vue') }
    ]
  },

  // CON LAYOUT (bedel)
  {
    path: '/bedel',
    component: () => import('@/layouts/BedelLayout.vue'),
    meta: { requiresAuth: true, role: 'bedel' },
    children: [
      { path: '', name: 'BedelTablero', component: () => import('@/views/bedel/TableroB.vue') }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 👇 Guardia global para no dar acceso hasta que Firebase responda
router.beforeEach((to, from, next) => {
  const requiresAuth = to.matched.some(r => r.meta.requiresAuth)
  const auth =getAuth()
  const user = auth.currentUser

    if (requiresAuth && !user) {
      next('/')           // sin usuario → login
    } else {
      next()              // todo OK
    }
  })

  
export default router