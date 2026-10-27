// src/composables/inscripciones/useInscripciones.js
import { ref } from 'vue'
import { doc, setDoc, serverTimestamp, collection, getDocs } from 'firebase/firestore/lite'
import { useAuth } from '@/composables/auth/useAuth.js'
import { db } from '@/config/firebase.js'

export function useInscripciones(ciclo = '2026-1') {
  const { user } = useAuth()
  const error = ref(null)
  const loading = ref(false)

  const inscribirAMateria = async (materiaId, comisionId) => {
    if (!user.value?.uid) return { exito: false, error: new Error('Usuario no autenticado') }
    
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

      return { exito: true }
    } catch (e) {
      error.value = e.message
      console.error('Error al inscribir:', e)
      return { exito: false, error: e }
    } finally {
      loading.value = false
    }
  }

  // Cargar inscripciones actuales del estudiante (subcolección dinámica)
  const cargarInscripciones = async () => {
    if (!user.value?.uid) return { exito: false, error: new Error('Usuario no autenticado') }

    error.value = null
    try {
      const inscripcionesRef = collection(
        db,
        'usuarios',
        user.value.uid,
        `inscripciones${ciclo.replace('-', '')}`
      )
      const snapshot = await getDocs(inscripcionesRef)
      const datos = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
      return { exito: true, datos, error: null }
    } catch (e) {
      error.value = e.message
      console.error('Error al cargar inscripciones:', e)
      return { exito: false, error: e }
    }
  }

  return {
    inscribirAMateria,
    cargarInscripciones,
    loading,
    error
  }
}