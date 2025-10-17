// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import { routerInstance } from './routerInstance' // Importamos el objeto contenedor

const routes = [

  // SIN LAYOUT (autenticación)
  {
    path: '/',
    name: 'Acceso',
    component: () => import('@/layouts/AccesoLayout.vue'),
    children: [
      { path: '', name: 'login', component: () => import('@/views/auth/Login.vue') }, // Se renderiza en la ruta '/'
      { path: 'registro', name: 'registro', component: () => import('@/views/auth/Register.vue') },
      { path: 'reset-password', name: 'reset-password', component: () => import('@/views/auth/ResetPassword.vue') },
      { path: 'seleccionar-rol', name: 'seleccionar-rol', component: () => import('@/views/auth/SeleccionarRol.vue') },
      { path: 'terminos', name: 'terminos', component: () => import('@/views/auth/Terminos.vue') }
    ]
  },

  // CON LAYOUT (estudiante)
  // tengo que agregar las ruta perfil pero para todos los roles
  {
    path: '/estudiante',
    component: () => import('@/layouts/EstudianteLayout.vue'),
    meta: { requiresAuth: true, role: 'estudiante' },
    children: [
      { path: '', name: 'EstudianteTablero', component: () => import('@/views/estudiante/TableroE.vue') },
      { path: 'inscripciones', name: 'EstudianteInscripciones', component: () => import('@/views/estudiante/InscripcionesE.vue') },
      { path: 'historial', name: 'HAcademico', component: () => import('@/views/estudiante/HAcademico.vue') }
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
  },

  // CON LAYOUT (docente)
  {
    path: '/docente',
    component: () => import('@/layouts/DocenteLayout.vue'), // Asumimos que existe o se creará un DocenteLayout.vue
    meta: { requiresAuth: true, role: 'docente' },
    children: [
      { path: '', name: 'DocenteTablero', component: () => import('@/views/docente/TableroD.vue') }
    ]
  }
]

const createdRouter = createRouter({
  history: createWebHistory(),
  routes
})

// Asignamos la instancia creada a nuestra referencia exportada.
// Ahora, cualquier archivo que importe `routerInstance` tendrá acceso al router.
routerInstance.router = createdRouter;

export default createdRouter