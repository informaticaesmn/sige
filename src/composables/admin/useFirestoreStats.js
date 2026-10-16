// src/composables/admin/useFirestoreStats.js
/**
 * @file useFirestoreStats.js
 * @description Composable para consultar y monitorear el estado actual,
 * la estructura de colecciones y la cantidad de documentos en Firestore.
 * 
 * Sigue estrictamente las convenciones de AGENTS.md:
 * - Uso exclusivo de 'firebase/firestore/lite'.
 * - Respuestas normalizadas { exito: boolean, datos: any, error: any }.
 * - Funciones comentadas con JSDoc en español.
 * - Centralización de acceso a datos sin acoplar la vista a Firebase.
 */

import { ref, computed } from 'vue'
import { db } from '@/config/firebase.js'
import {
  collection,
  getDocs,
  limit,
  query
} from 'firebase/firestore/lite'

/**
 * Estado reactivo singleton a nivel de módulo
 * Permite conservar la última consulta en memoria si se navega entre rutas.
 */
const cargando = ref(false)
const error = ref(null)
const ultimaActualizacion = ref(null)
const latenciaMs = ref(null)
const estadoConexion = ref('desconocido') // 'desconocido' | 'conectado' | 'error'

// Almacén de datos analizados de la base de datos
const datosUsuarios = ref([])
const datosOferta = ref([])
const coleccionSeleccionada = ref('usuarios')

/**
 * Catálogo maestro de la estructura conocida de Firestore en SIGE.
 * Provee metadatos arquitectónicos sobre el propósito, jerarquía y estrategia de IDs.
 */
const catalogoEstructura = [
  {
    id: 'usuarios',
    nombre: 'usuarios',
    tipo: 'Colección Raíz',
    descripcion: 'Almacena los perfiles de todos los actores (estudiantes, docentes, bedeles, administradores) y cuentas pre-aprobadas.',
    estrategiaId: 'Híbrida: ID = email para pre-aprobados (sin UID); ID = uid definitivo una vez registrados.',
    reglasAcceso: 'Lectura propia o por Bedel/Admin; Escritura restringida según roles.',
    subcolecciones: ['inscripciones{ciclo}'],
    icono: 'UsersIcon'
  },
  {
    id: 'ofertaAcademica',
    nombre: 'ofertaAcademica',
    tipo: 'Colección Raíz',
    descripcion: 'Contiene la programación académica por ciclo lectivo, etapas de fechas de inscripción y comisiones.',
    estrategiaId: 'Identificador del ciclo académico (ej: "2026-1").',
    reglasAcceso: 'Lectura pública para usuarios autenticados; Escritura exclusiva para Administradores.',
    subcolecciones: [],
    icono: 'CalendarDaysIcon'
  },
  {
    id: 'inscripciones',
    nombre: 'usuarios/{uid}/inscripciones{ciclo}',
    tipo: 'Subcolección',
    descripcion: 'Inscripciones a materias realizadas por cada estudiante para un ciclo determinado (ej: inscripciones20261).',
    estrategiaId: 'ID = código o identificador de la materia (materiaId).',
    reglasAcceso: 'Creación por el propio estudiante; Confirmación de estado por Bedel o Admin.',
    subcolecciones: [],
    icono: 'DocumentTextIcon'
  }
]

/**
 * Función auxiliar para detectar el tipo de dato de un valor en formato amigable.
 * @param {any} valor - El valor del campo a evaluar.
 * @returns {string} Nombre legible del tipo de dato.
 */
function detectarTipoDato(valor) {
  if (valor === null || valor === undefined) return 'null'
  if (Array.isArray(valor)) return `Array (${valor.length})`
  if (typeof valor === 'object') {
    // Detectar Timestamps de Firestore Lite ({ seconds, nanoseconds })
    if ('seconds' in valor && 'nanoseconds' in valor) {
      return 'Timestamp'
    }
    if (valor instanceof Date) return 'Date'
    return 'Object'
  }
  return typeof valor
}

/**
 * Infiere el esquema de campos y tipos a partir de una lista de documentos reales.
 * @param {Array<Object>} docs - Lista de objetos de datos de documentos.
 * @returns {Array<{ campo: string, tipo: string, frecuencia: number, ejemplo: any }>}
 */
function inferirEsquema(docs) {
  if (!docs || docs.length === 0) return []

  const mapaCampos = new Map()
  const total = docs.length

  docs.forEach(doc => {
    Object.entries(doc).forEach(([clave, valor]) => {
      if (!mapaCampos.has(clave)) {
        mapaCampos.set(clave, {
          campo: clave,
          tipo: detectarTipoDato(valor),
          conteo: 1,
          ejemplo: valor
        })
      } else {
        const item = mapaCampos.get(clave)
        item.conteo++
        // Si el ejemplo actual era nulo o vacío y encontramos un valor con contenido, lo usamos
        if ((item.ejemplo === null || item.ejemplo === undefined) && valor !== null) {
          item.ejemplo = valor
          item.tipo = detectarTipoDato(valor)
        }
      }
    })
  })

  return Array.from(mapaCampos.values())
    .map(item => ({
      campo: item.campo,
      tipo: item.tipo,
      porcentajePresencia: Math.round((item.conteo / total) * 100),
      requerido: item.conteo === total,
      ejemplo: item.ejemplo
    }))
    .sort((a, b) => b.porcentajePresencia - a.porcentajePresencia)
}

/**
 * Composable principal para estadísticas del administrador sobre Firestore.
 * @returns {Object} Métodos y propiedades reactivas para el dashboard de administración.
 */
export function useFirestoreStats() {
  /**
   * Mide la latencia de Firestore ejecutando una consulta ultra liviana con limit(1).
   * @returns {Promise<{ exito: boolean, datos: { latenciaMs: number }, error: any }>}
   */
  async function verificarConexion() {
    const tInicio = performance.now()
    try {
      const q = query(collection(db, 'usuarios'), limit(1))
      await getDocs(q)
      const duracion = Math.round(performance.now() - tInicio)
      latenciaMs.value = duracion
      estadoConexion.value = 'conectado'
      return {
        exito: true,
        datos: { latenciaMs: duracion },
        error: null
      }
    } catch (err) {
      console.error('Error al verificar conexión con Firestore:', err)
      estadoConexion.value = 'error'
      latenciaMs.value = null
      return {
        exito: false,
        datos: null,
        error: err.message || 'No se pudo conectar con Firestore'
      }
    }
  }

  /**
   * Carga y procesa todos los documentos de las colecciones principales de SIGE.
   * Analiza totales, distribución por roles, cuentas pre-aprobadas y estructura.
   * @returns {Promise<{ exito: boolean, datos: any, error: any }>}
   */
  async function cargarEstadisticas() {
    cargando.value = true
    error.value = null

    const tInicio = performance.now()

    try {
      // 1. Obtener documentos de la colección 'usuarios'
      const usuariosSnap = await getDocs(collection(db, 'usuarios'))
      const docsUsuarios = usuariosSnap.docs.map(d => ({
        _id: d.id,
        ...d.data()
      }))
      datosUsuarios.value = docsUsuarios

      // 2. Obtener documentos de la colección 'ofertaAcademica'
      let docsOferta = []
      try {
        const ofertaSnap = await getDocs(collection(db, 'ofertaAcademica'))
        docsOferta = ofertaSnap.docs.map(d => ({
          _id: d.id,
          ...d.data()
        }))
      } catch (errOferta) {
        console.warn('Colección ofertaAcademica inaccesible o vacía:', errOferta)
      }
      datosOferta.value = docsOferta

      // Registrar métricas de conexión y tiempo de respuesta
      latenciaMs.value = Math.round(performance.now() - tInicio)
      estadoConexion.value = 'conectado'
      ultimaActualizacion.value = new Date()

      return {
        exito: true,
        datos: {
          totalUsuarios: docsUsuarios.length,
          totalOferta: docsOferta.length,
          timestamp: ultimaActualizacion.value
        },
        error: null
      }
    } catch (err) {
      console.error('Error al cargar estadísticas de Firestore:', err)
      error.value = err.message || 'Error al consultar la base de datos'
      estadoConexion.value = 'error'
      return {
        exito: false,
        datos: null,
        error: error.value
      }
    } finally {
      cargando.value = false
    }
  }

  // --- Propiedades computadas de métricas ---

  /**
   * Métricas detalladas sobre los usuarios del sistema.
   */
  const metricasUsuarios = computed(() => {
    const list = datosUsuarios.value
    let registrados = 0
    let preAprobados = 0
    const porRol = {
      admin: 0,
      bedel: 0,
      docente: 0,
      estudiante: 0,
      sinRol: 0
    }

    list.forEach(u => {
      // Si tiene campo UID y no coincide con el email o está presente
      if (u.uid) {
        registrados++
      } else {
        preAprobados++
      }

      // Distribución por roles (un usuario puede tener más de un rol)
      const roles = Array.isArray(u.roles) ? u.roles.map(r => String(r).toLowerCase()) : []
      if (roles.length === 0) {
        porRol.sinRol++
      } else {
        if (roles.includes('admin')) porRol.admin++
        if (roles.includes('bedel')) porRol.bedel++
        if (roles.includes('docente')) porRol.docente++
        if (roles.includes('estudiante')) porRol.estudiante++
      }
    })

    return {
      total: list.length,
      registrados,
      preAprobados,
      porRol
    }
  })

  /**
   * Métricas sobre la oferta académica.
   */
  const metricasOferta = computed(() => {
    const list = datosOferta.value
    const ahora = new Date()
    let etapasActivas = 0

    list.forEach(item => {
      if (Array.isArray(item.etapas)) {
        const tieneActiva = item.etapas.some(e => {
          if (!e.desde || !e.hasta) return false
          const d = e.desde.toDate ? e.desde.toDate() : new Date(e.desde.seconds ? e.desde.seconds * 1000 : e.desde)
          const h = e.hasta.toDate ? e.hasta.toDate() : new Date(e.hasta.seconds ? e.hasta.seconds * 1000 : e.hasta)
          return ahora >= d && ahora <= h
        })
        if (tieneActiva) etapasActivas++
      }
    })

    return {
      totalCiclos: list.length,
      ciclos: list.map(c => c._id || c.ciclo || 'Sin id'),
      etapasActivas
    }
  })

  /**
   * Resumen estructurado por colección para la tabla comparativa.
   */
  const resumenColecciones = computed(() => {
    return [
      {
        id: 'usuarios',
        nombre: 'usuarios',
        tipo: 'Colección Raíz',
        cantidadDocs: datosUsuarios.value.length,
        descripcion: 'Perfiles de usuarios y pre-aprobaciones',
        estrategiaId: 'UID definitivo / Email temporal',
        estado: datosUsuarios.value.length > 0 ? 'Con datos' : 'Vacía',
        subcolecciones: ['inscripciones{ciclo}']
      },
      {
        id: 'ofertaAcademica',
        nombre: 'ofertaAcademica',
        tipo: 'Colección Raíz',
        cantidadDocs: datosOferta.value.length,
        descripcion: 'Ciclos lectivos, etapas y comisiones',
        estrategiaId: 'Código del ciclo (ej: 2026-1)',
        estado: datosOferta.value.length > 0 ? 'Con datos' : 'Sin ciclos',
        subcolecciones: []
      },
      {
        id: 'inscripciones',
        nombre: 'usuarios/{uid}/inscripciones{ciclo}',
        tipo: 'Subcolección',
        cantidadDocs: 'Por usuario',
        descripcion: 'Materias solicitadas por ciclo',
        estrategiaId: 'Código de materia (materiaId)',
        estado: 'Jerárquica',
        subcolecciones: []
      }
    ]
  })

  /**
   * Esquema inferido para la colección actualmente seleccionada en el inspector.
   */
  const esquemaColeccionActiva = computed(() => {
    if (coleccionSeleccionada.value === 'usuarios') {
      return inferirEsquema(datosUsuarios.value)
    }
    if (coleccionSeleccionada.value === 'ofertaAcademica') {
      return inferirEsquema(datosOferta.value)
    }
    return [
      { campo: 'materiaId', tipo: 'string', porcentajePresencia: 100, requerido: true, ejemplo: 'MAT-101' },
      { campo: 'comisionId', tipo: 'string', porcentajePresencia: 100, requerido: true, ejemplo: 'COM-1' },
      { campo: 'estado', tipo: 'string ("pendiente" | "confirmada")', porcentajePresencia: 100, requerido: true, ejemplo: 'pendiente' },
      { campo: 'ciclo', tipo: 'string', porcentajePresencia: 100, requerido: true, ejemplo: '2026-1' },
      { campo: 'fechaInscripcion', tipo: 'Timestamp', porcentajePresencia: 100, requerido: true, ejemplo: { seconds: 1776280000, nanoseconds: 0 } }
    ]
  })

  /**
   * Documento de muestra representativo de la colección seleccionada.
   */
  const muestraColeccionActiva = computed(() => {
    if (coleccionSeleccionada.value === 'usuarios') {
      return datosUsuarios.value[0] || null
    }
    if (coleccionSeleccionada.value === 'ofertaAcademica') {
      return datosOferta.value[0] || null
    }
    return {
      _id: 'materia_ejemplo_101',
      materiaId: '101',
      comisionId: 'A-2026',
      estado: 'pendiente',
      ciclo: '2026-1',
      fechaInscripcion: 'Timestamp (serverTimestamp)'
    }
  })

  /**
   * Establece cuál colección se desea inspeccionar en detalle.
   * @param {'usuarios' | 'ofertaAcademica' | 'inscripciones'} nombre
   */
  function seleccionarColeccion(nombre) {
    coleccionSeleccionada.value = nombre
  }

  return {
    // Estado reactivo
    cargando,
    error,
    ultimaActualizacion,
    latenciaMs,
    estadoConexion,
    coleccionSeleccionada,

    // Métricas y resúmenes computados
    metricasUsuarios,
    metricasOferta,
    resumenColecciones,
    catalogoEstructura,
    esquemaColeccionActiva,
    muestraColeccionActiva,

    // Métodos
    verificarConexion,
    cargarEstadisticas,
    seleccionarColeccion
  }
}

