// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import { routerInstance } from './routerInstance' // Importamos el objeto contenedor
import { useLayout } from '@/composables/useLayout.js'
import { useAuth } from '@/composables/useAuth.js'

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
  {
    path: '/estudiante',
    component: () => import('@/layouts/EstudianteLayout.vue'),
    meta: { requiresAuth: true, role: 'estudiante' },
    children: [
      { path: '', name: 'EstudianteTablero', component: () => import('@/views/estudiante/TableroE.vue') },
      { path: 'inscripciones', name: 'EstudianteInscripciones', component: () => import('@/views/estudiante/InscripcionesE.vue') }
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

/**
 * Guardia de Navegación Global
 *
 * 1. Espera a que el estado de autenticación de Firebase esté cargado.
 * 2. Protege las rutas que requieren autenticación.
 * 3. Protege las rutas según el rol del usuario.
 * 4. Redirige a los usuarios logueados si intentan acceder a páginas de autenticación.
 */
const { user, estaCargando, isLoggedIn } = useAuth()
const { setLayout } = useLayout()

createdRouter.beforeEach(async (to, from, next) => {
  console.log(`%c--- Navegando de ${from.path} a ${to.path} ---`, 'color: yellow; font-weight: bold;');

  // Esperamos a que onAuthStateChanged termine de ejecutarse
  while (estaCargando.value) {
    console.log('... ⏳ esperando a que Firebase cargue el estado de auth');
    // Este bucle ahora funcionará porque 'estaCargando' es la instancia global
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
  console.log(`%cAuth cargado. Usuario logueado: ${isLoggedIn.value}`, 'color: cyan');
  
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth)
  const requiredRole = to.meta.role
  
  console.log(`Ruta requiere autenticación: ${requiresAuth}`);
  if (requiredRole) console.log(`Ruta requiere rol: ${requiredRole}`);

  // Caso 1: La ruta requiere autenticación
  if (requiresAuth) {
    if (!isLoggedIn.value) {
      // Usuario no logueado, redirigir a login
      console.log('🛑 NO LOGUEADO. Redirigiendo a Acceso.');
      return next({ name: 'Acceso' })
    }
    
    // Usuario logueado, pero la ruta requiere un rol específico
    // El rol del usuario es un array, así que comprobamos si incluye el rol requerido.
    const userRoles = Array.isArray(user.value.rol) ? user.value.rol.map(r => r.toLowerCase()) : [];

    if (requiredRole && !userRoles.includes(requiredRole.toLowerCase())) {
      // El usuario no tiene el rol necesario.
      console.log(`🛑 ROL INCORRECTO. Usuario tiene rol '${user.value.rol}', se requiere '${requiredRole}'. Redirigiendo a Acceso.`);
      return next({ name: 'Acceso' })
    }
    
    // Usuario logueado y con el rol correcto (o la ruta no requiere rol)
    console.log('✅ ACCESO CONCEDIDO a ruta protegida.');
    // Actualizamos el layout según el rol de la ruta
    setLayout(requiredRole);
    return next()
  }
  
  // Caso 2: La ruta es pública (ej. /login), pero el usuario ya está logueado
  if (isLoggedIn.value && ['login', 'registro', 'reset-password'].includes(to.name)) {
    // Si el usuario está logueado pero aún no se cargaron sus roles (user.value es null o no tiene .rol),
    // es un estado transitorio. No hacemos nada y esperamos a que el estado se resuelva.
    const userRoles = user.value?.rol; 
    if (!userRoles || !Array.isArray(userRoles) || userRoles.length === 0) {
      // Si el usuario está logueado pero aún no se cargaron sus roles,
      // es mejor no hacer nada y dejar que la UI muestre un estado de carga.
      return next();
    }
    const rol = userRoles[0].toLowerCase();
    console.log(`↩️ USUARIO YA LOGUEADO. Redirigiendo al tablero de '${rol}'.`);    
    // ¡Llamamos a setLayout aquí para asegurar el cambio de tema!
    setLayout(rol);
    if (rol === 'admin') return next({ name: 'AdminTablero' });
    if (rol === 'bedel') return next({ name: 'BedelTablero' });
    if (rol === 'docente') return next({ name: 'DocenteTablero' });
    // Por defecto, si el rol es estudiante o cualquier otro no especificado
    setLayout('estudiante');
    return next({ name: 'EstudianteTablero' }); // Fallback a estudiante
  }
  
  // Caso 3: Ruta pública y usuario no logueado
  console.log('✅ ACCESO CONCEDIDO a ruta pública.');
  // Para rutas públicas como login, usamos el layout 'acceso'
  setLayout('acceso');
  return next()
})
  
export default createdRouter