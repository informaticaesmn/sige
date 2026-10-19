// src/utils/csv.js
//
// Utilidades de parseo de CSV compartidas por las cargas masivas
// (usuarios y oferta académica). Sin dependencias: el parser respeta comillas
// dobles y el escapado de comillas internas duplicándolas, que es como Google
// Sheets exporta los campos con arrays: `"[""estudiante""]"`.

/**
 * Parsea un texto CSV a una matriz de campos ya "desenvueltos".
 * @param {string} texto
 * @returns {string[][]}
 */
export function parsearFilasCSV(texto) {
  const filas = []
  let fila = []
  let campo = ''
  let enComillas = false

  for (let i = 0; i < texto.length; i++) {
    const c = texto[i]

    if (enComillas) {
      if (c === '"') {
        if (texto[i + 1] === '"') {
          campo += '"'
          i++ // salta la segunda comilla
        } else {
          enComillas = false
        }
      } else {
        campo += c
      }
    } else if (c === '"') {
      enComillas = true
    } else if (c === ',') {
      fila.push(campo)
      campo = ''
    } else if (c === '\n') {
      fila.push(campo)
      campo = ''
      filas.push(fila)
      fila = []
    } else if (c !== '\r') {
      campo += c
    }
  }

  // Última fila (si el archivo no termina en salto de línea)
  if (campo !== '' || fila.length > 0) {
    fila.push(campo)
    filas.push(fila)
  }

  // Descartar filas completamente vacías
  return filas.filter((f) => f.some((valor) => valor.trim() !== ''))
}

/**
 * Convierte el texto CSV en objetos { columna: valor } usando la primera fila
 * como encabezado.
 * @param {string} texto
 * @returns {Object[]}
 */
export function parsearCSV(texto) {
  if (!texto || texto.trim() === '') return []

  const filas = parsearFilasCSV(texto)
  if (filas.length < 2) return []

  const encabezados = filas[0].map((h) => h.trim())
  return filas.slice(1).map((valores) => {
    const fila = {}
    encabezados.forEach((col, idx) => {
      fila[col] = (valores[idx] ?? '').trim()
    })
    return fila
  })
}

/**
 * Interpreta un campo que puede ser un array en formato JSON (`["a","b"]`) o
 * una lista separada por comas (`a,b`).
 * @param {string|string[]} valor
 * @returns {string[]}
 */
export function parsearArray(valor) {
  if (!valor) return []
  if (Array.isArray(valor)) return valor

  const texto = String(valor).trim()
  if (texto === '') return []

  try {
    const parsed = JSON.parse(texto)
    return Array.isArray(parsed) ? parsed : [parsed]
  } catch {
    return texto.includes(',') ? texto.split(',').map((v) => v.trim()) : [texto]
  }
}
