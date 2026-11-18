// src/utils/requisitos.js
//
// Utilidades puras para leer los requisitos de un plan, calcular el avance y
// resolver los parámetros académicos. No acceden a Vue, Firestore ni red.
//
// El plan puede venir del JSON crudo de `public/planes/{codigo}.json` o de
// `normalizarPlanJson()`. En ambos casos se leen:
//
//   plan.materias    → mapa u array de materias
//   plan.requisitos  → grupos de obligatorios, conmutables y optativos
//   plan.parametros  → overrides de los parámetros globales
//
// El avance se mide en requisitos; los espacios son diagnóstico. Un plan sin
// `requisitos` no se interpreta como “todas las materias obligatorias”: se
// devuelve `valido: false` para que la UI lo reporte.

import PARAMETROS_ACADEMICOS from '../config/parametrosAcademicos.json'
import { condicionDesdeJson } from './condiciones.js'
import { anioDeMateria } from './planes.js'

export { PARAMETROS_ACADEMICOS }

/** Tipos de requisito válidos. El tipo es explícito, no se deriva de la cantidad. */
export const TIPOS_REQUISITO = Object.freeze(['obligatorio', 'conmutable', 'optativo'])

/** Secciones que un plan puede sobreescribir de los parámetros globales. */
const SECCIONES_PARAMETROS = Object.freeze(['cursada', 'plan', 'examen', 'alertas'])

/** Esquema mínimo para validar los overrides de un plan. */
const ESQUEMA_PARAMETROS = Object.freeze({
  cursada: {
    vigenciaRegularAnios: { tipo: 'entero', min: 1 },
    notaAprobacion: { tipo: 'numero|null', min: 0 },
    notaMinimaPromocion: { tipo: 'numero|null', min: 0 }
  },
  plan: {
    aniosVencimiento: { tipo: 'entero', min: 1 },
    umbralPorVencerMeses: { tipo: 'entero|null', min: 0 }
  },
  examen: {
    vocalesTribunal: { tipo: 'entero', min: 0 }
  },
  alertas: {
    diasAvisoVencimientoCursada: { tipo: 'entero|null', min: 0 }
  }
})

/**
 * Indica si un valor es un objeto plano (no un array ni null).
 * @param {*} valor
 * @returns {boolean}
 */
function esObjeto(valor) {
  return valor !== null && typeof valor === 'object' && !Array.isArray(valor)
}

/**
 * Convierte un valor a string recortado. Devuelve `''` para null/undefined.
 * @param {*} valor
 * @returns {string}
 */
function texto(valor) {
  if (valor === null || valor === undefined) return ''
  return String(valor).trim()
}

/**
 * Convierte un año a entero. Devuelve `null` si no es reconocible.
 * @param {string|number} valor
 * @returns {number|null}
 */
function normalizarAnio(valor) {
  if (valor === null || valor === undefined || valor === '') return null
  const numero = Number.parseInt(String(valor), 10)
  return Number.isNaN(numero) ? null : numero
}

/**
 * Normaliza una lista de códigos a un array de strings no vacíos.
 * Acepta un string suelto o un array.
 * @param {string|string[]|null|undefined} valor
 * @returns {string[]}
 */
function normalizarCodigos(valor) {
  if (Array.isArray(valor)) {
    return valor.map((item) => texto(item)).filter(Boolean)
  }
  const codigo = texto(valor)
  return codigo ? [codigo] : []
}

/**
 * Obtiene el código de una materia acreditada, venga como string o como objeto.
 * Acepta `{ codigo }`, `{ materiaId }` o `{ id }`.
 * @param {*} item
 * @returns {string}
 */
function codigoDeAcreditada(item) {
  if (typeof item === 'string') return texto(item)
  if (!esObjeto(item)) return ''
  return texto(item.codigo ?? item.materiaId ?? item.id)
}

/**
 * Convierte el conjunto de materias acreditadas en un Set de códigos.
 * Acepta strings, objetos o un Set.
 * @param {string[]|Object[]|Set<string>|null|undefined} acreditadas
 * @returns {Set<string>}
 */
function normalizarAcreditadas(acreditadas) {
  const codigos = new Set()
  if (acreditadas instanceof Set) {
    for (const item of acreditadas) {
      const codigo = codigoDeAcreditada(item)
      if (codigo) codigos.add(codigo)
    }
    return codigos
  }
  if (!Array.isArray(acreditadas)) return codigos
  for (const item of acreditadas) {
    const codigo = codigoDeAcreditada(item)
    if (codigo) codigos.add(codigo)
  }
  return codigos
}

/**
 * Normaliza `plan.materias` a un mapa `codigo → materia`.
 * Acepta el formato actual (objeto) y el legacy (array con `PCod`/`Cod`).
 * @param {Object|null} plan
 * @returns {Record<string, Object>}
 */
function mapaMaterias(plan) {
  const crudas = plan?.materias
  const mapa = {}

  if (Array.isArray(crudas)) {
    for (const item of crudas) {
      const id = texto(item?.id ?? item?.PCod ?? item?.Cod)
      if (!id) continue
      mapa[id] = {
        id,
        anio: normalizarAnio(item?.anio) ?? anioDeMateria(id),
        nombre: texto(item?.nombre ?? item?.Materia) || id,
        correlativas:
          item?.correlativas ?? {
            cursar: item?.CodC ?? null,
            aprobar: item?.CodA ?? null
          },
        equivale_a: item?.equivale_a ?? null
      }
    }
    return mapa
  }

  if (!esObjeto(crudas)) return mapa

  for (const [id, item] of Object.entries(crudas)) {
    const codigo = texto(item?.id ?? id)
    if (!codigo) continue
    mapa[codigo] = {
      id: codigo,
      anio: normalizarAnio(item?.anio) ?? anioDeMateria(codigo),
      nombre: texto(item?.nombre) || codigo,
      correlativas: item?.correlativas ?? null,
      equivale_a: item?.equivale_a ?? null
    }
  }
  return mapa
}

/**
 * Devuelve los códigos de `equivale_a` de una materia.
 * La relación es dirigida y no se encadena.
 * @param {Object|null|undefined} materia
 * @returns {string[]}
 */
function equivalenciasDe(materia) {
  return normalizarCodigos(materia?.equivale_a)
}

/**
 * Indica si una materia está acreditada por su código o por una equivalencia
 * declarada en la propia materia destino.
 * @param {string} codigo
 * @param {Object|null} materia
 * @param {Set<string>} acreditadas
 * @returns {boolean}
 */
function materiaAcreditada(codigo, materia, acreditadas) {
  if (!codigo) return false
  if (acreditadas.has(codigo)) return true
  return equivalenciasDe(materia).some((equivalencia) => acreditadas.has(equivalencia))
}

/**
 * Detecta códigos que pueden cumplir dos requisitos a la vez.
 *
 * Un candidato se acredita por su código o por alguna de sus `equivale_a`. Si
 * esa equivalencia es candidata de otro requisito, acreditar una sola materia
 * suma en ambos. No es un error de formato: se informa como advertencia porque
 * el dato real puede ser legítimo (equivalencias con el plan madre).
 *
 * Solo mira el plan: no depende de datos globales ni de `acreditadas`.
 *
 * @param {Object[]} requisitos requisitos crudos del plan
 * @param {Record<string, Object>} materias mapa `codigo → materia`
 * @returns {string[]} advertencias, sin repetir pares
 */
function advertenciasDeDobleComputo(requisitos, materias) {
  const requisitoDeCandidato = new Map()
  for (const requisito of requisitos) {
    const id = texto(requisito?.id) || 'requisito sin id'
    for (const codigo of normalizarCodigos(requisito?.candidatos)) {
      if (!requisitoDeCandidato.has(codigo)) requisitoDeCandidato.set(codigo, id)
    }
  }

  const advertencias = []
  const vistas = new Set()
  for (const requisito of requisitos) {
    const id = texto(requisito?.id) || 'requisito sin id'
    for (const codigo of normalizarCodigos(requisito?.candidatos)) {
      for (const equivalencia of equivalenciasDe(materias[codigo])) {
        const idDestino = requisitoDeCandidato.get(equivalencia)
        if (!idDestino || idDestino === id) continue

        const clave = `${id}|${codigo}|${equivalencia}`
        if (vistas.has(clave)) continue
        vistas.add(clave)

        advertencias.push(
          `"${codigo}" (requisito "${id}") equivale a "${equivalencia}", candidato de "${idDestino}": acreditar una puede cumplir ambos requisitos.`
        )
      }
    }
  }
  return advertencias
}

/**
 * Valida los requisitos de un plan.
 *
 * Revisa ids, años, tipos, mínimos, candidatos, partición de materias y
 * auto-equivalencias. Por defecto la ausencia de `requisitos` es un error; el
 * editor puede pasar `{ permitirAusente: true }` para tratarla como advertencia.
 *
 * @param {Object} plan
 * @param {{ permitirAusente?: boolean }} [opciones]
 * @returns {{ exito: boolean, errores: string[], advertencias: string[] }}
 */
export function validarRequisitos(plan, opciones = {}) {
  const errores = []
  const advertencias = []
  const requisitos = plan?.requisitos

  if (!Array.isArray(requisitos) || requisitos.length === 0) {
    const mensaje = 'El plan no tiene requisitos.'
    if (opciones.permitirAusente === true) advertencias.push(mensaje)
    else errores.push(mensaje)
    return { exito: errores.length === 0, errores, advertencias }
  }

  const materias = mapaMaterias(plan)
  const ids = new Set()
  const candidatosVistos = new Set()

  requisitos.forEach((requisito, indice) => {
    if (!esObjeto(requisito)) {
      errores.push(`El requisito #${indice + 1} no es un objeto.`)
      return
    }

    const id = texto(requisito.id)
    const etiqueta = id || `requisito #${indice + 1}`

    if (!id) errores.push(`${etiqueta}: falta el id.`)
    else if (ids.has(id)) errores.push(`El id "${id}" está repetido.`)
    else ids.add(id)

    const anio =
      requisito.anio === null || requisito.anio === undefined
        ? null
        : normalizarAnio(requisito.anio)
    if (requisito.anio !== null && requisito.anio !== undefined && anio === null) {
      errores.push(`${etiqueta}: el año no es válido.`)
    }
    if (anio !== null && anio < 0) {
      errores.push(`${etiqueta}: el año no puede ser negativo.`)
    }

    if (!TIPOS_REQUISITO.includes(requisito.tipo)) {
      errores.push(`${etiqueta}: el tipo "${requisito.tipo}" no es válido.`)
    }

    if (
      requisito.etiqueta !== undefined &&
      requisito.etiqueta !== null &&
      typeof requisito.etiqueta !== 'string'
    ) {
      errores.push(`${etiqueta}: la etiqueta debe ser texto.`)
    }

    const candidatos = normalizarCodigos(requisito.candidatos)
    if (!Array.isArray(requisito.candidatos) || candidatos.length === 0) {
      errores.push(`${etiqueta}: no tiene candidatos.`)
    }
    if (new Set(candidatos).size !== candidatos.length) {
      errores.push(`${etiqueta}: tiene candidatos repetidos.`)
    }

    const minimo = Number.isInteger(requisito.minimo) ? requisito.minimo : null
    if (minimo === null || minimo <= 0) {
      errores.push(`${etiqueta}: el mínimo debe ser un entero mayor que 0.`)
    }
    if (minimo !== null && candidatos.length > 0 && minimo > candidatos.length) {
      errores.push(
        `${etiqueta}: el mínimo (${minimo}) supera los candidatos (${candidatos.length}).`
      )
    }

    if (TIPOS_REQUISITO.includes(requisito.tipo)) {
      if (requisito.tipo === 'obligatorio' && (candidatos.length !== 1 || minimo !== 1)) {
        errores.push(`${etiqueta}: un obligatorio debe tener 1 candidato y mínimo 1.`)
      }
      if (
        requisito.tipo === 'conmutable' &&
        (candidatos.length < 2 || minimo !== 1)
      ) {
        errores.push(
          `${etiqueta}: un conmutable debe tener al menos 2 candidatos y mínimo 1.`
        )
      }
      if (
        requisito.tipo === 'optativo' &&
        (candidatos.length < 2 ||
          minimo === null ||
          minimo < 1 ||
          minimo >= candidatos.length)
      ) {
        errores.push(
          `${etiqueta}: un optativo debe tener al menos 2 candidatos y un mínimo entre 1 y candidatos - 1.`
        )
      }
    }

    for (const codigo of candidatos) {
      if (candidatosVistos.has(codigo)) {
        errores.push(`La materia "${codigo}" pertenece a más de un requisito.`)
      } else {
        candidatosVistos.add(codigo)
      }

      const materia = materias[codigo]
      if (!materia) {
        errores.push(`La materia "${codigo}" no existe en el plan.`)
        continue
      }
      if (anio !== null && materia.anio !== anio) {
        errores.push(`La materia "${codigo}" no pertenece al año ${anio}.`)
      }
      if (equivalenciasDe(materia).includes(codigo)) {
        errores.push(`La materia "${codigo}" no puede ser equivalente a sí misma.`)
      }
    }
  })

  for (const codigo of Object.keys(materias)) {
    if (!candidatosVistos.has(codigo)) {
      errores.push(`La materia "${codigo}" no pertenece a ningún requisito.`)
    }
  }

  return { exito: errores.length === 0, errores, advertencias }
}

/**
 * Calcula la acreditación de una materia atribuible a cada requisito.
 * @param {Object[]} requisitos
 * @param {Record<string, Object>} materias
 * @param {Set<string>} acreditadas
 * @returns {string[]}
 */
function acreditadasSinRequisito(requisitos, materias, acreditadas) {
  const declaradas = new Set()
  for (const requisito of requisitos) {
    for (const codigo of normalizarCodigos(requisito?.candidatos)) {
      declaradas.add(codigo)
      for (const equivalencia of equivalenciasDe(materias[codigo])) {
        declaradas.add(equivalencia)
      }
    }
  }
  return [...acreditadas].filter((codigo) => !declaradas.has(codigo)).sort()
}

/**
 * Calcula el avance de un plan sobre sus requisitos.
 *
 * `acreditadas` puede ser una lista de códigos (`["662-0.1"]`) o de objetos
 * (`[{ codigo, planCodigo?, fecha? }]`). Para el cálculo solo importa `codigo`.
 *
 * La medida oficial es `total.avance = requisitos cumplidos / requisitos`.
 * Los espacios son diagnóstico: `espaciosRequeridos`, `espaciosCumplidos` y
 * `sobrantes` no reemplazan al avance.
 *
 * @param {Object} plan
 * @param {string[]|Object[]} acreditadas
 * @returns {{
 *   valido: boolean,
 *   errores: string[],
 *   advertencias: string[],
 *   requisitos: Object[],
 *   anios: Object[],
 *   total: Object
 * }}
 */
export function calcularAvancePlan(plan, acreditadas) {
  const validacion = validarRequisitos(plan)
  const { errores } = validacion
  const materias = mapaMaterias(plan)
  const codigosAcreditados = normalizarAcreditadas(acreditadas)
  const requisitosRaw = Array.isArray(plan?.requisitos) ? plan.requisitos : []

  const requisitos = requisitosRaw.map((requisito) => {
    const candidatos = normalizarCodigos(requisito?.candidatos)
    const minimo = Number.isInteger(requisito?.minimo) ? requisito.minimo : 0
    const acreditados = candidatos.filter((codigo) =>
      materiaAcreditada(codigo, materias[codigo], codigosAcreditados)
    )
    const cumplidos = Math.min(acreditados.length, minimo)
    const anio =
      requisito?.anio === null || requisito?.anio === undefined
        ? null
        : normalizarAnio(requisito.anio)

    return {
      id: texto(requisito?.id),
      etiqueta: texto(requisito?.etiqueta) || null,
      anio,
      tipo: requisito?.tipo ?? null,
      minimo,
      candidatos,
      acreditados: acreditados.slice(0, minimo),
      cumplidos,
      faltan: Math.max(0, minimo - acreditados.length),
      estado: minimo > 0 && acreditados.length >= minimo ? 'cumplido' : 'pendiente',
      sobrantes: acreditados.slice(minimo)
    }
  })

  const porAnio = new Map()
  for (const requisito of requisitos) {
    if (requisito.anio === null || requisito.anio === undefined) continue
    if (!porAnio.has(requisito.anio)) porAnio.set(requisito.anio, [])
    porAnio.get(requisito.anio).push(requisito)
  }

  const anios = [...porAnio.entries()]
    .sort(([a], [b]) => a - b)
    .map(([anio, requisitosDelAnio]) => ({
      anio,
      requisitos: requisitosDelAnio.length,
      cumplidos: requisitosDelAnio.filter((requisito) => requisito.estado === 'cumplido')
        .length,
      completo: requisitosDelAnio.every((requisito) => requisito.estado === 'cumplido')
    }))

  const cumplidos = requisitos.filter((requisito) => requisito.estado === 'cumplido').length

  const total = {
    requisitos: requisitos.length,
    cumplidos,
    pendientes: requisitos.length - cumplidos,
    avance: requisitos.length > 0 ? cumplidos / requisitos.length : 0,
    espaciosRequeridos: requisitos.reduce((suma, requisito) => suma + requisito.minimo, 0),
    espaciosCumplidos: requisitos.reduce(
      (suma, requisito) => suma + requisito.cumplidos,
      0
    ),
    sobrantes: requisitos.reduce(
      (suma, requisito) => suma + requisito.sobrantes.length,
      0
    ),
    acreditadasSinRequisito: acreditadasSinRequisito(
      requisitosRaw,
      materias,
      codigosAcreditados
    )
  }

  return {
    valido: errores.length === 0,
    errores,
    advertencias: [
      ...validacion.advertencias,
      ...advertenciasDeDobleComputo(requisitosRaw, materias)
    ],
    requisitos,
    anios,
    total
  }
}

/**
 * Evalúa el “año completo” de un plan.
 *
 * Con `requisitos`, exige todos los requisitos del año. Sin `requisitos`,
 * conserva el significado legacy: todas las materias de ese año acreditadas.
 *
 * @param {Object} plan
 * @param {number|string} anio
 * @param {string[]|Object[]} acreditadas
 * @returns {boolean}
 */
export function anioCompleto(plan, anio, acreditadas) {
  const numero = normalizarAnio(anio)
  if (numero === null || numero < 0) return false

  const requisitos = Array.isArray(plan?.requisitos) ? plan.requisitos : []
  if (requisitos.length === 0) {
    const materias = mapaMaterias(plan)
    const set = normalizarAcreditadas(acreditadas)
    const delAnio = Object.values(materias).filter((materia) => materia.anio === numero)
    if (delAnio.length === 0) return false
    return delAnio.every((materia) => materiaAcreditada(materia.id, materia, set))
  }

  const avance = calcularAvancePlan(plan, acreditadas)
  const fila = avance.anios.find((item) => item.anio === numero)
  return Boolean(fila?.completo)
}

/**
 * Evalúa recursivamente una condición de correlatividad.
 * Los nodos `materia` se resuelven con el conjunto de acreditadas (incluyendo
 * `equivale_a`) y los nodos `anio` con `anioCompleto()`.
 *
 * @param {*} condicion condición cruda o árbol normalizado
 * @param {{ plan?: Object, acreditadas?: string[]|Object[] }} [contexto]
 * @returns {boolean}
 */
export function evaluarCondicion(condicion, contexto = {}) {
  const plan = contexto.plan ?? null
  const materias = mapaMaterias(plan)
  const acreditadas = normalizarAcreditadas(contexto.acreditadas)
  const arbol = condicionDesdeJson(condicion)

  function evaluarNodo(nodo) {
    if (!nodo) return true
    switch (nodo.tipo) {
      case 'materia':
        return materiaAcreditada(nodo.codigo, materias[nodo.codigo], acreditadas)
      case 'and':
        return (
          Array.isArray(nodo.hijos) &&
          nodo.hijos.length > 0 &&
          nodo.hijos.every((hijo) => evaluarNodo(hijo))
        )
      case 'or':
        return Array.isArray(nodo.hijos) && nodo.hijos.some((hijo) => evaluarNodo(hijo))
      case 'anio':
        return anioCompleto(plan, nodo.anio, acreditadas)
      default:
        return false
    }
  }

  return evaluarNodo(arbol)
}

/**
 * Devuelve los espacios que se pueden ofrecer al estudiante.
 *
 * Es una vista derivada: no se guarda. Solo incluye candidatos de requisitos
 * pendientes, no acreditados y con `correlativas.cursar` cumplidas. Si el plan
 * no tiene requisitos válidos, devuelve `[]`.
 *
 * @param {Object} plan
 * @param {string[]|Object[]} acreditadas
 * @returns {Array<{
 *   codigo: string,
 *   nombre: string,
 *   anio: number|null,
 *   requisitoId: string,
 *   tipo: string,
 *   etiqueta: string|null
 * }>}
 */
export function espaciosDisponibles(plan, acreditadas) {
  const avance = calcularAvancePlan(plan, acreditadas)
  if (!avance.valido) return []

  const materias = mapaMaterias(plan)
  const set = normalizarAcreditadas(acreditadas)
  const espacios = []
  const vistos = new Set()

  for (const requisito of avance.requisitos) {
    if (requisito.estado === 'cumplido') continue

    for (const codigo of requisito.candidatos) {
      if (vistos.has(codigo)) continue
      if (materiaAcreditada(codigo, materias[codigo], set)) continue

      const materia = materias[codigo]
      if (!materia) continue
      if (!evaluarCondicion(materia.correlativas?.cursar, { plan, acreditadas: set })) {
        continue
      }

      vistos.add(codigo)
      espacios.push({
        codigo,
        nombre: materia.nombre,
        anio: materia.anio,
        requisitoId: requisito.id,
        tipo: requisito.tipo,
        etiqueta: requisito.etiqueta
      })
    }
  }

  return espacios
}

/**
 * Indica si una fecha tiene el formato `AAAA-MM-DD`.
 * @param {*} valor
 * @returns {boolean}
 */
function esFecha(valor) {
  return typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor)
}

/**
 * Valida un valor contra una regla del esquema de parámetros.
 * @param {*} valor
 * @param {{ tipo: string, min: number }} regla
 * @returns {string|null} mensaje de error o `null`
 */
function validarValorParametro(valor, regla) {
  if (regla.tipo === 'numero|null') {
    if (valor === null) return null
    if (typeof valor !== 'number' || !Number.isFinite(valor) || valor < regla.min) {
      return `debe ser un número mayor o igual a ${regla.min}, o null`
    }
    return null
  }
  if (regla.tipo === 'entero|null') {
    if (valor === null) return null
    if (!Number.isInteger(valor) || valor < regla.min) {
      return `debe ser un entero mayor o igual a ${regla.min}, o null`
    }
    return null
  }
  if (regla.tipo === 'entero') {
    if (!Number.isInteger(valor) || valor < regla.min) {
      return `debe ser un entero mayor o igual a ${regla.min}`
    }
    return null
  }
  if (regla.tipo === 'numero') {
    if (typeof valor !== 'number' || !Number.isFinite(valor) || valor < regla.min) {
      return `debe ser un número mayor o igual a ${regla.min}`
    }
    return null
  }
  return null
}

/**
 * Valida los overrides de parámetros de un plan.
 *
 * Un plan sin `parametros` es válido: hereda el archivo global. Solo se permiten
 * las claves del esquema; `version` no se puede sobreescribir desde un plan.
 *
 * @param {Object|null|undefined} parametros
 * @returns {{ exito: boolean, errores: string[] }}
 */
export function validarParametrosPlan(parametros) {
  const errores = []
  if (parametros === null || parametros === undefined) {
    return { exito: true, errores }
  }
  if (!esObjeto(parametros)) {
    return { exito: false, errores: ['Los parámetros del plan deben ser un objeto.'] }
  }

  for (const clave of Object.keys(parametros)) {
    if (clave === 'vigenteDesde') continue
    if (!SECCIONES_PARAMETROS.includes(clave)) {
      errores.push(`La clave "${clave}" no es un parámetro permitido.`)
    }
  }

  if (parametros.vigenteDesde !== undefined && !esFecha(parametros.vigenteDesde)) {
    errores.push('"vigenteDesde" debe tener formato AAAA-MM-DD.')
  }

  for (const seccion of SECCIONES_PARAMETROS) {
    if (parametros[seccion] === undefined) continue
    const valores = parametros[seccion]
    if (!esObjeto(valores)) {
      errores.push(`"${seccion}" debe ser un objeto.`)
      continue
    }

    const esquema = ESQUEMA_PARAMETROS[seccion]
    for (const clave of Object.keys(valores)) {
      if (!esquema[clave]) {
        errores.push(`"${seccion}.${clave}" no es un parámetro permitido.`)
        continue
      }
      const error = validarValorParametro(valores[clave], esquema[clave])
      if (error) errores.push(`"${seccion}.${clave}" ${error}.`)
    }
  }

  return { exito: errores.length === 0, errores }
}

/**
 * Resuelve los parámetros efectivos de un plan.
 *
 * Hace un merge superficial por sección: global ← `plan.parametros`. No muta
 * ninguna de las dos entradas. `version` siempre sale del archivo global; el
 * plan solo puede declarar `vigenteDesde` y las secciones permitidas.
 *
 * @param {Object|null|undefined} plan
 * @param {Object} [global]
 * @returns {Object}
 */
export function resolverParametros(plan, global = PARAMETROS_ACADEMICOS) {
  const base = esObjeto(global) ? global : {}
  const overrides = esObjeto(plan?.parametros) ? plan.parametros : {}
  const resultado = { ...base }

  if (typeof overrides.vigenteDesde === 'string') {
    resultado.vigenteDesde = overrides.vigenteDesde
  }

  for (const seccion of SECCIONES_PARAMETROS) {
    if (!esObjeto(overrides[seccion])) continue
    const baseSeccion = esObjeto(base[seccion]) ? base[seccion] : {}
    resultado[seccion] = { ...baseSeccion, ...overrides[seccion] }
  }

  return resultado
}
