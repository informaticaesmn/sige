// src/composables/inscripciones/useInscripciones.js
import { ref } from 'vue'
import { doc, setDoc, serverTimestamp, collection, getDocs } from 'firebase/firestore'
import { useAuth } from '@/composables/auth/useAuth.js'
import { db } from '@/config/firebase.js'

export function useInscripciones(ciclo = '2026-1') {
  const { user } = useAuth()
  const error = ref(null)
  const loading = ref(false)

  const inscribirAMateria = async (materiaId, comisionId) => {
    if (!user.value?.uid) throw new Error('Usuario no autenticado')
    
    loading.value = true
    error.value = null

    try {
      const inscripcionRef = doc(
        db,
        'usuarios',
        user.value.uid,
        `inscripciones${ciclo.replace('-', '')}`, // ej: inscripciones20261
        materiaId
      )

      await setDoc(inscripcionRef, {
        materiaId,
        comisionId,
        estado: 'pendiente',
        fechaInscripcion: serverTimestamp(),
        ciclo
      })
    } catch (e) {
      error.value = e.message
      console.error('Error al inscribir:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  // Opcional: cargar inscripciones actuales del estudiante
  const cargarInscripciones = async () => {
    const inscripcionesRef = collection(
      db,
      'usuarios',
      user.value.uid,
      `inscripciones${ciclo.replace('-', '')}`
    )
    const snapshot = await getDocs(inscripcionesRef)
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  }

  return {
    inscribirAMateria,
    cargarInscripciones,
    loading,
    error
  }
}