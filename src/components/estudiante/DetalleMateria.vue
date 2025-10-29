<template>
  <div class="card">
    <div class="flex justify-between items-start mb-4">
      <h3 class="text-lg font-semibold text-stone-800">
        Detalle de Materia
      </h3>
      <button 
        @click="$emit('cerrar')"
        class="text-stone-500 hover:text-stone-700"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
        </svg>
      </button>
    </div>

    <div v-if="materia" class="space-y-4">
      <div>
        <h4 class="text-xl font-medium text-stone-900">{{ materia.nombre }}</h4>
        <p class="text-stone-600">{{ materia.codigo }}</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h5 class="font-medium text-stone-700">Nombre corto</h5>
          <p class="text-stone-600">{{ materia.nombre_c }}</p>
        </div>
        
        <div>
          <h5 class="font-medium text-stone-700">Período de cursada</h5>
          <p class="text-stone-600">{{ materia.cursada }}</p>
        </div>
      </div>

      <div v-if="tieneCorrelativas">
        <h5 class="font-medium text-stone-700 mb-2">Correlativas</h5>
        <div class="bg-stone-50 p-4 rounded-lg space-y-3">
          <div v-if="materia.correlativas.cursar">
            <h6 class="font-medium text-stone-700 mb-1">Para cursar</h6>
            <div class="ml-2">
              <CorrelativasList 
                :items="procesarCorrelativasParaVista(materia.correlativas.cursar)" 
              />
            </div>
          </div>
          
          <div v-if="materia.correlativas.aprobar">
            <h6 class="font-medium text-stone-700 mb-1">Para aprobar</h6>
            <div class="ml-2">
              <CorrelativasList 
                :items="procesarCorrelativasParaVista(materia.correlativas.aprobar)" 
              />
            </div>
          </div>
        </div>
      </div>

      <div v-if="materia.equivale_a">
        <h5 class="font-medium text-stone-700">Equivalencia</h5>
        <p class="text-stone-600">
          Esta materia es equivalente a: {{ materia.equivale_a }}
        </p>
      </div>
    </div>

    <div v-else class="text-center py-8 text-stone-500">
      <p>Seleccione una materia para ver sus detalles</p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import CorrelativasList from './CorrelativasList.vue'

const props = defineProps({
  materia: {
    type: Object,
    default: null
  },
  plan: {
    type: Object,
    default: null
  }
})

defineEmits(['cerrar'])

// Computed para verificar si hay correlativas
const tieneCorrelativas = computed(() => {
  return props.materia && 
         props.materia.correlativas && 
         (props.materia.correlativas.cursar || props.materia.correlativas.aprobar)
})

const procesarCorrelativasParaVista = (correlativa) => {
  if (!props.plan || !correlativa) return []

  const materias = props.plan.materias

  const procesarCondicion = (cond) => {
    // Caso base: es un string con código de materia
    if (typeof cond === 'string') {
      const materia = materias[cond]
      if (materia) {
        // Mostrar código - nombre_c si existe, sino nombre
        const nombreMostrado = materia.nombre_c ? `${materia.nombre_c}` : materia.nombre;
        return [{
          tipo: 'materia',
          codigo: cond,
          nombre: `${cond} - ${nombreMostrado}`,
          nombre_c: nombreMostrado
        }]
      } else {
        return [{
          tipo: 'materia',
          codigo: cond,
          nombre: `Materia ${cond}`,
          nombre_c: cond
        }]
      }
    } 
    // Caso: objeto con condiciones
    else if (cond && typeof cond === 'object') {
      // Caso AND
      if (cond.and) {
        const items = []
        cond.and.forEach(item => {
          items.push(...procesarCondicion(item))
        })
        return [{
          tipo: 'grupo',
          operador: 'Y',
          texto: 'Todas las siguientes materias:',
          items: items
        }]
      } 
      // Caso OR
      else if (cond.or) {
        const items = []
        cond.or.forEach(item => {
          items.push(...procesarCondicion(item))
        })
        return [{
          tipo: 'grupo',
          operador: 'O',
          texto: 'Cualquiera de las siguientes materias:',
          items: items
        }]
      } 
      // Caso año completo
      else if (cond.anio_completo) {
        return [{
          tipo: 'anio_completo',
          texto: `Todas las materias del año ${cond.anio_completo}`
        }]
      }
    }
    
    return []
  }

  return procesarCondicion(correlativa)
}
</script>

<style scoped>
.card {
  @apply bg-white rounded-lg shadow p-6;
}
</style>