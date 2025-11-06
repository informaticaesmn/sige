<template>
  <div class="card">
    <h3 class="text-lg font-semibold text-stone-800 mb-4">Planes de Estudio</h3>
    
    <div class="space-y-3">
      <div 
        v-for="plan in planesArray" 
        :key="plan.codigo"
        class="border border-stone-200 rounded-lg p-4 hover:bg-stone-50 transition-colors flex justify-between items-center"
      >
        <div>
          <p class="font-sm text-stone-600">{{ plan.nombre }}</p>
        </div>
        <router-link 
          :to="{ name: 'PlanesEstudio', query: { plan: plan.codigo } }"
          class="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          <button class="btn btn-primary flex items-center">
            Ver
            <PlayIcon class="h-4 w-4 ml-1" />
          </button>
        </router-link>
      </div>
    </div>
    
    <div v-if="planesArray.length === 0" class="text-stone-500 text-sm">
      No hay planes de estudio asignados
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { PlayIcon } from '@heroicons/vue/24/outline'

const props = defineProps({
  planes: {
    type: [Array, Object, String],
    default: null
  }
})

// Convertir planes a array si es un objeto
const planesArray = computed(() => {
  // Si no hay planes, devolver array vacío
  if (!props.planes) {
    return []
  }
  
  // Si es un string, verificar si es un nombre de plan completo o un código
  if (typeof props.planes === 'string') {
    // Verificar si parece un nombre de plan completo (contiene espacio y letras/números)
    if (props.planes.includes(' ')) {
      // Es un nombre completo, extraer el código
      const codigo = props.planes.split(' ')[0]
      return [{
        codigo: codigo,
        nombre: props.planes
      }]
    } else {
      // Es solo un código
      return [{
        codigo: props.planes,
        nombre: `Plan ${props.planes}`
      }]
    }
  }
  
  // Si es un array
  if (Array.isArray(props.planes)) {
    return props.planes.map(plan => {
      if (typeof plan === 'string') {
        // Verificar si es un nombre completo o solo código
        if (plan.includes(' ')) {
          // Es un nombre completo
          const codigo = plan.split(' ')[0]
          return {
            codigo: codigo,
            nombre: plan
          }
        } else {
          // Es solo un código
          return {
            codigo: plan,
            nombre: `Plan ${plan}`
          }
        }
      }
      // Si ya es un objeto con las propiedades correctas
      if (plan.codigo) {
        return plan
      }
      // Si es un objeto pero sin código, intentar extraer información
      return {
        codigo: Object.keys(plan)[0] || '',
        nombre: Object.values(plan)[0] || 'Plan desconocido'
      }
    })
  }
  
  // Si es un objeto simple
  if (props.planes && typeof props.planes === 'object') {
    // Verificar si ya tiene la estructura esperada
    if (props.planes.codigo) {
      return [props.planes]
    }
    
    // Si es un objeto con múltiples planes
    return Object.entries(props.planes).map(([codigo, plan]) => {
      if (typeof plan === 'string') {
        return {
          codigo,
          nombre: plan
        }
      } else if (typeof plan === 'object' && plan.nombre) {
        return {
          codigo,
          nombre: plan.nombre
        }
      } else {
        return {
          codigo,
          nombre: `Plan ${codigo}`
        }
      }
    })
  }
  
  return []
})
</script>

<style scoped>
.card {
  @apply bg-white rounded-lg shadow p-6;
}
</style>