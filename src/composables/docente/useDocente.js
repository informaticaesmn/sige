// src/composables/docente/useDocente.js
import { ref } from 'vue'
import { useAuth } from '@/composables/auth/useAuth.js'

// Estado reactivo singleton a nivel módulo (AGENTS.md §7)
const materiasAsignadas = ref([])
const cargandoMaterias = ref(false)

/**
 * Carga las materias asignadas al docente autenticado.
 * TODO: Implementar la query real de Firestore filtrando por el docente.
 * @param {string} docenteUid - UID del docente
 * @returns {Promise<{ exito: boolean, error?: any }>}
 */
async function cargarMateriasAsignadas(docenteUid) {
  if (!docenteUid) return { exito: false, error: new Error('UID de docente no disponible') }

  cargandoMaterias.value = true
  try {
    // Placeholder: en la versión completa se consultará la colección de
    // materias donde el docente esté asignado y se enriquecerá con
    // datos de la oferta académica.
    materiasAsignadas.value = []
    return { exito: true }
  } catch (error) {
    console.error('Error cargando materias asignadas:', error)
    return { exito: false, error }
  } finally {
    cargandoMaterias.value = false
  }
}

export function useDocente() {
  const { user } = useAuth()

  return {
    user,
    materiasAsignadas,
    cargandoMaterias,
    cargarMateriasAsignadas
  }
}
