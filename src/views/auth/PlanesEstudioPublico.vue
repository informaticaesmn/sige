<template>
  <div class="min-h-screen bg-stone-50 py-6">
    <div class="container mx-auto px-4">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-medium text-stone-800">Planes de Estudio Públicos</h1>
        <router-link 
          to="/" 
          class="px-4 py-2 bg-stone-800 text-white rounded-lg hover:bg-stone-700 transition-colors"
        >
          Volver al inicio
        </router-link>
      </div>
      
      <div v-if="loading" class="flex justify-center items-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-stone-700"></div>
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
          <div v-if="materiaSeleccionada" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
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

            <!-- Columna derecha: detalle de materia -->
            <div class="lg:col-span-1">
              <DetalleMateria 
                :materia="materiaSeleccionada" 
                :plan="planSeleccionado"
                @cerrar="materiaSeleccionada = null"
              />
            </div>
          </div>
        </div>
        
        <div v-else-if="error" class="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
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

// Planes disponibles públicamente
const planesDisponibles = computed(() => {
  // Lista de planes disponibles públicamente
  return [
    { codigo: '662', nombre: ' 662 Profesorado de Música' },
    { codigo: '662Letra', nombre: '662L Profesorado de Música con orientacion en Instrumento (letra)' },
    { codigo: '663', nombre: '663 Profesorado de Música con orientación en Direccion Coral' },
    { codigo: '664', nombre: '664 Profesorado de Música con orientación en Canto Lirico' },
    { codigo: '665', nombre: '665 Profesorado de Música con orientación en Direccion Orquestal' },
    { codigo: '666', nombre: '666 Profesorado de Música con orientación en Composición' },
    { codigo: '389', nombre: '389 Cantante' },
    { codigo: '390', nombre: '390 Compositor' },
    { codigo: '391', nombre: '391 Director Coral' },
    { codigo: '392', nombre: '392 Director Orquestal' },
    { codigo: '393', nombre: '393 Instrumentista' },
    { codigo: '708', nombre: '708 Tecnico Superior en Sonido' }
    // Se pueden añadir más planes aquí cuando estén disponibles
  ]
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

onMounted(async () => {
  try {
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