// src/composables/academico/usePlanesPublicados.js
//
// Registro de planes aprobados ("listos") del taller editorial.
//
// Colección: `planesPublicados/{codigo}` (ID = código canónico, string).
// Campos (v1):
//   codigo              string   código canónico del plan
//   nombre              string   nombre legible
//   disponible          boolean  si se habilita para el alta (lo decide el admin)
//   jsonTexto           string   detalle publicado (mismo objeto que
//                                `public/planes/{codigo}.json`)
//   version             number   se incrementa en cada publicación
//   publicadoEn         timestamp
//   publicadoPor        string   uid del admin que publicó
//   publicadoPorEmail   string
//   materiasCount       number
//   origenActualizadoEn timestamp | null  `actualizadoEn` del borrador promovido
//
// La **vidriera de runtime** sigue siendo `public/planes/` (archivos estáticos):
// este composable solo arma los objetos para regenerarla. La escritura de los
// archivos la hace el admin (descarga + commit) o, a futuro, un workflow.
//
// Plan: docs/planes-implementacion/planes-publicacion.md (Fase 2, E1).
import { ref } from 'vue'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc
} from 'firebase/firestore/lite'
import { db } from '@/config/firebase.js'
import { MAX_JSON_BYTES } from './usePlanesPendientes.js'

/** Nombre de la colección de planes publicados. */
export const COLECCION_PLANES_PUBLICADOS = 'planesPublicados'

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
 * Calcula el tamaño en bytes UTF-8 de un texto.
 * @param {string} texto
 * @returns {number}
 */
function bytesDe(texto) {
  return new TextEncoder().encode(texto).length
}

/**
 * Normaliza un documento de Firestore al shape que consumen las vistas.
 * @param {string} id
 * @param {Object} data
 * @returns {Object}
 */
export function normalizarPlanPublicado(id, data = {}) {
  return {
    codigo: data.codigo || id,
    nombre: data.nombre || data.codigo || id,
    disponible: data.disponible === true,
    jsonTexto: String(data.jsonTexto || ''),
    version: Number.isInteger(data.version) ? data.version : 0,
    publicadoEn: aFecha(data.publicadoEn),
    publicadoPor: data.publicadoPor || '',
    publicadoPorEmail: data.publicadoPorEmail || '',
    materiasCount: Number.isInteger(data.materiasCount) ? data.materiasCount : null,
    origenActualizadoEn: aFecha(data.origenActualizadoEn)
  }
}

/**
 * Parsea y valida el detalle de un plan antes de publicarlo o de incluirlo en
 * la vidriera. Aborta si el JSON no sirve para runtime: un archivo inválido
 * rompería el gate de altas y la página pública.
 *
 * @param {string} codigo código canónico con el que se publica
 * @param {string} jsonTexto detalle serializado
 * @returns {Object} JSON parseado
 * @throws {Error} si no es parseable, no declara materias o el código no coincide
 */
export function parsearJsonPublicable(codigo, jsonTexto) {
  let json
  try {
    json = JSON.parse(jsonTexto)
  } catch {
    throw new Error('El JSON del plan no es parseable.')
  }

  if (!json || typeof json !== 'object' || Array.isArray(json)) {
    throw new Error('El JSON del plan debe ser un objeto.')
  }

  const codigoDeclarado = String(json.plan ?? json.codigo ?? '')
    .trim()
    .split(/\s+/)[0]
  if (codigoDeclarado && codigoDeclarado !== codigo) {
    throw new Error(
      `El JSON declara el plan ${codigoDeclarado} y se intenta publicar como ${codigo}.`
    )
  }

  const materias = json.materias
  if (
    !materias ||
    typeof materias !== 'object' ||
    Array.isArray(materias) ||
    Object.keys(materias).length === 0
  ) {
    throw new Error('El JSON del plan no tiene materias.')
  }

  return json
}

/**
 * Composable de planes publicados (registro del taller editorial).
 * Todas las funciones devuelven `{ exito, datos, error }` (AGENTS.md §5).
 */
export function usePlanesPublicados() {
  const loading = ref(false)
  const error = ref(null)

  /**
   * Lista los planes publicados, ordenados por código.
   * @returns {Promise<{ exito: boolean, datos: Object[], error: any }>}
   */
  async function listarPlanesPublicados() {
    loading.value = true
    error.value = null

    try {
      const snapshot = await getDocs(collection(db, COLECCION_PLANES_PUBLICADOS))
      const planes = snapshot.docs
        .map((documento) => normalizarPlanPublicado(documento.id, documento.data()))
        .sort((a, b) => a.codigo.localeCompare(b.codigo, 'es', { numeric: true }))

      return { exito: true, datos: planes, error: null }
    } catch (e) {
      error.value = e
      return { exito: false, datos: [], error: e }
    } finally {
      loading.value = false
    }
  }

  /**
   * Lee un plan publicado por código.
   * @param {string} codigo
   * @returns {Promise<{ exito: boolean, datos: Object|null, error: any }>}
   */
  async function obtenerPlanPublicado(codigo) {
    const codigoLimpio = String(codigo || '').trim()
    if (!codigoLimpio) {
      return { exito: false, datos: null, error: new Error('Falta el código del plan.') }
    }

    loading.value = true
    error.value = null

    try {
      const snapshot = await getDoc(doc(db, COLECCION_PLANES_PUBLICADOS, codigoLimpio))
      if (!snapshot.exists()) {
        return {
          exito: false,
          datos: null,
          error: new Error(`El plan ${codigoLimpio} no está publicado.`)
        }
      }

      return {
        exito: true,
        datos: normalizarPlanPublicado(snapshot.id, snapshot.data()),
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
   * Publica (o vuelve a publicar) un plan: copia el detalle del provisorio al
   * registro de "listos" e incrementa `version`.
   *
   * No es atómico (Firestore Lite no tiene transacciones): lee la versión
   * actual y escribe `version + 1`. A esta escala (un admin publicando de a
   * un plan) la carrera es improbable; si pasara, la última escritura gana.
   *
   * @param {{ codigo: string, nombre?: string, jsonTexto: string, disponible?: boolean, materiasCount?: number, uid?: string, email?: string, origenActualizadoEn?: any }} plan
   * @returns {Promise<{ exito: boolean, datos: Object|null, error: any }>}
   */
  async function publicarPlan({
    codigo = '',
    nombre = '',
    jsonTexto = '',
    disponible = false,
    materiasCount = null,
    uid = '',
    email = '',
    origenActualizadoEn = null
  } = {}) {
    const codigoLimpio = String(codigo || '').trim()

    if (!codigoLimpio) {
      return { exito: false, datos: null, error: new Error('Falta el código del plan.') }
    }
    if (!uid) {
      return { exito: false, datos: null, error: new Error('Falta el usuario que publica.') }
    }
    if (typeof jsonTexto !== 'string' || jsonTexto.trim() === '') {
      return { exito: false, datos: null, error: new Error('El JSON del plan está vacío.') }
    }
    if (bytesDe(jsonTexto) > MAX_JSON_BYTES) {
      return {
        exito: false,
        datos: null,
        error: new Error('El plan supera el tamaño máximo permitido (1 MB).')
      }
    }

    try {
      parsearJsonPublicable(codigoLimpio, jsonTexto)
    } catch (e) {
      return { exito: false, datos: null, error: e }
    }

    loading.value = true
    error.value = null

    try {
      const referencia = doc(db, COLECCION_PLANES_PUBLICADOS, codigoLimpio)
      const actual = await getDoc(referencia)
      const versionActual = actual.exists() ? Number(actual.data()?.version) || 0 : 0

      const documento = {
        codigo: codigoLimpio,
        nombre: String(nombre || '').trim() || `Plan ${codigoLimpio}`,
        disponible: disponible === true,
        jsonTexto,
        version: versionActual + 1,
        publicadoEn: serverTimestamp(),
        publicadoPor: uid,
        publicadoPorEmail: String(email || '').trim(),
        materiasCount: Number.isInteger(materiasCount) ? materiasCount : null,
        origenActualizadoEn: origenActualizadoEn || null
      }

      await setDoc(referencia, documento)

      return {
        exito: true,
        datos: { codigo: codigoLimpio, version: documento.version },
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
   * Arma los artefactos de la vidriera a partir de `planesPublicados`:
   * el catálogo de `planes.json` y un detalle por plan. No escribe archivos:
   * los devuelve listos para serializar y descargar/commitear.
   *
   * `disponible` se toma del documento publicado (decisión del admin), no del
   * JSON, para que catálogo y detalle no se contradigan.
   *
   * @returns {Promise<{ exito: boolean, datos: { catalogo: Object, detalles: Object }|null, error: any }>}
   */
  async function generarVidriera() {
    loading.value = true
    error.value = null

    try {
      const snapshot = await getDocs(collection(db, COLECCION_PLANES_PUBLICADOS))
      const planes = snapshot.docs
        .map((documento) => normalizarPlanPublicado(documento.id, documento.data()))
        .sort((a, b) => a.codigo.localeCompare(b.codigo, 'es', { numeric: true }))

      const catalogo = {
        planes: planes.map((plan) => ({
          codigo: plan.codigo,
          nombre: plan.nombre,
          disponible: plan.disponible
        }))
      }

      const detalles = {}
      for (const plan of planes) {
        try {
          detalles[plan.codigo] = {
            ...parsearJsonPublicable(plan.codigo, plan.jsonTexto),
            disponible: plan.disponible
          }
        } catch (e) {
          throw new Error(`Plan ${plan.codigo}: ${e.message}`, { cause: e })
        }
      }

      return { exito: true, datos: { catalogo, detalles }, error: null }
    } catch (e) {
      error.value = e
      return { exito: false, datos: null, error: e }
    } finally {
      loading.value = false
    }
  }

  return {
    listarPlanesPublicados,
    obtenerPlanPublicado,
    publicarPlan,
    generarVidriera,
    loading,
    error
  }
}
