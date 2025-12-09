<template>
  <div class="card" ref="modalContainer" tabindex="-1">
    <div class="flex justify-between items-start mb-4">
      <h3 id="detalle-materia-title" class="text-lg font-semibold text-stone-800">
        Detalle de Materia
      </h3>
      <div class="flex space-x-2">
        <button 
          v-if="materia"
          @click="copiarAlPortapapeles"
          class="text-stone-500 hover:text-stone-700 focus:outline-none focus:ring-2 focus:ring-primary rounded-full p-1"
          :aria-label="copiado ? 'Copiado al portapapeles' : 'Copiar detalles al portapapeles'"
          title="Copiar detalles al portapapeles"
        >
          <ClipboardIcon v-if="!copiado" class="h-5 w-5" aria-hidden="true" />
          <CheckCircleIcon v-else class="h-5 w-5 text-green-500" aria-hidden="true" />
        </button>
        <button
          v-if="materia"
          @click="imprimirDetalle"
          class="text-stone-500 hover:text-stone-700 focus:outline-none focus:ring-2 focus:ring-primary rounded-full p-1"
          aria-label="Imprimir detalles de materia"
          title="Imprimir detalles de materia"
        >
          <PrinterIcon class="h-5 w-5" aria-hidden="true" />
        </button>
        <button 
          ref="closeButton"
          @click="$emit('cerrar')"
          class="text-stone-500 hover:text-stone-700 focus:outline-none focus:ring-2 focus:ring-primary rounded-full p-1"
          aria-label="Cerrar detalles de materia"
        >
          <XMarkIcon class="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </div>

    <div v-if="materia" id="detalle-materia-content" class="space-y-4">
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
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import CorrelativasList from './CorrelativasList.vue'
import { XMarkIcon, ClipboardIcon, CheckCircleIcon, PrinterIcon } from '@heroicons/vue/24/outline'

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

const emit = defineEmits(['cerrar'])
const modalContainer = ref(null)
const closeButton = ref(null)
const copiado = ref(false)
let timeoutId = null

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

const copiarAlPortapapeles = async () => {
  if (!props.materia) return
  
  try {
    let contenido = ''
    contenido += `DETALLE DE MATERIA\n`
    contenido += `==================\n\n`
    contenido += `Nombre: ${props.materia.nombre}\n`
    contenido += `Código: ${props.materia.codigo}\n`
    contenido += `Nombre corto: ${props.materia.nombre_c}\n`
    contenido += `Período de cursada: ${props.materia.cursada}\n`
    
    if (props.materia.equivale_a) {
      contenido += `Equivalencia: ${props.materia.equivale_a}\n`
    }
    
    if (tieneCorrelativas.value) {
      contenido += `\nCORRELATIVAS\n`
      contenido += `============\n`
      
      if (props.materia.correlativas.cursar) {
        contenido += `\nPara cursar:\n`
        contenido += formatearCorrelativas(props.materia.correlativas.cursar)
      }
      
      if (props.materia.correlativas.aprobar) {
        contenido += `\nPara aprobar:\n`
        contenido += formatearCorrelativas(props.materia.correlativas.aprobar)
      }
    }
    
    await navigator.clipboard.writeText(contenido)
    copiado.value = true
    
    // Restablecer el ícono después de 2 segundos
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = setTimeout(() => {
      copiado.value = false
    }, 2000)
  } catch (err) {
    console.error('Error al copiar al portapapeles:', err)
  }
}

const formatearCorrelativas = (correlativa, nivel = 0) => {
  const prefijo = '  '.repeat(nivel)
  let resultado = ''
  
  if (typeof correlativa === 'string') {
    const materia = props.plan?.materias[correlativa]
    const nombre = materia ? `${materia.nombre_c || materia.nombre}` : `Materia ${correlativa}`
    resultado += `${prefijo}• ${correlativa} - ${nombre}\n`
  } else if (correlativa && typeof correlativa === 'object') {
    if (correlativa.and) {
      resultado += `${prefijo}Todas las siguientes materias:\n`
      correlativa.and.forEach(item => {
        resultado += formatearCorrelativas(item, nivel + 1)
      })
    } else if (correlativa.or) {
      resultado += `${prefijo}Cualquiera de las siguientes materias:\n`
      correlativa.or.forEach(item => {
        resultado += formatearCorrelativas(item, nivel + 1)
      })
    } else if (correlativa.anio_completo) {
      resultado += `${prefijo}• Todas las materias del año ${correlativa.anio_completo}\n`
    }
  }
  
  return resultado
}

const imprimirDetalle = () => {
  window.print()
}

const handleKeyDown = (event) => {
  if (event.key === 'Escape') {
    emit('cerrar')
  }
}

const trapFocus = (event) => {
  if (event.key === 'Tab' && modalContainer.value) {
    const focusableElements = modalContainer.value.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    
    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]
    
    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault()
      lastElement.focus()
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault()
      firstElement.focus()
    }
  }
}

onMounted(() => {
  // Enfocar el contenedor del modal cuando se monta
  if (modalContainer.value) {
    modalContainer.value.focus()
  }
  
  // Agregar listeners para manejar el enfoque dentro del modal
  document.addEventListener('keydown', handleKeyDown)
  document.addEventListener('keydown', trapFocus)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown)
  document.removeEventListener('keydown', trapFocus)
  
  if (timeoutId) {
    clearTimeout(timeoutId)
  }
})
</script>

<style scoped>
.card {
  @apply bg-white rounded-lg shadow p-6 focus:outline-none;
}
</style>