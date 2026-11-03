// src/composables/academico/usePlanesPendientes.js
//
// Persistencia de los borradores de planes en revisión en Firestore.
//
// Evolución: originalmente usaba `csvTexto`. Ahora migró a `jsonTexto` para
// soportar el árbol de correlatividades, manteniendo `csvTexto` como fallback
// de lectura para no romper el trabajo pendiente de los coordinadores.
//
// Colección: `planesPendientes/{codigo}` (ID = código de plan, string).
// Campos (v3):
//   codigo              string  código canónico del plan
//   nombre              string  nombre legible del plan
//   jsonTexto           string  JSON crudo del editor (árbol de correlativas)
//   csvTexto            string  (Legacy) contenido crudo anterior
//   materiasCount       number  cantidad de materias
//   actualizadoEn       timestamp
//   actualizadoPor      string  uid del coordinador
//   actualizadoPorEmail string  email del coordinador
//   estadoRevision      string  'en_edicion' | 'revision' | 'listo_para_publicar'
//   listoParaPublicarEn timestamp | null
//   listoParaPublicarPor string | null
//   publicadoEn         timestamp | null
//
// Los comentarios del proceso de revisión viven en la subcolección
// `planesPendientes/{codigo}/comentarios` (ver useComentariosPlanes.js).
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

/** Nombre de la colección de borradores. */
export const COLECCION_PLANES_PENDIENTES = 'planesPendientes'

/**
 * Límite de Firestore por documento (~1MB).
 */
export const MAX_JSON_BYTES = 1_000_000

/** Estados del flujo de revisión de un borrador. */
export const ESTADOS_REVISION = Object.freeze(['en_edicion', 'revision', 'listo_para_publicar'])

/** Estado de revisión por defecto al crear un borrador. */
export const ESTADO_REVISION_DEFAULT = 'en_edicion'

/** Etiquetas legibles de cada estado (para la UI). */
export const ETIQUETAS_ESTADO_REVISION = Object.freeze({
  en_edicion: 'En edición',
  revision: 'En revisión',
  listo_para_publicar: 'Listo para publicar'
})

/**
 * Convierte un `Timestamp` de Firestore (o Date/string) a Date.
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
 */
export function normalizarPlanPendiente(id, data = {}) {
  return {
    codigo: data.codigo || id,
    nombre: data.nombre || data.codigo || id,
    materiasCount: Number.isInteger(data.materiasCount) ? data.materiasCount : null,
    actualizadoEn: aFecha(data.actualizadoEn),
    actualizadoPor: data.actualizadoPor || '',
    actualizadoPorEmail: data.actualizadoPorEmail || '',
    estadoRevision: ESTADOS_REVISION.includes(data.estadoRevision)
      ? data.estadoRevision
      : ESTADO_REVISION_DEFAULT,
    listoParaPublicarEn: aFecha(data.listoParaPublicarEn),
    listoParaPublicarPor: data.listoParaPublicarPor || '',
    publicadoEn: aFecha(data.publicadoEn)
  }
}

/**
 * Calcula el tamaño en bytes UTF-8 de un texto.
 */
function bytesDe(texto) {
  return new TextEncoder().encode(texto).length
}

/**
 * Composable de persistencia de borradores de planes.
 * Todas las funciones devuelven `{ exito, datos, error }` (AGENTS.md §5).
 */
export function usePlanesPendientes() {
  const loading = ref(false)
  const error = ref(null)

  /**
   * Lista los borradores guardados, del más reciente al más antiguo.
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
   * Lee un borrador guardado. Prioriza `jsonTexto`, fallback a `csvTexto`.
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
          error: new Error(`No hay un borrador guardado para el plan ${codigo}.`)
        }
      }

      const data = snapshot.data()
      // Migración/Compatibilidad: leemos jsonTexto o csvTexto
      const jsonTexto = data.jsonTexto || data.csvTexto || ''
      const esLegacy = !data.jsonTexto && !!data.csvTexto

      return {
        exito: true,
        datos: {
          ...normalizarPlanPendiente(snapshot.id, data),
          jsonTexto,
          esLegacy
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
   * Crea o actualiza el borrador de un plan.
   *
   * Usa `setDoc` con `merge: true` para no pisar campos que administra otro
   * flujo (por ejemplo `estadoRevision` o `publicadoEn`): el editor guarda el
   * contenido (`jsonTexto`) sin tocar el estado de revisión.
   *
   * @param {{ codigo: string, nombre?: string, jsonTexto: string, materiasCount?: number, uid?: string, email?: string, estadoRevision?: string }} plan
   */
  async function guardarPlanPendiente({ codigo, nombre = '', jsonTexto = '', materiasCount = null, uid = '', email = '', estadoRevision = null } = {}) {
    const codigoLimpio = String(codigo || '').trim()

    if (!codigoLimpio) {
      return { exito: false, datos: null, error: new Error('Falta el código del plan.') }
    }
    if (typeof jsonTexto !== 'string' || jsonTexto.trim() === '') {
      return { exito: false, datos: null, error: new Error('El JSON del plan está vacío.') }
    }
    if (bytesDe(jsonTexto) > MAX_JSON_BYTES) {
      return {
        exito: false,
        datos: null,
        error: new Error('El borrador supera el tamaño máximo permitido (1 MB).')
      }
    }

    loading.value = true
    error.value = null

    try {
      const documento = {
        codigo: codigoLimpio,
        nombre: String(nombre || '').trim() || `Plan ${codigoLimpio}`,
        jsonTexto,
        materiasCount: Number.isInteger(materiasCount) ? materiasCount : null,
        actualizadoEn: serverTimestamp(),
        actualizadoPor: uid || '',
        actualizadoPorEmail: email || ''
      }

      if (ESTADOS_REVISION.includes(estadoRevision)) {
        documento.estadoRevision = estadoRevision
      }

      await setDoc(doc(db, COLECCION_PLANES_PENDIENTES, codigoLimpio), documento, { merge: true })

      return { exito: true, datos: documento, error: null }
    } catch (e) {
      error.value = e
      return { exito: false, datos: null, error: e }
    } finally {
      loading.value = false
    }
  }

  /**
   * Elimina el borrador de un plan.
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

  /**
   * Cambia el estado de revisión de un borrador.
   *
   * @param {string} codigo
   * @param {'en_edicion'|'revision'|'listo_para_publicar'} estadoRevision
   * @param {{ uid?: string, email?: string }} [auditoria]
   * @returns {Promise<{ exito: boolean, datos: Object|null, error: any }>}
   */
  async function actualizarEstadoRevision(codigo, estadoRevision, { uid = '', email = '' } = {}) {
    const codigoLimpio = String(codigo || '').trim()

    if (!codigoLimpio) {
      return { exito: false, datos: null, error: new Error('Falta el código del plan.') }
    }
    if (!ESTADOS_REVISION.includes(estadoRevision)) {
      return {
        exito: false,
        datos: null,
        error: new Error(`Estado de revisión inválido: ${estadoRevision}.`)
      }
    }

    loading.value = true
    error.value = null

    try {
      const documento = {
        estadoRevision,
        actualizadoEn: serverTimestamp(),
        actualizadoPor: uid || '',
        actualizadoPorEmail: email || ''
      }

      if (estadoRevision === 'listo_para_publicar') {
        documento.listoParaPublicarEn = serverTimestamp()
        documento.listoParaPublicarPor = uid || ''
      } else {
        documento.listoParaPublicarEn = null
        documento.listoParaPublicarPor = ''
      }

      await setDoc(doc(db, COLECCION_PLANES_PENDIENTES, codigoLimpio), documento, { merge: true })

      return { exito: true, datos: { codigo: codigoLimpio, estadoRevision }, error: null }
    } catch (e) {
      error.value = e
      return { exito: false, datos: null, error: e }
    } finally {
      loading.value = false
    }
  }

  /**
   * Marca un borrador como "listo para publicar" (bandeja del admin).
   * @param {string} codigo
   * @param {{ uid?: string, email?: string }} [auditoria]
   */
  async function marcarListoParaPublicar(codigo, auditoria = {}) {
    return actualizarEstadoRevision(codigo, 'listo_para_publicar', auditoria)
  }

  /**
   * Devuelve un borrador a "en edición" (deshace "listo para publicar").
   * @param {string} codigo
   * @param {{ uid?: string, email?: string }} [auditoria]
   */
  async function volverARevision(codigo, auditoria = {}) {
    return actualizarEstadoRevision(codigo, 'en_edicion', auditoria)
  }

  return {
    listarPlanesPendientes,
    obtenerPlanPendiente,
    guardarPlanPendiente,
    eliminarPlanPendiente,
    actualizarEstadoRevision,
    marcarListoParaPublicar,
    volverARevision,
    loading,
    error
  }
}