<template>
  <div class="min-h-screen bg-stone-50 py-6">
    <div class="container mx-auto px-4">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-medium text-stone-800">Planes de Estudio Públicos</h1>
        <button 
          @click="volverAlInicio"
          class="btn btn-primary mx-4 px-4"
          type="button"
          aria-label="Volver al inicio"
        >
          Volver al inicio
        </button>
      </div>
      
      <div v-if="loading" class="flex justify-center items-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-stone-700" role="status" aria-label="Cargando"></div>
      </div>
      
      <div v-else>
        <!-- Selector de plan -->
        <div class="mb-6">
          <label for="plan-select" class="block text-sm font-medium text-stone-700 mb-2">
            Seleccionar Plan de Estudio
          </label>
          <select
            id="plan-select"
            v-model="planId"
            @change="cambiarPlan"
            class="block w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            aria-label="Seleccionar plan de estudio"
          >
            <option 
              v-for="plan in planesDisponibles" 
              :key="plan.codigo" 
              :value="plan.codigo"
            >
              {{ plan.nombre }}
            </option>
          </select>
        </div>

        <div v-if="planSeleccionado">
          <!-- Vista de detalle de materia (modal) -->
          <div v-if="materiaSeleccionada" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="detalle-materia-title" aria-describedby="detalle-materia-content">
            <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" role="document">
              <DetalleMateria 
                :materia="materiaSeleccionada" 
                :plan="planSeleccionado"
                @cerrar="materiaSeleccionada = null"
              />
            </div>
          </div>

          <!-- Layout de dos columnas para tablet y desktop -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Columna izquierda: buscador y tabla -->
            <div class="lg:col-span-2 space-y-6">
              <BuscadorMaterias 
                :plan="planSeleccionado"
                @seleccionar="seleccionarMateria"
              />
              
              <TablaPlanEstudio 
                :plan="planSeleccionado"
                :materias="materiasParaTabla"
                @seleccionar-materia="seleccionarMateria"
              />
            </div>

            <!-- Columna derecha: detalle de materia (ELIMINADA) -->
            <div class="lg:col-span-1">
              <!-- Esta columna se elimina porque duplica la funcionalidad del modal -->
            </div>
          </div>
        </div>
        
        <div v-else-if="error" class="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center" role="alert">
          <h3 class="text-lg font-medium text-yellow-800 mb-2">Plan aún en proceso de carga</h3>
          <p class="text-yellow-700">
            El plan de estudios seleccionado aún no está disponible. Por favor, inténtelo más tarde.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePlanesEstudio } from '@/composables/academico/usePlanesEstudio'
import TablaPlanEstudio from '@/components/estudiante/TablaPlanEstudio.vue'
import DetalleMateria from '@/components/estudiante/DetalleMateria.vue'
import BuscadorMaterias from '@/components/estudiante/BuscadorMaterias.vue'

const route = useRoute()
const router = useRouter()

const {
  planes,
  planSeleccionado,
  materiaSeleccionada,
  loading,
  error,
  cargarPlanes,
  materiasParaTabla
} = usePlanesEstudio()

const planId = ref('662')
const planesData = ref([])

// Planes disponibles públicamente
const planesDisponibles = computed(() => {
  // Convertir el objeto de planes en un array de {codigo, nombre}
  return Object.entries(planesData.value).map(([codigo, nombre]) => ({
    codigo,
    nombre
  }))
})

const cambiarPlan = async () => {
  try {
    await cargarPlanes(planId.value)
    // Actualizar plan seleccionado
    planSeleccionado.value = planes.value.find(p => p.plan === planId.value) || null
    
    // Actualizar la URL con el plan seleccionado
    router.push({ name: 'PlanesEstudioPublico', query: { plan: planId.value } })
  } catch (err) {
    // Limpiar el plan seleccionado cuando hay un error
    planSeleccionado.value = null
    console.error('Error al cambiar de plan:', err)
  }
}

const seleccionarMateria = (materia) => {
  // Si la materia viene de la tabla, puede no tener las correlativas completas
  // En ese caso, obtenemos la materia completa del plan
  if (materia && planSeleccionado.value) {
    const materiaCompleta = planSeleccionado.value.materias[materia.codigo]
    if (materiaCompleta) {
      materiaSeleccionada.value = {
        codigo: materia.codigo,
        ...materiaCompleta
      }
      return
    }
  }
  
  materiaSeleccionada.value = materia
}

const volverAlInicio = () => {
  router.push('/')
}

// Cargar la lista de planes disponibles
const cargarPlanesDisponibles = async () => {
  try {
    const response = await fetch('/planes/planes.json')
    const data = await response.json()
    planesData.value = data.planes || {}
    
    // Establecer el primer plan como predeterminado si no hay uno en la URL
    if (!route.query.plan && planesData.value) {
      const primerPlan = Object.keys(planesData.value)[0]
      if (primerPlan) {
        planId.value = primerPlan
      }
    }
  } catch (err) {
    console.error('Error al cargar la lista de planes:', err)
    // Fallback a la lista hardcodeada en caso de error
    planesData.value = {
      '662': '662 Profesorado de Música',
      '662G': '662G Profesorado de Música con orientación en Guitarra',
      '663': '663 Profesorado de Música con orientación en Dirección Coral',
      '664': '664 Profesorado de Música con orientación en Canto Lírico',
      '665': '665 Profesorado de Música con orientación en Dirección Orquestal',
      '666': '666 Profesorado de Música con orientación en Composición',
      '389': '389 Cantante',
      '390': '390 Compositor',
      '391': '391 Director Coral',
      '392': '392 Director Orquestal',
      '393': '393 Instrumentista',
      '708': '708 Técnico Superior en Sonido'
    }
  }
}

onMounted(async () => {
  try {
    // Cargar la lista de planes disponibles
    await cargarPlanesDisponibles()
    
    // Verificar si hay un plan especificado en la URL
    const planFromQuery = route.query.plan
    
    if (planFromQuery) {
      planId.value = planFromQuery
    }
    
    await cargarPlanes(planId.value)
    planSeleccionado.value = planes.value.find(p => p.plan === planId.value) || null
  } catch (err) {
    // Limpiar el plan seleccionado cuando hay un error
    planSeleccionado.value = null
    console.error('Error al cargar el plan inicial:', err)
  }
})
</script>

<style scoped>
/* Estilos específicos si es necesario */
</style>