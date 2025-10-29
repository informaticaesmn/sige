import { ref, computed } from 'vue'

export function usePlanesEstudio() {
  const planes = ref([])
  const planSeleccionado = ref(null)
  const materiaSeleccionada = ref(null)
  const loading = ref(false)
  const error = ref(null)

  // Cargar plan desde archivo JSON
  const cargarPlan = async (planId) => {
    loading.value = true
    error.value = null
    
    try {
      const response = await fetch(`/planes/${planId}.json`)
      
      // Verificar si la respuesta es exitosa
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Plan ${planId} aún en proceso de carga`)
        }
        throw new Error(`No se pudo cargar el plan ${planId}`)
      }
      
      // Verificar si el contenido es JSON
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`Plan ${planId} aún en proceso de carga`)
      }
      
      const data = await response.json()
      const planIndex = planes.value.findIndex(p => p.plan === planId)
      
      if (planIndex >= 0) {
        planes.value[planIndex] = data
      } else {
        planes.value.push(data)
      }
      
      return data
    } catch (err) {
      // Manejar errores de red y parseo de JSON
      if (err instanceof SyntaxError) {
        error.value = `Plan ${planId} aún en proceso de carga`
      } else {
        error.value = err.message
      }
      console.error('Error cargando plan:', err)
      throw new Error(error.value)
    } finally {
      loading.value = false
    }
  }

  // Cargar múltiples planes
  const cargarPlanes = async (planIds) => {
    if (!Array.isArray(planIds)) {
      planIds = [planIds]
    }
    
    const promesas = planIds.map(id => cargarPlan(id))
    try {
      await Promise.all(promesas)
    } catch (err) {
      console.error('Error cargando planes:', err)
      throw err
    }
  }

  // Procesar correlativas para mostrar en tabla
  const procesarCorrelativas = (correlativas, materias) => {
    if (!correlativas) return ''
    
    const procesarCondicion = (cond) => {
      if (typeof cond === 'string') {
        // Es un código de materia
        const materia = materias[cond]
        if (materia) {
          // Mostrar código - nombre_c si existe, sino nombre
          return `${cond} - ${materia.nombre_c || materia.nombre}`
        }
        return cond
      } else if (cond.and) {
        // Es una condición AND
        return `(${cond.and.map(procesarCondicion).join(' Y ')})`
      } else if (cond.or) {
        // Es una condición OR
        return `(${cond.or.map(procesarCondicion).join(' O ')})`
      } else if (cond.anio_completo) {
        // Es una condición de año completo
        return `Año ${cond.anio_completo} completo`
      }
      return ''
    }

    let resultado = []
    if (correlativas.cursar) {
      resultado.push(`Cursar: ${procesarCondicion(correlativas.cursar)}`)
    }
    if (correlativas.aprobar) {
      resultado.push(`Aprobar: ${procesarCondicion(correlativas.aprobar)}`)
    }
    
    return resultado.join('; ')
  }

  // Obtener una materia por su código
  const obtenerMateria = (codigoPlan, codigoMateria) => {
    const plan = planes.value.find(p => p.plan === codigoPlan)
    if (!plan) return null
    
    // Devolver la materia con su código incluido
    const materia = plan.materias[codigoMateria] || null
    if (materia) {
      return {
        codigo: codigoMateria,
        ...materia
      }
    }
    return null
  }

  // Buscar materias por nombre
  const buscarMaterias = (busqueda) => {
    if (!planSeleccionado.value || !busqueda) return []
    
    const termino = busqueda.toLowerCase()
    return Object.entries(planSeleccionado.value.materias)
      .filter(([codigo, materia]) => 
        materia.nombre.toLowerCase().includes(termino) ||
        materia.nombre_c.toLowerCase().includes(termino) ||
        codigo.includes(termino)
      )
      .map(([codigo, materia]) => ({
        codigo,
        ...materia,
        // Añadir las correlativas completas para que estén disponibles en el detalle
        correlativas: materia.correlativas
      }))
  }

  // Procesar todas las materias para mostrar en tabla
  const materiasParaTabla = computed(() => {
    if (!planSeleccionado.value) return []
    
    return Object.entries(planSeleccionado.value.materias).map(([codigo, materia]) => ({
      codigo,
      nombre: materia.nombre,
      nombre_c: materia.nombre_c,
      cursada: materia.cursada,
      correlativas: procesarCorrelativas(materia.correlativas, planSeleccionado.value.materias),
      // Añadir las correlativas completas para que estén disponibles en el detalle
      correlativas_completas: materia.correlativas
    }))
  })

  return {
    planes,
    planSeleccionado,
    materiaSeleccionada,
    loading,
    error,
    cargarPlan,
    cargarPlanes,
    obtenerMateria,
    buscarMaterias,
    materiasParaTabla,
    procesarCorrelativas
  }
}