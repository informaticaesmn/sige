// src/composables/useLayout.js (DESPUÉS)
import { ref, watchEffect } from 'vue'

// Estado global y reactivo que almacena el nombre del layout actual
const currentLayout = ref('student') // Lo iniciamos en student (o el que prefieras por defecto)

// Un array con todos los nombres de temas posibles para facilitar la limpieza
const themeNames = ['student', 'docente', 'bedel', 'admin']
const themeClasses = themeNames.map(name => `theme-${name}`)

export function useLayout() {
  /**
   * Cambia el layout (y por lo tanto el tema) de la aplicación.
   * @param {'student' | 'docente' | 'bedel' | 'admin' | 'acceso'} layoutName
   */
  function setLayout(layoutName) {
    // Manejamos el caso especial de 'acceso' aquí mismo.
    // Si el layout es 'acceso', el tema que aplicamos es 'student'.
    if (layoutName === 'acceso') {
      currentLayout.value = 'student'
    } else {
      currentLayout.value = layoutName
    }
  }

  // watchEffect es el hook perfecto para efectos secundarios que dependen de estado reactivo.
  // Se ejecutará una vez al inicio y luego cada vez que `currentLayout.value` cambie.
  watchEffect(() => {
    // 1. Limpiamos CUALQUIER clase de tema que pudiera existir en el body.
    //    Esto previene que se acumulen clases como "theme-student theme-docente".
    document.body.classList.remove(...themeClasses);

    // 2. Si hay un layout válido, añadimos la clase de tema correspondiente.
    if (themeNames.includes(currentLayout.value)) {
      document.body.classList.add(`theme-${currentLayout.value}`);
    }
  });

  // Ya no necesitamos devolver `layoutColor`.
  // La magia ahora ocurre automáticamente en el watchEffect.
  // Devolvemos solo lo que los componentes necesitan para interactuar.
  return { 
    currentLayout, // Puede ser útil para mostrar el rol actual en la UI
    setLayout 
  }
}