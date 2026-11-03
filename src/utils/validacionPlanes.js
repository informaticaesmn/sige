// src/utils/validacionPlanes.js
//
// Funciones puras de validación para el editor/revisor de planes de estudio.
// Usado por src/composables/academico/useEditorPlanes.js.
// No lanza excepciones: devuelve siempre { exito, errores, advertencias }.
//
// Los errores bloquean la publicación; las advertencias solo avisan (por
// ejemplo, una equivalencia que apunta a una materia del plan madre).

import { anioDeMateria } from './planes.js'
import { validarCondicion } from './condiciones.js'

/**
 * Detecta códigos de materia duplicados en un mapa de materias.
 * Como las claves de un objeto no pueden repetirse, esto solo reporta códigos
 * repetidos que llegaron como texto con espacios distintos (`" 663-0.1"`).
 * @param {Record<string, Object>} materias mapa { [codigo]: materia }
 * @returns {string[]} lista de mensajes de error
 */
export function validarCodigosDuplicados(materias) {
  const errores = []
  const vistos = new Set()
  for (const codigo of Object.keys(materias)) {
    const normalizado = String(codigo).trim()
    if (vistos.has(normalizado)) {
      errores.push(`Código de materia duplicado: "${codigo}"`)
    }
    vistos.add(normalizado)
  }
  return errores
}

/**
 * Detecta códigos de materia cuyo año no se puede derivar del código.
 * `anioDeMateria` es la misma función que usa el publicador
 * (`normalizarPlanJson`), así que un código que falla acá también rompería
 * el plan publicado.
 * @param {Record<string, Object>} materias mapa { [codigo]: materia }
 * @returns {string[]} lista de mensajes de error
 */
export function validarAniosReconocibles(materias) {
  const errores = []
  for (const codigo of Object.keys(materias)) {
    if (anioDeMateria(codigo) === null) {
      errores.push(
        `La materia "${codigo}" no tiene un año reconocible en su código (ej. 663-0.1).`
      )
    }
  }
  return errores
}

/**
 * Detecta materias sin nombre. El importador completa con el código cuando el
 * JSON no trae nombre; si queda vacío es porque el coordinador lo borró.
 * @param {Record<string, Object>} materias mapa { [codigo]: materia }
 * @returns {string[]} lista de mensajes de error
 */
export function validarNombresMaterias(materias) {
  const errores = []
  for (const [codigo, materia] of Object.entries(materias)) {
    if (!String(materia?.nombre ?? '').trim()) {
      errores.push(`La materia "${codigo}" no tiene nombre.`)
    }
  }
  return errores
}

/**
 * Detecta correlativas (cursar/aprobar) que referencian códigos inexistentes o
 * reglas inválidas (grupos vacíos, auto-referencia, año completo sin materias).
 * @param {Record<string, Object>} materias mapa { [codigo]: materia }
 * @returns {string[]} lista de mensajes de error
 */
export function validarCorrelativasExistentes(materias) {
  const errores = []
  const codigosValidos = new Set(Object.keys(materias))
  const aniosValidos = [
    ...new Set(
      Object.values(materias)
        .map((m) => m.anio)
        .filter((a) => Number.isInteger(a))
    )
  ]

  for (const [codigo, materia] of Object.entries(materias)) {
    const correlativas = materia.correlativas || { cursar: null, aprobar: null }

    for (const tipo of ['cursar', 'aprobar']) {
      const cond = correlativas[tipo]
      if (!cond) continue

      const res = validarCondicion(cond, {
        codigosValidos,
        aniosValidos,
        autoReferencia: codigo
      })

      for (const err of res.errores) {
        errores.push(`Materia "${codigo}" (${tipo}): ${err}`)
      }
    }
  }
  return errores
}

/**
 * Detecta materias sin código (id vacío o nulo).
 * @param {Record<string, Object>} materias mapa { [codigo]: materia }
 * @returns {string[]} lista de mensajes de error
 */
export function validarFilasSinCodigo(materias) {
  const errores = []
  for (const [codigo, materia] of Object.entries(materias)) {
    if (!codigo || String(codigo).trim() === '') {
      errores.push(`Fila sin código de materia: "${materia.nombre || '(sin nombre)'}"`)
    }
  }
  return errores
}

/**
 * Detecta equivalencias (`equivale_a`) que no pertenecen al plan.
 *
 * No es un error: una materia puede equivaler a una del plan madre (por
 * ejemplo, orientaciones de `662`). Solo se reporta como advertencia.
 *
 * @param {Record<string, Object>} materias mapa { [codigo]: materia }
 * @returns {string[]} lista de mensajes de advertencia
 */
export function validarEquivalencias(materias) {
  const advertencias = []
  const codigosValidos = new Set(Object.keys(materias))

  for (const [codigo, materia] of Object.entries(materias)) {
    const equivalencias = Array.isArray(materia?.equivale_a) ? materia.equivale_a : []
    for (const equivalencia of equivalencias) {
      if (!codigosValidos.has(equivalencia)) {
        advertencias.push(
          `La equivalencia "${equivalencia}" de "${codigo}" no pertenece al plan (puede ser del plan madre).`
        )
      }
    }
  }
  return advertencias
}

/**
 * Indica si el plan tiene al menos una materia de año 0 (pregrado).
 * @param {Record<string, Object>} materias mapa { [codigo]: materia }
 * @returns {boolean}
 */
export function detectarPregrado(materias) {
  return Object.values(materias).some((m) => Number.isInteger(m.anio) && m.anio === 0)
}

/**
 * Valida un mapa de materias completo.
 * @param {Record<string, Object>} materias mapa { [codigo]: materia }
 * @returns {{ exito: boolean, errores: string[], advertencias: string[] }}
 */
export function validarMaterias(materias) {
  const errores = [
    ...validarCodigosDuplicados(materias),
    ...validarAniosReconocibles(materias),
    ...validarNombresMaterias(materias),
    ...validarCorrelativasExistentes(materias),
    ...validarFilasSinCodigo(materias)
  ]
  const advertencias = validarEquivalencias(materias)
  return { exito: errores.length === 0, errores, advertencias }
}
