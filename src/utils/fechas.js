// src/utils/fechas.js
//
// Utilidades puras de formato de fecha para las vistas.

/**
 * Formatea una fecha (Date, Timestamp de Firestore o string) como fecha y hora
 * corta en es-AR. Devuelve `'—'` si el valor es vacío o inválido.
 *
 * @param {Date|{ toDate: () => Date }|string|number|null|undefined} valor
 * @returns {string}
 */
export function formatearFechaHora(valor) {
  if (!valor) return '—'

  let fecha
  if (typeof valor?.toDate === 'function') fecha = valor.toDate()
  else if (valor instanceof Date) fecha = valor
  else fecha = new Date(valor)

  if (!(fecha instanceof Date) || Number.isNaN(fecha.getTime())) return '—'

  return fecha.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
}
