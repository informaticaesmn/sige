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
import { parsearCSV, parsearArray } from '@/utils/csv.js'

/** Máximo de operaciones por batch (límite duro de Firestore: 500). */
export const LIMITE_BATCH = 500

/** Roles que coordinación SÍ puede asignar en la carga masiva. */
export const ROLES_PERMITIDOS = ['estudiante', 'docente', 'bedel']

/** Roles privilegiados que solo admin puede otorgar (deben coincidir con firestore.rules). */
export const ROLES_RESERVADOS = ['admin', 'coordinacion']

/** Todos los roles válidos del sistema. */
export const ROLES_VALIDOS = [...ROLES_PERMITIDOS, ...ROLES_RESERVADOS]

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// ---------------------------------------------------------------------------
// Helpers puros (exportados para poder testearlos sin Firestore)
// ---------------------------------------------------------------------------

/**
 * Normaliza un array de roles: a minúsculas, sin espacios ni duplicados.
 * @param {string|string[]} valor
 * @returns {string[]}
 */
export function normalizarRoles(valor) {
  return [...new Set(parsearArray(valor).map((r) => String(r).trim().toLowerCase()))]
}

/**
 * Convierte la estructura de `public/planes/planes.json` en un mapa
 * `{ codigo: nombreCompleto }`. Acepta tanto el formato actual (`planes: []`)
 * como un objeto plano (`planes: { codigo: nombre }`).
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

/**
 * Valida una fila del CSV y devuelve los datos normalizados.
 * @param {Object} fila fila cruda del CSV
 * @param {Record<string, string>} nombresDePlanes mapa codigo → nombre completo
 * @returns {{ esValida: boolean, errores: string[], advertencias: string[], datos: Object|null }}
 */
export function validarFilaUsuario(fila, nombresDePlanes = {}) {
  const errores = []
  const advertencias = []

  const dni = (fila.dni || '').trim()
  const nombre = (fila.nombre || '').trim()
  const apellido = (fila.apellido || '').trim()
  const email = (fila.email || '').trim().toLowerCase()

  if (!dni) errores.push('Falta el DNI')
  if (!nombre) errores.push('Falta el nombre')
  if (!apellido) errores.push('Falta el apellido')
  if (!email) errores.push('Falta el email')
  else if (!EMAIL_REGEX.test(email)) errores.push('El email tiene un formato inválido')

  // --- Roles ---
  const roles = normalizarRoles(fila.roles)
  const rolesInvalidos = roles.filter((r) => !ROLES_VALIDOS.includes(r))
  const rolesReservados = roles.filter((r) => ROLES_RESERVADOS.includes(r))

  if (roles.length === 0) {
    errores.push('Debe tener al menos un rol')
  } else {
    if (rolesInvalidos.length > 0) agregarError(errores, `Roles inválidos: ${rolesInvalidos.join(', ')}`)
    // Un coordinador no puede crear admins ni coordinadores (solo admin puede).
    if (rolesReservados.length > 0) {
      errores.push(`Roles reservados para admin: ${rolesReservados.join(', ')}`)
    }
  }

  // --- Planes ---
  const planes = parsearArray(fila.plan)
  const esEstudiante = roles.includes('estudiante')
  if (esEstudiante && planes.length === 0) {
    errores.push('Los estudiantes deben tener al menos un plan asignado')
  }
  if (!esEstudiante && planes.length > 0) {
    advertencias.push('No es estudiante pero tiene planes asignados')
  }

  // Traducir códigos de plan a nombres completos (fuente de verdad: planes.json)
  const planesFormateados = planes
    .map((codigo) => String(codigo).trim())
    .filter((codigo) => codigo !== '')
    .map((codigo) => {
      const nombreCompleto = nombresDePlanes[codigo]
      if (!nombreCompleto) advertencias.push(`El código de plan "${codigo}" no está en planes.json`)
      return nombreCompleto || codigo
    })

  return {
    esValida: errores.length === 0,
    errores,
    advertencias,
    datos: errores.length === 0
      ? { dni, nombre, apellido, email, roles, planes: planesFormateados }
      : null
  }
}

/** Helper interno: evita duplicar un error (por si se solapan validaciones). */
function agregarError(lista, mensaje) {
  if (!lista.includes(mensaje)) lista.push(mensaje)
}

/**
 * Construye el documento de pre-registro de un usuario.
 * @param {Object} datos datos normalizados de `validarFilaUsuario`
 * @returns {Object}
 */
export function construirDocumentoUsuario(datos) {
  return {
    dni: datos.dni,
    nombre: datos.nombre,
    apellido: datos.apellido,
    email: datos.email,
    roles: datos.roles,
    planes: datos.planes,
    estado: 'pendiente_registro',
    fechaImport: new Date().toISOString(),
    creadoEl: serverTimestamp()
  }
}

/**
 * Divide un array en lotes de tamaño `tamano`.
 * @param {Array} items
 * @param {number} tamano
 * @returns {Array[]}
 */
export function dividirEnLotes(items, tamano = LIMITE_BATCH) {
  const lotes = []
  for (let i = 0; i < items.length; i += tamano) {
    lotes.push(items.slice(i, i + tamano))
  }
  return lotes
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
      const filas = parsearCSV(textoCSV)
      if (filas.length === 0) {
        const err = new Error('El CSV no tiene filas de datos (o falta el encabezado).')
        error.value = err
        return { exito: false, datos: { filas: [], errores: [] }, error: err }
      }

      // 1) Validar TODO antes de escribir nada (fallar temprano, no a mitad de batch).
      const filasValidas = []
      const errores = []
      filas.forEach((fila, index) => {
        const validacion = validarFilaUsuario(fila, nombresDePlanes)
        if (validacion.esValida) {
          filasValidas.push(construirDocumentoUsuario(validacion.datos))
        } else {
          errores.push({
            fila: index + 2, // +1 por índice 0 y +1 por el encabezado
            email: fila.email || '(sin email)',
            detalle: validacion.errores
          })
        }
      })

      if (errores.length > 0) {
        const err = new Error(`Hay ${errores.length} fila(s) inválida(s). No se importó ningún usuario.`)
        error.value = err
        return { exito: false, datos: { filas: filasValidas, errores, totalFilas: filas.length }, error: err }
      }

      // 2) Escribir por lotes atómicos (cada lote ≤ 500 operaciones).
      const lotes = dividirEnLotes(filasValidas)
      let importados = 0
      for (const lote of lotes) {
        const batch = writeBatch(db)
        for (const usuario of lote) {
          batch.set(doc(db, 'usuarios', usuario.email), usuario)
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
  }

  return { importarUsuariosDesdeCSV, loading, error }
}
