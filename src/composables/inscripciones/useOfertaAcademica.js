u// src/composables/inscripciones/useOfertaAcademica.js
import { ref, computed, onMounted } from 'vue'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/config/firebase.js'

export function useOfertaAcademica(ciclo) {
  const oferta = ref(null)
  const loading = ref(true)
  const error = ref(null)

  const etapaVigente = computed(() => {
    if (!oferta.value?.etapas) return null

    const ahora = new Date()
    return oferta.value.etapas.find(etapa => {
      const desde = etapa.desde.toDate()
      const hasta = etapa.hasta.toDate()
      return ahora >= desde && ahora <= hasta
    }) || null
  })

  const cargarOferta = async () => {
    try {
      const docRef = doc(db, 'ofertaAcademica', ciclo)
      const docSnap = await getDoc(docRef)

      if (docSnap.exists()) {
        oferta.value = { id: docSnap.id, ...docSnap.data() }
      } else {
        error.value = 'No se encontró la oferta académica para este ciclo.'
      }
    } catch (e) {
      console.error('Error al cargar oferta académica:', e)
      error.value = 'Error al cargar la oferta académica.'
    } finally {
      loading.value = false
    }
  }

  onMounted(() => {
    cargarOferta()
  })

  return {
    oferta,
    etapaVigente, // 👈 clave: expone la etapa actual
    loading,
    error,
    reload: cargarOferta
  }
}