// src/utils/condiciones.js
//
// Utilidades puras para leer, escribir, recorrer y validar condiciones de
// correlatividad de los planes de estudio.
//
// El JSON del Apps Script (`exportPlanJSONCore`) es flexible: una condición
// puede ser un string, un array legacy o un objeto `{ and }` / `{ or }` /
// `{ anio_completo }`. El editor necesita un árbol único para mostrarlo y
// editarlo, así que este módulo convierte en ambos sentidos:
//
//   JSON del plan      ──condicionDesdeJson──▶  árbol normalizado
//   árbol normalizado  ──condicionAJson────▶    JSON del plan
//
// Árbol normalizado:
//   { tipo: 'materia', codigo: '663-0.1' }
//   { tipo: 'and', hijos: [Condicion, ...] }
//   { tipo: 'or',  hijos: [Condicion, ...] }
//   { tipo: 'anio', anio: 0 }   // equivale a { anio_completo: 0 }
//
// Todas las funciones son puras: no mutan la entrada y no acceden a Vue ni a
// red. Los grupos de un solo hijo se colapsan para que el editor nunca muestre
// un grupo trivial; los grupos vacíos se conservan para poder reportarlos como
// error de validación.

/** Tipos de nodo válidos del árbol normalizado. */
export const TIPOS_CONDICION = Object.freeze(['materia', 'and', 'or', 'anio'])

/**
 * Convierte un valor de año a número entero.
 * @param {string|number} valor
 * @returns {number|null} `null` si no es un entero reconocible
 */
function normalizarAnio(valor) {
  if (valor === null || valor === undefined || valor === '') return null
  const numero = Number.parseInt(String(valor), 10)
  return Number.isNaN(numero) ? null : numero
}

/**
 * Arma un grupo `and`/`or` a partir de hijos ya normalizados.
 * Descarta `null`, colapsa grupos de un solo hijo y conserva los vacíos.
 * @param {'and'|'or'} tipo
 * @param {Array} hijos
 * @returns {Object}
 */
function agrupar(tipo, hijos) {
  const limpios = hijos.filter((hijo) => hijo != null)
  if (limpios.length === 1) return limpios[0]
  return { tipo, hijos: limpios }
}

/**
 * Normaliza un nodo que ya está en el modelo del editor (`{ tipo, ... }`).
 * @param {Object} nodo
 * @returns {Object|null}
 */
function normalizarNodo(nodo) {
  switch (nodo.tipo) {
    case 'materia': {
      const codigo = String(nodo.codigo ?? '').trim()
      return codigo ? { tipo: 'materia', codigo } : null
    }
    case 'and':
    case 'or': {
      const hijos = Array.isArray(nodo.hijos) ? nodo.hijos.map(condicionDesdeJson) : []
      return agrupar(nodo.tipo, hijos)
    }
    case 'anio': {
      const anio = normalizarAnio(nodo.anio)
      return anio === null ? null : { tipo: 'anio', anio }
    }
    default:
      return null
  }
}

/**
 * Convierte una condición del JSON del plan al árbol normalizado.
 *
 * Acepta:
 * - `null` / `undefined` / `''` → `null`
 * - `"663-0.1"` → `{ tipo: 'materia', codigo: '663-0.1' }`
 * - `["a", "b"]` → `{ tipo: 'and', hijos: [...] }` (array legacy = AND)
 * - `{ and: [...] }` / `{ or: [...] }` → grupo
 * - `{ anio_completo: 1 }` → `{ tipo: 'anio', anio: 1 }`
 * - un nodo ya normalizado → se normaliza recursivamente
 *
 * @param {*} json condición cruda
 * @returns {Object|null}
 */
export function condicionDesdeJson(json) {
  if (json === null || json === undefined) return null

  if (typeof json === 'string') {
    const codigo = json.trim()
    return codigo ? { tipo: 'materia', codigo } : null
  }

  if (Array.isArray(json)) {
    return agrupar('and', json.map(condicionDesdeJson))
  }

  if (typeof json !== 'object') return null

  // Árbol ya normalizado por el editor.
  if (typeof json.tipo === 'string') return normalizarNodo(json)

  // Formato del Apps Script.
  if (Array.isArray(json.and)) return agrupar('and', json.and.map(condicionDesdeJson))
  if (Array.isArray(json.or)) return agrupar('or', json.or.map(condicionDesdeJson))
  if (json.anio_completo !== undefined && json.anio_completo !== null) {
    const anio = normalizarAnio(json.anio_completo)
    return anio === null ? null : { tipo: 'anio', anio }
  }

  return null
}

/**
 * Convierte un árbol normalizado de vuelta al formato del JSON del plan.
 *
 * - `materia` → `"663-0.1"`
 * - `anio` → `{ anio_completo: N }`
 * - `and`/`or` con 1 hijo → se serializa el hijo (grupo colapsado)
 * - `and`/`or` con más de 1 hijo → `{ and: [...] }` / `{ or: [...] }`
 * - `and`/`or` vacío → `null` (se reporta en `validarCondicion`)
 *
 * @param {Object|null} condicion
 * @returns {*} condición en formato del plan o `null`
 */
export function condicionAJson(condicion) {
  if (!condicion || typeof condicion !== 'object') return null

  switch (condicion.tipo) {
    case 'materia': {
      const codigo = String(condicion.codigo ?? '').trim()
      return codigo ? codigo : null
    }
    case 'anio':
      return Number.isInteger(condicion.anio) ? { anio_completo: condicion.anio } : null
    case 'and':
    case 'or': {
      const hijos = (Array.isArray(condicion.hijos) ? condicion.hijos : [])
        .map(condicionAJson)
        .filter((hijo) => hijo !== null)
      if (hijos.length === 0) return null
      if (hijos.length === 1) return hijos[0]
      return { [condicion.tipo]: hijos }
    }
    default:
      return null
  }
}

/**
 * Arma el texto legible de un nodo del árbol.
 * Devuelve `''` para nodos incompletos o desconocidos, y envuelve entre
 * paréntesis los grupos cuyo operador difiere del grupo padre.
 *
 * @param {Object} nodo
 * @param {'and'|'or'|null} tipoPadre
 * @param {{ nombres?: Object<string, string>, usarNombres?: boolean }} opciones
 * @returns {string}
 */
function textoDeNodo(nodo, tipoPadre, opciones) {
  if (!nodo || typeof nodo !== 'object') return ''

  switch (nodo.tipo) {
    case 'materia': {
      const codigo = String(nodo.codigo ?? '').trim()
      if (!codigo) return ''
      const nombre = opciones.usarNombres ? String(opciones.nombres?.[codigo] ?? '').trim() : ''
      return nombre || codigo
    }
    case 'anio':
      return Number.isInteger(nodo.anio) ? `Año ${nodo.anio} completo` : ''
    case 'and':
    case 'or': {
      const hijos = Array.isArray(nodo.hijos) ? nodo.hijos : []
      const separador = nodo.tipo === 'and' ? ' y ' : ' o '
      const texto = hijos
        .map((hijo) => textoDeNodo(hijo, nodo.tipo, opciones))
        .filter((parte) => parte !== '')
        .join(separador)
      if (!texto) return ''
      return tipoPadre && tipoPadre !== nodo.tipo ? `(${texto})` : texto
    }
    default:
      return ''
  }
}

/**
 * Genera un resumen legible de una condición de correlatividad.
 *
 * - `{ tipo: 'materia', codigo: '663-0.1' }` → `'663-0.1'`
 * - `{ tipo: 'and', hijos: [A, B] }` → `'663-0.1 y 663-0.2'`
 * - `{ tipo: 'or', hijos: [A, B] }` → `'663-0.1 o 663-0.2'`
 * - `{ tipo: 'anio', anio: 1 }` → `'Año 1 completo'`
 * - `null` → `'Sin correlativas'`
 *
 * Con `{ nombres, usarNombres: true }` reemplaza el código por el nombre de la
 * materia cuando existe en el mapa `nombres`; si falta, cae al código.
 *
 * @param {Object|null} condicion
 * @param {{ nombres?: Object<string, string>, usarNombres?: boolean }} [opciones]
 * @returns {string}
 */
export function condicionATexto(condicion, opciones = {}) {
  if (!condicion || typeof condicion !== 'object') return 'Sin correlativas'
  const config = {
    nombres: opciones?.nombres ?? {},
    usarNombres: opciones?.usarNombres === true
  }
  return textoDeNodo(condicion, null, config) || 'Sin correlativas'
}

/**
 * Recorre el árbol en profundidad y ejecuta `visitante` con cada nodo.
 * @param {Object|null} condicion
 * @param {(nodo: Object) => void} visitante
 * @returns {void}
 */
export function recorrerCondicion(condicion, visitante) {
  if (!condicion || typeof condicion !== 'object') return
  if (typeof visitante === 'function') visitante(condicion)

  if ((condicion.tipo === 'and' || condicion.tipo === 'or') && Array.isArray(condicion.hijos)) {
    for (const hijo of condicion.hijos) recorrerCondicion(hijo, visitante)
  }
}

/**
 * Devuelve los códigos de materia referenciados por una condición.
 * @param {Object|null} condicion
 * @returns {string[]}
 */
export function codigosDeCondicion(condicion) {
  const codigos = []
  recorrerCondicion(condicion, (nodo) => {
    if (nodo.tipo === 'materia') {
      const codigo = String(nodo.codigo ?? '').trim()
      if (codigo) codigos.push(codigo)
    }
  })
  return codigos
}

/**
 * Indica si un valor pertenece a una colección (array o Set).
 * @param {string[]|Set<string>} coleccion
 * @param {string} valor
 * @returns {boolean}
 */
function pertenece(coleccion, valor) {
  if (!coleccion) return true
  if (coleccion instanceof Set) return coleccion.has(valor)
  return Array.isArray(coleccion) ? coleccion.includes(valor) : true
}

/**
 * Valida una condición de correlatividad.
 *
 * Reporta:
 * - grupos `and`/`or` sin hijos;
 * - materias sin código;
 * - materias que no existen en el plan (`codigosValidos`);
 * - auto-referencia (`autoReferencia`);
 * - "año completo" sin año válido o sin materias de ese año (`aniosValidos`).
 *
 * Una condición `null` es válida (no hay correlatividad).
 *
 * @param {Object|null} condicion
 * @param {{
 *   codigosValidos?: string[]|Set<string>,
 *   aniosValidos?: number[],
 *   autoReferencia?: string
 * }} [opciones]
 * @returns {{ exito: boolean, errores: string[] }}
 */
export function validarCondicion(condicion, opciones = {}) {
  const errores = []

  if (condicion === null || condicion === undefined) {
    return { exito: true, errores }
  }

  if (typeof condicion !== 'object' || !TIPOS_CONDICION.includes(condicion.tipo)) {
    return { exito: false, errores: ['La condición no tiene un tipo válido.'] }
  }

  const { codigosValidos, aniosValidos } = opciones
  const autoReferencia =
    opciones.autoReferencia !== undefined && opciones.autoReferencia !== null
      ? String(opciones.autoReferencia).trim()
      : null

  recorrerCondicion(condicion, (nodo) => {
    if (nodo.tipo === 'and' || nodo.tipo === 'or') {
      if (!Array.isArray(nodo.hijos) || nodo.hijos.length === 0) {
        errores.push(`El grupo "${nodo.tipo.toUpperCase()}" no tiene condiciones.`)
      }
      return
    }

    if (nodo.tipo === 'materia') {
      const codigo = String(nodo.codigo ?? '').trim()
      if (!codigo) {
        errores.push('Hay una materia sin código en una condición.')
        return
      }
      if (autoReferencia && codigo === autoReferencia) {
        errores.push(`La materia "${codigo}" no puede depender de sí misma.`)
      }
      if (!pertenece(codigosValidos, codigo)) {
        errores.push(`La materia "${codigo}" no existe en el plan.`)
      }
      return
    }

    if (nodo.tipo === 'anio') {
      if (!Number.isInteger(nodo.anio)) {
        errores.push('Un "año completo" no tiene un año válido.')
        return
      }
      if (Array.isArray(aniosValidos) && !aniosValidos.includes(nodo.anio)) {
        errores.push(`No hay materias de año ${nodo.anio} para el "año completo".`)
      }
    }
  })

  return { exito: errores.length === 0, errores }
}
