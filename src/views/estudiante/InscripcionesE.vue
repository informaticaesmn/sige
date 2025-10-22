<template>
  <div class="p-4 max-w-6xl mx-auto">
    <!-- Título dinámico -->
    <h1 v-if="oferta?.nombreCilco" class="text-2xl font-bold mb-6">
      {{ oferta.nombreCiclo }}
    </h1>
    <h1 v-else class="text-2xl font-bold mb-6">Inscripciones – {{ ciclo }}</h1>

    <!-- Mensajes de estado -->
    <div v-if="loadingOferta" class="text-center py-8">
      <p>Cargando oferta académica...</p>
    </div>

    <div v-else-if="!etapaVigente" class="alert alert-info mb-6">
      <p v-if="oferta?.etapas?.length">
        Las inscripciones aún no han comenzado o ya finalizaron.
        Por favor, revisá las fechas publicadas por Bedelía.
      </p>
      <p v-else>
        No hay etapas de inscripción configuradas en este momento.
      </p>
    </div>

    <div v-else class="mb-6">
      <div class="bg-primary/10 border-l-4 border-primary p-4 rounded">
        <h2 class="text-lg font-bold text-primary">{{ etapaVigente.nombre }}</h2>
        <p class="text-muted">{{ etapaVigente.descripcion }}</p>
        <p class="text-sm mt-1">
          Vigente desde {{ formatDate(etapaVigente.desde) }} hasta {{ formatDate(etapaVigente.hasta) }}
        </p>
      </div>
    </div>

    <!-- Listado de materias (solo de la etapa vigente) -->
    <div v-if="etapaVigente" class="space-y-6">
      <div
        v-for="materia in etapaVigente.materias"
        :key="materia.id"
        class="card card-interactive"
      >
        <!-- ... mismo contenido que antes ... -->
      </div>
    </div>
  </div>
/** punto de quiebre */
  <div class="p-4 max-w-6xl mx-auto">
    <h1 class="text-2xl font-bold mb-6">Inscripción a Espacios Curriculares – Ciclo 2026-1</h1>
    
    <!-- Mensajes globales -->
    <div v-if="error" class="alert alert-danger mb-6">
      {{ error }}
    </div>
    
    <div v-if="mensajeExito" class="alert alert-info mb-6">
      ¡Inscripción registrada con éxito! Un bedel validará tu solicitud próximamente.
    </div>
    
    <!-- Carga inicial -->
    <div v-if="loadingOferta" class="text-center py-8">
      <p>Cargando oferta académica...</p>
    </div>
    
    <!-- Oferta académica -->
    <div v-else-if="oferta && oferta.materias">
      <div v-for="materia in oferta.materias" :key="materia.id" class="card card-interactive mb-6">
        <div class="card-header">
          <span>{{ materia.nombre }} <span class="text-sm font-normal text-stone-500">({{ materia.tipo || 'colectiva' }})</span></span>
        </div>
        
        <div class="space-y-3">
          <div
          v-for="comision in materia.comisiones"
          :key="comision.id"
          class="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-stone-50 rounded-lg"
          >
          <div class="flex-1">
            <p class="font-medium">Comisión {{ comision.id }}</p>
            <p class="text-muted text-sm">{{ comision.horario }}</p>
            <p class="text-muted text-sm">{{ comision.aula }} • {{ comision.docente }}</p>
          </div>

          <div class="mt-3 sm:mt-0">
              <!-- Botón: ya inscripto -->
              <button
              v-if="estaInscripto(materia.id)"
              disabled
              class="btn btn-secondary opacity-70 cursor-not-allowed"
              >
              Inscripto
            </button>
            
            <!-- Botón: inscribirse -->
            <button
            v-else
            @click="inscribir(materia.id, comision.id)"
                :disabled="loadingInscripcion"
                class="btn btn-primary"
              >
              {{ loadingInscripcion ? 'Inscribiendo...' : 'Inscribirme' }}
            </button>
          </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="alert alert-danger">
      No hay oferta académica disponible en este momento. Por favor, contacta a Bedelía.
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useOfertaAcademica } from '@/composables/inscripciones/useOfertaAcademica.js'
import { useInscripciones } from '@/composables/inscripciones/useInscripciones.js'

// Estados locales
const error = ref(null)
const mensajeExito = ref(null)
const loadingInscripcion = ref(false)
const formatDate = (timestamp) => {
  return timestamp.toDate().toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

// Composables
const ciclo = '2026-1'
const { oferta, loading: loadingOferta } = useOfertaAcademica(ciclo)
const { inscribirAMateria, cargarInscripciones } = useInscripciones(ciclo)

// Cargar inscripciones actuales del estudiante
const inscripcionesActuales = ref([])
onMounted(async () => {
  try {
    inscripcionesActuales.value = await cargarInscripciones()
  } catch (e) {
    console.error('Error al cargar inscripciones:', e)
    error.value = 'No se pudieron cargar tus inscripciones. Intenta recargar la página.'
  }
})

// Computed: mapa rápido de materias inscriptas
const materiasInscriptas = computed(() => {
  const map = new Set()
  inscripcionesActuales.value.forEach(insc => map.add(insc.materiaId))
  return map
})

const estaInscripto = (materiaId) => {
  return materiasInscriptas.value.has(materiaId)
}

// Función de inscripción con feedback
const inscribir = async (materiaId, comisionId) => {
  if (loadingInscripcion.value) return

  loadingInscripcion.value = true
  error.value = null
  mensajeExito.value = null

  try {
    await inscribirAMateria(materiaId, comisionId)
    // Actualizar lista local para reflejar inmediatamente
    inscripcionesActuales.value.push({ materiaId, comisionId })
    mensajeExito.value = 'Inscripción registrada con éxito.'
    setTimeout(() => mensajeExito.value = null, 5000)
  } catch (e) {
    error.value = 'No se pudo realizar la inscripción. Por favor, inténtalo nuevamente.'
    console.error('Error en inscripción:', e)
  } finally {
    loadingInscripcion.value = false
  }
}
</script>