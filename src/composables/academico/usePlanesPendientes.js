// src/composables/academico/usePlanesPendientes.js
//
// Persistencia de los CSV de planes "en revisión" en Firestore.
//
// Motivo: el editor de planes necesita que un coordinador suba el CSV una sola
// vez y que después cualquier coordinador pueda reabrirlo sin volver a elegir
// el archivo. La fuente de verdad del plan publicado sigue siendo
// `public/planes/{codigo}.json`; esta colección solo guarda el insumo de trabajo.
//
// Colección: `planesPendientes/{codigo}` (ID = código de plan, string).
// Campos:
//   codigo              string  código canónico del plan (662, 662G, 663, ...)
//   nombre              string  nombre legible del plan
//   csvTexto            string  contenido crudo del CSV
//   materiasCount       number  cantidad de materias detectadas al importar
//   actualizadoEn       timestamp
//   actualizadoPor      string  uid del coordinador
//   actualizadoPorEmail string  email del coordinador (para mostrar sin leer usuarios)
//
// No se guarda el mapa `materias` en Firestore porque sus claves usan puntos
// (`663-0.1`), prohibidos en nombres de campo de Firestore. El editor reconstruye
// el mapa parseando `csvTexto` con `useEditorPlanes.importarCSV`.
import { ref } from 'vue'
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc
} from 'firebase/firestore/lite'
import { db } from '@/config/firebase.js'

/** Nombre de la colección de CSV en revisión. */
export const COLECCION_PLANES_PENDIENTES = 'planesPendientes'

/**
 * Límite de Firestore por documento. El límite real es 1.048.576 bytes; usamos
 * un margen para no chocar con los campos de metadata.
 */
export const MAX_CSV_BYTES = 1_000_000

/**
 * Convierte un `Timestamp` de Firestore (o Date/string) a Date.
 * @param {any} valor
 * @returns {Date|null}
 */
function aFecha(valor) {
  if (!valor) return null
  if (typeof valor.toDate === 'function') return valor.toDate()
  if (valor instanceof Date) return valor
  const fecha = new Date(valor)
  return Number.isNaN(fecha.getTime()) ? null : fecha
}

/**
 * Normaliza un documento de Firestore al shape que consume la vista.
 * @param {string} id ID del documento (código de plan)
 * @param {Object} data
 * @returns {{ codigo, nombre, materiasCount, actualizadoEn, actualizadoPor, actualizadoPorEmail }}
 */
export function normalizarPlanPendiente(id, data = {}) {
  return {
    codigo: data.codigo || id,
    nombre: data.nombre || data.codigo || id,
    materiasCount: Number.isInteger(data.materiasCount) ? data.materiasCount : null,
    actualizadoEn: aFecha(data.actualizadoEn),
    actualizadoPor: data.actualizadoPor || '',
    actualizadoPorEmail: data.actualizadoPorEmail || ''
  }
}

/**
 * Calcula el tamaño en bytes UTF-8 de un texto.
 * @param {string} texto
 * @returns {number}
 */
function bytesDe(texto) {
  return new TextEncoder().encode(texto).length
}

/**
 * Composable de persistencia de CSV de planes en revisión.
 * Todas las funciones devuelven `{ exito, datos, error }` (AGENTS.md §5).
 * @returns {{
 *   listarPlanesPendientes: Function,
 *   obtenerPlanPendiente: Function,
 *   guardarPlanPendiente: Function,
 *   eliminarPlanPendiente: Function,
 *   loading: import('vue').Ref<boolean>,
 *   error: import('vue').Ref<Error|null>
 * }}
 */
export function usePlanesPendientes() {
  const loading = ref(false)
  const error = ref(null)

  /**
   * Lista los CSV guardados, del más reciente al más antiguo.
   * @returns {Promise<{ exito: boolean, datos: Object[], error: any }>}
   */
  async function listarPlanesPendientes() {
    loading.value = true
    error.value = null

    try {
      const snapshot = await getDocs(collection(db, COLECCION_PLANES_PENDIENTES))
      const planes = snapshot.docs
        .map((documento) => normalizarPlanPendiente(documento.id, documento.data()))
        .sort((a, b) => {
          const fechaA = a.actualizadoEn ? a.actualizadoEn.getTime() : 0
          const fechaB = b.actualizadoEn ? b.actualizadoEn.getTime() : 0
          return fechaB - fechaA || a.codigo.localeCompare(b.codigo)
        })

      return { exito: true, datos: planes, error: null }
    } catch (e) {
      error.value = e
      return { exito: false, datos: [], error: e }
    } finally {
      loading.value = false
    }
  }

  /**
   * Lee un CSV guardado, incluyendo su texto crudo.
   * @param {string} codigo
   * @returns {Promise<{ exito: boolean, datos: Object|null, error: any }>}
   */
  async function obtenerPlanPendiente(codigo) {
    if (!codigo) {
      return { exito: false, datos: null, error: new Error('Falta el código del plan.') }
    }

    loading.value = true
    error.value = null

    try {
      const referencia = doc(db, COLECCION_PLANES_PENDIENTES, codigo)
      const snapshot = await getDoc(referencia)

      if (!snapshot.exists()) {
        return {
          exito: false,
          datos: null,
          error: new Error(`No hay un CSV guardado para el plan ${codigo}.`)
        }
      }

      const data = snapshot.data()
      return {
        exito: true,
        datos: {
          ...normalizarPlanPendiente(snapshot.id, data),
          csvTexto: data.csvTexto || ''
        },
        error: null
      }
    } catch (e) {
      error.value = e
      return { exito: false, datos: null, error: e }
    } finally {
      loading.value = false
    }
  }

  /**
   * Crea o reemplaza el CSV guardado de un plan.
   * @param {{ codigo: string, nombre?: string, csvTexto: string, materiasCount?: number, uid?: string, email?: string }} plan
   * @returns {Promise<{ exito: boolean, datos: Object|null, error: any }>}
   */
  async function guardarPlanPendiente({ codigo, nombre = '', csvTexto = '', materiasCount = null, uid = '', email = '' } = {}) {
    const codigoLimpio = String(codigo || '').trim()

    if (!codigoLimpio) {
      return { exito: false, datos: null, error: new Error('Falta el código del plan.') }
    }
    if (typeof csvTexto !== 'string' || csvTexto.trim() === '') {
      return { exito: false, datos: null, error: new Error('El CSV está vacío.') }
    }
    if (bytesDe(csvTexto) > MAX_CSV_BYTES) {
      return {
        exito: false,
        datos: null,
        error: new Error('El CSV supera el tamaño máximo permitido (1 MB).')
      }
    }

    loading.value = true
    error.value = null

    try {
      const documento = {
        codigo: codigoLimpio,
        nombre: String(nombre || '').trim() || `Plan ${codigoLimpio}`,
        csvTexto,
        materiasCount: Number.isInteger(materiasCount) ? materiasCount : null,
        actualizadoEn: serverTimestamp(),
        actualizadoPor: uid || '',
        actualizadoPorEmail: email || ''
      }

      await setDoc(doc(db, COLECCION_PLANES_PENDIENTES, codigoLimpio), documento)

      return { exito: true, datos: documento, error: null }
    } catch (e) {
      error.value = e
      return { exito: false, datos: null, error: e }
    } finally {
      loading.value = false
    }
  }

  /**
   * Elimina el CSV guardado de un plan.
   * @param {string} codigo
   * @returns {Promise<{ exito: boolean, datos: { codigo: string }|null, error: any }>}
   */
  async function eliminarPlanPendiente(codigo) {
    const codigoLimpio = String(codigo || '').trim()

    if (!codigoLimpio) {
      return { exito: false, datos: null, error: new Error('Falta el código del plan.') }
    }

    loading.value = true
    error.value = null

    try {
      await deleteDoc(doc(db, COLECCION_PLANES_PENDIENTES, codigoLimpio))
      return { exito: true, datos: { codigo: codigoLimpio }, error: null }
    } catch (e) {
      error.value = e
      return { exito: false, datos: null, error: e }
    } finally {
      loading.value = false
    }
  }

  return {
    listarPlanesPendientes,
    obtenerPlanPendiente,
    guardarPlanPendiente,
    eliminarPlanPendiente,
    loading,
    error
  }
}
