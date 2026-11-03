// src/composables/academico/useComentariosPlanes.js
//
// Comentarios del proceso de revisión de un borrador de plan.
//
// Viven en una **subcolección** del borrador: `planesPendientes/{codigo}/comentarios/{id}`.
//
// Por qué subcolección y no dentro del JSON ni del documento del borrador:
// - No contaminan el `jsonTexto` (que es el insumo del editor y de la
//   publicación).
// - Sobreviven a un re-guardado del borrador: `usePlanesPendientes` hace
//   `setDoc` del documento padre, y eso **no** toca las subcolecciones.
// - Sobreviven a un re-import del JSON del Apps Script.
//
// Plan: docs/plan-planes-publicacion-202611.md (Fase 1).
import { ref } from 'vue'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  updateDoc
} from 'firebase/firestore/lite'
import { db } from '@/config/firebase.js'
import { COLECCION_PLANES_PENDIENTES } from './usePlanesPendientes.js'

/** Subcolección de comentarios dentro de cada borrador. */
export const SUBCCOLECCION_COMENTARIOS = 'comentarios'

/** Tipos de comentario admitidos (deben coincidir con firestore.rules). */
export const TIPOS_COMENTARIO = Object.freeze(['nota', 'actualizacion', 'chequear', 'listo'])

/** Longitud máxima del texto de un comentario. */
export const MAX_TEXTO_COMENTARIO = 2000

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
 * Normaliza un documento de comentario al shape que consume la vista.
 * @param {string} id
 * @param {Object} data
 * @returns {Object}
 */
export function normalizarComentario(id, data = {}) {
  return {
    id,
    texto: String(data.texto || ''),
    materiaId: data.materiaId || null,
    tipo: TIPOS_COMENTARIO.includes(data.tipo) ? data.tipo : 'nota',
    autor: data.autor || '',
    autorEmail: data.autorEmail || '',
    creadoEn: aFecha(data.creadoEn),
    resuelto: data.resuelto === true,
    resueltoPor: data.resueltoPor || '',
    resueltoEn: aFecha(data.resueltoEn)
  }
}

/**
 * Referencia a la subcolección de comentarios de un borrador.
 * @param {string} codigoPlan
 */
function referenciaColeccion(codigoPlan) {
  return collection(db, COLECCION_PLANES_PENDIENTES, codigoPlan, SUBCCOLECCION_COMENTARIOS)
}

/**
 * Composable de comentarios de revisión de planes.
 * Todas las funciones devuelven `{ exito, datos, error }` (AGENTS.md §5).
 */
export function useComentariosPlanes() {
  const loading = ref(false)
  const error = ref(null)

  /**
   * Lista los comentarios de un borrador, del más antiguo al más nuevo.
   * @param {string} codigoPlan
   * @returns {Promise<{ exito: boolean, datos: Object[], error: any }>}
   */
  async function listarComentarios(codigoPlan) {
    const codigo = String(codigoPlan || '').trim()
    if (!codigo) {
      return { exito: false, datos: [], error: new Error('Falta el código del plan.') }
    }

    loading.value = true
    error.value = null

    try {
      const snapshot = await getDocs(referenciaColeccion(codigo))
      const datos = snapshot.docs
        .map((documento) => normalizarComentario(documento.id, documento.data()))
        .sort((a, b) => {
          const fechaA = a.creadoEn ? a.creadoEn.getTime() : 0
          const fechaB = b.creadoEn ? b.creadoEn.getTime() : 0
          return fechaA - fechaB
        })

      return { exito: true, datos, error: null }
    } catch (e) {
      error.value = e
      return { exito: false, datos: [], error: e }
    } finally {
      loading.value = false
    }
  }

  /**
   * Agrega un comentario al borrador.
   * @param {string} codigoPlan
   * @param {{ texto: string, materiaId?: string|null, tipo?: string, uid?: string, email?: string }} datos
   * @returns {Promise<{ exito: boolean, datos: Object|null, error: any }>}
   */
  async function agregarComentario(codigoPlan, { texto = '', materiaId = null, tipo = 'nota', uid = '', email = '' } = {}) {
    const codigo = String(codigoPlan || '').trim()
    const textoLimpio = String(texto || '').trim()

    if (!codigo) {
      return { exito: false, datos: null, error: new Error('Falta el código del plan.') }
    }
    if (!textoLimpio) {
      return { exito: false, datos: null, error: new Error('El comentario no puede estar vacío.') }
    }
    if (textoLimpio.length > MAX_TEXTO_COMENTARIO) {
      return {
        exito: false,
        datos: null,
        error: new Error(`El comentario supera los ${MAX_TEXTO_COMENTARIO} caracteres.`)
      }
    }
    if (!TIPOS_COMENTARIO.includes(tipo)) {
      return { exito: false, datos: null, error: new Error(`Tipo de comentario inválido: ${tipo}.`) }
    }

    loading.value = true
    error.value = null

    try {
      const documento = await addDoc(referenciaColeccion(codigo), {
        texto: textoLimpio,
        materiaId: materiaId || null,
        tipo,
        autor: uid || '',
        autorEmail: email || '',
        creadoEn: serverTimestamp(),
        resuelto: false,
        resueltoPor: '',
        resueltoEn: null
      })

      return { exito: true, datos: { id: documento.id }, error: null }
    } catch (e) {
      error.value = e
      return { exito: false, datos: null, error: e }
    } finally {
      loading.value = false
    }
  }

  /**
   * Marca un comentario como resuelto.
   * @param {string} codigoPlan
   * @param {string} id
   * @param {{ uid?: string }} [opciones]
   */
  async function resolverComentario(codigoPlan, id, { uid = '' } = {}) {
    return cambiarResolucion(codigoPlan, id, {
      resuelto: true,
      resueltoPor: uid || '',
      resueltoEn: serverTimestamp()
    })
  }

  /**
   * Reabre un comentario resuelto.
   * @param {string} codigoPlan
   * @param {string} id
   */
  async function reabrirComentario(codigoPlan, id) {
    return cambiarResolucion(codigoPlan, id, {
      resuelto: false,
      resueltoPor: '',
      resueltoEn: null
    })
  }

  /**
   * Aplica un cambio de resolución sobre un comentario.
   * @param {string} codigoPlan
   * @param {string} id
   * @param {Object} cambios
   */
  async function cambiarResolucion(codigoPlan, id, cambios) {
    const codigo = String(codigoPlan || '').trim()
    const comentarioId = String(id || '').trim()

    if (!codigo || !comentarioId) {
      return { exito: false, datos: null, error: new Error('Faltan datos del comentario.') }
    }

    loading.value = true
    error.value = null

    try {
      await updateDoc(
        doc(db, COLECCION_PLANES_PENDIENTES, codigo, SUBCCOLECCION_COMENTARIOS, comentarioId),
        cambios
      )
      return { exito: true, datos: { id: comentarioId }, error: null }
    } catch (e) {
      error.value = e
      return { exito: false, datos: null, error: e }
    } finally {
      loading.value = false
    }
  }

  /**
   * Elimina un comentario.
   * @param {string} codigoPlan
   * @param {string} id
   */
  async function eliminarComentario(codigoPlan, id) {
    const codigo = String(codigoPlan || '').trim()
    const comentarioId = String(id || '').trim()

    if (!codigo || !comentarioId) {
      return { exito: false, datos: null, error: new Error('Faltan datos del comentario.') }
    }

    loading.value = true
    error.value = null

    try {
      await deleteDoc(
        doc(db, COLECCION_PLANES_PENDIENTES, codigo, SUBCCOLECCION_COMENTARIOS, comentarioId)
      )
      return { exito: true, datos: { id: comentarioId }, error: null }
    } catch (e) {
      error.value = e
      return { exito: false, datos: null, error: e }
    } finally {
      loading.value = false
    }
  }

  return {
    listarComentarios,
    agregarComentario,
    resolverComentario,
    reabrirComentario,
    eliminarComentario,
    loading,
    error
  }
}
