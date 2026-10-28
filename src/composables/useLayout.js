// src/composables/useLayout.js
import { ref, watchEffect } from 'vue'

// Estado global para el layout logico (lo que muestra el Footer)
const currentLayout = ref('acceso')

// Estado para el tema visual (lo que aplica CSS)
const currentTheme = ref('estudiante')

const themeNames = ['estudiante', 'docente', 'bedel', 'coordinacion', 'admin']
const themeClasses = themeNames.map(name => `theme-${name}`)

/**
 * Cambia el layout de la aplicacion y aplica el tema visual correspondiente.
 * @param {'estudiante' | 'docente' | 'bedel' | 'coordinacion' | 'admin' | 'acceso'} layoutName
 */
function setLayout(layoutName) {
  currentLayout.value = layoutName

  // Mapeo de layout a tema visual
  if (layoutName === 'acceso') {
    currentTheme.value = 'estudiante'
  } else {
    currentTheme.value = layoutName
  }
}

// Efecto singleton a nivel de modulo (AGENTS.md seccion 7): se registra una sola vez,
// no en cada llamada a useLayout(). Aplica/limpia las clases de tema en body.
watchEffect(() => {
  document.body.classList.remove(...themeClasses)

  if (themeNames.includes(currentTheme.value)) {
    document.body.classList.add(`theme-${currentTheme.value}`)
  }
})

// El layout se configura en el router guard (beforeEach) antes de que
// los componentes se monten, evitando flash de tema.

/**
 * Hook singleton de layout. Los refs y la funcion setLayout son
 * modulo-level singletons (AGENTS.md seccion 7).
 */
export function useLayout() {
  return {
    currentLayout, // Layout logico para Footer: Acceso, Estudiante, etc.
    currentTheme,  // Tema visual para casos especiales
    setLayout
  }
}