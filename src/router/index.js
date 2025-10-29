// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import { routerInstance } from './routerInstance.js' // importar el objeto router

// Definimos las rutas
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
      { path: 'historial', name: 'HAcademico', component: () => import('@/views/estudiante/HAcademico.vue') },
      { path: 'planes', name: 'PlanesEstudio', component: () => import('@/views/estudiante/PlanesEstudioView.vue') }
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
      { path: '', name: 'BedelTablero', component: () => import('@/views/bedel/TableroB.vue') },
      { path: 'inscripciones', name: 'ConfirmarInscripciones', component: () => import('@/views/bedel/ConfirmarInscripciones.vue') }
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

// GUARDIA GLOBAL DE NAVEGACIÓN
// Esta es la única guardia que debe existir en la aplicación.
import { useAuth } from '@/composables/auth/useAuth.js'
import { useLayout } from '@/composables/useLayout.js'

createdRouter.beforeEach(async (to, from, next) => {
  // Extraemos las funciones y el estado que necesitamos
  // Ahora los composables se importan estáticamente al principio del archivo.
  const { user, isLoggedIn, userRoles, checkAuthState } = useAuth()
  const { setLayout } = useLayout()

  // 1. ESPERAR INICIALIZACIÓN DE AUTH
  // Pausa la navegación hasta que Firebase confirme si hay un usuario logueado o no.
  await checkAuthState()

  // 2. DEFINIR CONSTANTES DE LA RUTA
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
  const requiredRole = to.meta.role
  // Rutas de las que un usuario logueado debe "escapar" (ser redirigido).
  // 'seleccionar-rol' se excluye a propósito para permitir que los usuarios con
  // múltiples roles lleguen a esa página después de iniciar sesión.
  const isAuthEscapeRoute = ['login', 'registro', 'reset-password', 'terminos'].includes(to.name)

  // 3. LÓGICA PARA USUARIOS LOGUEADOS
  if (isLoggedIn.value) {
    // Si intenta acceder a una ruta de acceso (login, etc.), lo redirigimos.
    if (isAuthEscapeRoute) {
      const primaryRole = userRoles.value[0]
      return next(primaryRole ? `/${primaryRole}` : '/') // A su dashboard o a la raíz
    }

    // Si la ruta requiere un rol y el usuario no lo tiene, lo redirigimos.
    if (requiresAuth && requiredRole && !userRoles.value.includes(requiredRole)) {
      console.warn(`Acceso denegado: El usuario no tiene el rol '${requiredRole}' para acceder a '${to.path}'`)
      const primaryRole = userRoles.value[0]
      return next(primaryRole ? `/${primaryRole}` : '/') // A su dashboard o a la raíz
    }

    // Si tiene permiso, ajustamos el layout según el rol de la ruta y permitimos el paso.
    setLayout(requiredRole)
    return next()
  }

  // 4. LÓGICA PARA USUARIOS NO LOGUEADOS
  if (!isLoggedIn.value) {
    // Definimos aquí las rutas públicas de acceso para que el layout se aplique correctamente.
    const isAccesoRoute = ['login', 'registro', 'reset-password', 'terminos', 'seleccionar-rol'].includes(to.name)

    // Si la ruta es de acceso, aplicamos el layout 'acceso' y permitimos el paso.
    if (isAccesoRoute) {
      setLayout('acceso') // <-- ¡AQUÍ ESTÁ LA MAGIA!
      return next()
    }

    // Si la ruta requiere autenticación, lo mandamos al login.
    if (requiresAuth) {
      return next({ name: 'login' })
    }
  }

  // 5. FALLBACK
  // Si ninguna de las condiciones anteriores se cumple, permite el paso por seguridad.
  next()
})

// Manejo de errores global
createdRouter.onError((error) => {
  console.error('Error de navegación:', error)
  // Podrías redirigir a una página de error aquí
})

// Asignamos la instancia creada a nuestra referencia exportada.
routerInstance.router = createdRouter;

export default createdRouter