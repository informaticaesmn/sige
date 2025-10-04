// src/composables/useLayout.js 
import { ref, watchEffect } from 'vue'

// Estado global para el layout lógico (lo que muestra el Footer)
const currentLayout = ref('acceso') // valor por defecto

// Estado para el tema visual (lo que aplica CSS)
const currentTheme = ref('estudiante') // tema por defecto

const themeNames = ['estudiante', 'docente', 'bedel', 'admin']
const layoutNames = ['estudiante', 'docente', 'bedel', 'admin', 'acceso']
const themeClasses = themeNames.map(name => `theme-${name}`)

export function useLayout() {
  /**
   * Cambia el layout de la aplicación.
   * @param {'estudiante' | 'docente' | 'bedel' | 'admin' | 'acceso'} layoutName
   */
  function setLayout(layoutName) {
    currentLayout.value = layoutName
    
    // Mapeo de layout a tema visual
    if (layoutName === 'acceso') {
      currentTheme.value = 'estudiante' // Acceso usa tema visual de estudiante
    } else {
      currentTheme.value = layoutName // Los demás usan su propio tema
    }
  }

  // Efecto para aplicar las clases CSS al body
  watchEffect(() => {
    // Limpiar todas las clases de tema
    document.body.classList.remove(...themeClasses);
    
    // Aplicar la clase del tema visual actual
    if (themeNames.includes(currentTheme.value)) {
      document.body.classList.add(`theme-${currentTheme.value}`);
    }
  });

  return { 
    currentLayout, // Para mostrar en Footer: "Acceso", "Estudiante", etc.
    currentTheme,  // Para casos donde necesites el tema visual
    setLayout 
  }
}