// src/composables/usuarios/useImportarUsuarios.js
//
// Carga masiva de usuarios desde un CSV (Google Sheets) hacia la colección
// `usuarios`, con ID de documento = email (pre-registro) y `estado:
// 'pendiente_registro'` (ver docs/importar-usuarios.md).
//
// Reglas de negocio:
// - Solo un usuario con rol `coordinacion` (o `admin`) llega hasta acá: la vista
//   lo protege por ruta (meta.role) y Firestore lo vuelve a validar con las rules.
// - El CSV debe fallar ANTES de escribir si alguna fila es inválida (validación
//   temprana, ver Backlog F2-1 en docs/contexto.md). Por eso es todo-o-nada.
// - Las escrituras van en `writeBatch` (AGENTS.md §4), partidas en lotes de
//   LIMITE_BATCH porque Firestore limita un batch a 500 operaciones.
import { ref } from 'vue'
import { doc, writeBatch, serverTimestamp } from 'firebase/firestore/lite'
import { db } from '@/config/firebase.js'
import { parsearCSVUsuarios } from '@/utils/csv.js'
import { validarCSVUsuarios, construirDocumentoUsuario, construirLegajo } from '@/utils/validacionUsuarios.js'
import { catalogoDePlanes } from '@/utils/planes.js'

/** Máximo de operaciones por batch (límite duro de Firestore: 500). */
export const LIMITE_BATCH = 500

/** Roles que coordinación SÍ puede asignar en la carga masiva. */
export const ROLES_PERMITIDOS = ['estudiante', 'docente', 'bedel']

/** Roles privilegiados que solo admin puede otorgar (deben coincidir con firestore.rules). */
export const ROLES_RESERVADOS = ['admin', 'coordinacion']

/** Todos los roles válidos del sistema. */
export const ROLES_VALIDOS = [...ROLES_PERMITIDOS, ...ROLES_RESERVADOS]

/**
 * Convierte `public/planes/planes.json` en un mapa `{ codigo: nombre }`.
 * Acepta el formato actual (`planes: []`) y el formato plano heredado.
 * @param {Object} json
 * @returns {Record<string, string>}
 */
export function mapaDePlanesDesdeJson(json) {
  const planes = json?.planes
  if (!planes) return {}

  if (Array.isArray(planes)) {
    return planes.reduce((mapa, plan) => {
      if (plan?.codigo) mapa[plan.codigo] = plan.nombre || plan.codigo
      return mapa
    }, {})
  }

  return { ...planes }
}

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

/**
 * Composable de carga masiva de usuarios para el rol `coordinacion`.
 * Expone `importarUsuariosDesdeCSV`, que valida todo el archivo primero y recién
 * después escribe en Firestore por lotes atómicos.
 * @returns {{ importarUsuariosDesdeCSV: Function, loading: import('vue').Ref<boolean>, error: import('vue').Ref<Error|null> }}
 */
export function useImportarUsuarios() {
  const loading = ref(false)
  const error = ref(null)

  /**
   * Valida e importa los usuarios de un CSV.
   * @param {string} textoCSV contenido del archivo
   * @param {{ nombresDePlanes?: Record<string, string> }} [opciones]
   * @returns {Promise<{ exito: boolean, datos?: Object, error?: any }>}
   */
  async function importarUsuariosDesdeCSV(textoCSV, { nombresDePlanes = {} } = {}) {
    loading.value = true
    error.value = null

    try {
      // 1) Parsear CSV v2
      const filas = parsearCSVUsuarios(textoCSV)
      if (filas.length === 0) {
        const err = new Error('El CSV no tiene filas de datos (o falta el encabezado).')
        error.value = err
        return { exito: false, datos: { filas: [], errores: [] }, error: err }
      }

      // 2) Validar TODO antes de escribir nada (fallar temprano, no a mitad de batch).
      const { filas: filasValidas, errores } = validarCSVUsuarios(filas, nombresDePlanes)

      if (errores.length > 0) {
        const err = new Error(`Hay ${errores.length} fila(s) inválida(s). No se importó ningún usuario.`)
        error.value = err
        return { exito: false, datos: { filas: filasValidas, errores, totalFilas: filas.length }, error: err }
      }

      // 3) Escribir por lotes atómicos (cada lote ≤ 500 operaciones).
      const lotes = dividirEnLotes(filasValidas)
      let importados = 0
      for (const lote of lotes) {
        const batch = writeBatch(db)
        for (const fila of lote) {
          // Generar personaId (UUID) para cada usuario
          const personaId = crypto.randomUUID()
          // Construir documento de usuario
          const usuario = construirDocumentoUsuario(fila, personaId)
          // Construir legajo
          const legajo = construirLegajo({ ...fila, personaId })
          // Escribir ambos documentos
          batch.set(doc(db, 'usuarios', usuario.email), usuario)
          batch.set(doc(db, 'legajos', personaId), legajo)
        }
        await batch.commit()
        importados += lote.length
      }

      return {
        exito: true,
        datos: { importados, totalFilas: filas.length, lotes: lotes.length, errores: [] },
        error: null
      }
    } catch (e) {
      console.error('Error en la carga masiva de usuarios:', e)
      error.value = e
      return { exito: false, datos: { errores: [] }, error: e }
    } finally {
      loading.value = false
    }

    return { importarUsuariosDesdeCSV, loading, error }
  }

  /**
   * Divide un array en lotes de tamaño `tamano`.
   * @param {Array} items
   * @param {number} tamano
   * @returns {Array[]}
   */
  function dividirEnLotes(items, tamano = LIMITE_BATCH) {
    const lotes = []
    for (let i = 0; i < items.length; i += tamano) {
      lotes.push(items.slice(i, i + tamano))
    }
    return lotes
  }

  return { importarUsuariosDesdeCSV, loading, error }
}
