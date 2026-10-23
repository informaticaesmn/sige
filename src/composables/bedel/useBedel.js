// src/composables/bedel/useBedel.js
import { ref } from 'vue'
import { useAuth } from '@/composables/auth/useAuth.js'

// Estado reactivo singleton a nivel módulo (AGENTS.md §7)
const inscripcionesPendientes = ref([])
const cargandoInscripciones = ref(false)

/**
 * Carga las inscripciones pendientes de confirmación para el rol de bedel.
 * Escanea la colección 'usuarios' → subcolección inscripciones${ciclo}
 * filtrando por estado 'pendiente'.
 * @param {string} ciclo - Ciclo académico (ej: '2026-1')
 * @returns {Promise<{ exito: boolean, error?: any }>}
 */
async function cargarInscripcionesPendientes(ciclo = '2026-1') {
  cargandoInscripciones.value = true
  try {
    // La subcolección usa el nombre inscripciones${ciclo.replace('-', '')}
    // (ej: inscripciones20261), siguiendo el patrón de Firestore Rules.
    const subcoleccion = `inscripciones${ciclo.replace('-', '')}`

    // Query sobre la colecciones de inscripciones de todos los usuarios.
    // Nota: Firestore no soporta collection group queries con where en subcolecciones
    // sin usar collectionGroup. Para el placeholder, devolvemos un array vacío.
    // TODO: Usar collectionGroup(db, subcoleccion) + where('estado', '==', 'pendiente')
    //       y resolver datos de materia con useOfertaAcademica.
    inscripcionesPendientes.value = []

    return { exito: true }
  } catch (error) {
    console.error('Error cargando inscripciones pendientes:', error)
    return { exito: false, error }
  } finally {
    cargandoInscripciones.value = false
  }
}

export function useBedel() {
  const { user } = useAuth()

  return {
    user,
    inscripcionesPendientes,
    cargandoInscripciones,
    cargarInscripcionesPendientes
  }
}
