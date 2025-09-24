import { createRouter, createWebHistory } from 'vue-router'
import { getAuth } from 'firebase/auth'


// router/index.js
const routes = [
  // LOGIN (sin layout)
  { path: '/', name: 'Login', component: () => import('@/views/Login.vue') },

  // SELECCIONAR ROL (sin layout)
  { path: '/seleccionar-rol', 
    name: 'SeleccionarRol', 
    component: () => import('@/views/SeleccionarRol.vue') },

  // Restablecer contraseña (sin layout)
  { path: '/reset-password', 
    name: 'ResetPassword', 
    component: () => import('@/views/ResetPassword.vue') },

  // ESTUDIANTE
  {
    path: '/estudiante',
    component: () => import('@/layouts/EstudianteLayout.vue'),
    meta: { requiresAuth: true, role: 'student' },
    children: [
      { path: '', name: 'EstudianteTablero', component: () => import('@/views/TableroE.vue') },
      { path: 'inscripciones', name: 'EstudianteInscripciones', component: () => import('@/views/InscripcionesE.vue') }
    ]
  },

  // ADMIN
  {
    path: '/admin',
    component: () => import('@/layouts/AdminLayout.vue'),
    meta: { requiresAuth: true, role: 'admin' },
    children: [
      { path: '', name: 'AdminTablero', component: () => import('@/views/TableroA.vue') }
    ]
  },

  // BEDEL
  {
    path: '/bedel',
    component: () => import('@/layouts/BedelLayout.vue'),
    meta: { requiresAuth: true, role: 'bedel' },
    children: [
      { path: '', name: 'BedelTablero', component: () => import('@/views/TableroB.vue') }
    ]
  }
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
  //onAuthStateChanged(auth, (user) => {
    if (requiresAuth && !user) {
      next('/')           // sin usuario → login
    } else {
      next()              // todo OK
    }
  })
  //})
  
export default router