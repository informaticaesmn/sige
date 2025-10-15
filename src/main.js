// src/main.js
import './style.css' // ¡Importar el CSS PRIMERO es la clave!
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { useAuth } from '@/composables/useAuth.js'
import { useLayout } from '@/composables/useLayout.js'

const app = createApp(App)

app.use(router)

// --- Guardia de Navegación Global ---
// Inicializamos los composables UNA SOLA VEZ aquí, fuera del guardia.
// Esto crea un estado global y reactivo que compartirá toda la app.
const { user, estaCargando, isLoggedIn } = useAuth()
const { setLayout } = useLayout()

router.beforeEach(async (to, from, next) => {
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
      console.log('🛑 NO LOGUEADO. Redirigiendo a Acceso.');
      setLayout('estudiante'); // Tema por defecto para el login
      return next({ name: 'login' })
    }
    
    // El rol del usuario es un array, así que comprobamos si incluye el rol requerido.
    const userRoles = Array.isArray(user.value.rol) ? user.value.rol.map(r => r.toLowerCase()) : [];

    if (requiredRole && !userRoles.includes(requiredRole.toLowerCase())) {
      console.log(`🛑 ROL INCORRECTO. Usuario tiene rol '${user.value.rol}', se requiere '${requiredRole}'. Redirigiendo a Acceso.`);
      return next({ name: 'login' })
    }
    
    console.log('✅ ACCESO CONCEDIDO a ruta protegida.');
    // Actualizamos el layout según el rol de la ruta
    setLayout(requiredRole);
    return next()
  }
  
  // Caso 2: La ruta es pública (ej. /login), pero el usuario ya está logueado
  if (isLoggedIn.value && ['login', 'registro', 'reset-password'].includes(to.name)) {
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
  setLayout('estudiante');
  return next()
})

app.mount('#app')
