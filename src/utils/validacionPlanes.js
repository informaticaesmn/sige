// src/utils/validacionPlanes.js
//
// Funciones puras de validación para el editor/revisor de planes de estudio.
// Usado por src/composables/academico/useEditorPlanes.js.
// No lanza excepciones: devuelve siempre { exito, errores }.

import { codigosDeCondicion, validarCondicion } from './condiciones.js'

/**
 * Detecta códigos de materia duplicados en un mapa de materias.
 * @param {Record<string, Object>} materias mapa { [codigo]: materia }
 * @returns {string[]} lista de mensajes de error
 */
export function validarCodigosDuplicados(materias) {
  const errores = []
  const vistos = new Set()
  for (const codigo of Object.keys(materias)) {
    if (vistos.has(codigo)) {
      errores.push(`Código de materia duplicado: "${codigo}"`)
    }
    vistos.add(codigo)
  }
  return errores
}

/**
 * Detecta correlativas (cursar/aprobar) que referencian códigos inexistentes o reglas inválidas.
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
 * @returns {{ exito: boolean, errores: string[] }}
 */
export function validarMaterias(materias) {
  const errores = [
    ...validarCodigosDuplicados(materias),
    ...validarCorrelativasExistentes(materias),
    ...validarFilasSinCodigo(materias)
  ]
  return { exito: errores.length === 0, errores }
}
