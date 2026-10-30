// src/utils/validacionUsuarios.js
//
// Validación pura y núcleo compartido para usuarios, planes y fechas.
// Usado tanto por la app (carga masiva in-app) como por el script de importación.
//
// El núcleo NO escribe en Firestore; solo valida y construye los documentos.
// El estado global (ref/computed) debe declararse a nivel de módulo (singleton), no dentro de la función factory.

import { catalogoDePlanes, esPlanDisponible } from './planes.js'

/**
 * Normaliza un email: lowercase, sin espacios, sin duplicados.
 * @param {string} email
 * @returns {string}
 */
export function normalizarEmail(email) {
  return String(email).trim().toLowerCase()
}

/**
 * Normaliza un DNI: string, sin puntos ni espacios.
 * @param {string} dni
 * @returns {string}
 */
export function normalizarDni(dni) {
  return String(dni).replace(/[^\d]/g, '')
}

/**
 * Normaliza un array de roles: lowercase, sin espacios ni duplicados.
 * @param {string|string[]} valor
 * @returns {string[]}
 */
export function normalizarRoles(valor) {
  const array = Array.isArray(valor) ? valor : String(valor).split(',').map((r) => r.trim())
  return [...new Set(array.map((r) => r.toLowerCase()))]
}

/**
 * Normaliza una fecha: string o Date → Timestamp (objeto con `seconds` y `nanoseconds`).
 * @param {string|Date} fecha
 * @returns {{ seconds: number, nanoseconds: number }}
 */
export function normalizarFecha(fecha) {
  const date = new Date(fecha)
  if (isNaN(date.getTime())) {
    throw new Error(`Fecha inválida: ${fecha}`)
  }
  // Simular un Timestamp de Firestore (segundos desde epoch)
  return { seconds: Math.floor(date.getTime() / 1000), nanoseconds: (date.getTime() % 1000) * 1000000 }
}

/**
 * Resuelve un valor de plan a su código canónico y nombre desde `planes.json`.
 * Acepta:
 * - código canónico (`"662"`, `"708"`, `"662G"`)
 * - alias legacy (`"62G"` → `"662G"`)
 * - nombre completo v1 (`"662 Profesorado de Música"` → `"662"`)
 * @param {string} valor
 * @param {Record<string, string>} nombresDePlanes mapa codigo → nombre completo
 * @returns {{ codigo: string, nombre: string }|null} null si no se puede resolver
 */
export function resolverCodigoPlan(valor, nombresDePlanes) {
  if (!valor) return null
  const str = String(valor).trim()

  // 1) Si ya es un código canónico (existe en el catálogo)
  if (esPlanDisponible(str)) {
    return { codigo: str, nombre: nombresDePlanes[str] || str }
  }

  // 2) Alias legacy: "62G" → "662G"
  if (str === '62G') {
    const destino = '662G'
    return { codigo: destino, nombre: nombresDePlanes[destino] || destino }
  }

  // 3) Buscar por nombre completo (v1) en el mapa de nombres
  for (const [codigo, nombre] of Object.entries(nombresDePlanes)) {
    if (nombre.toLowerCase() === str.toLowerCase()) {
      return { codigo, nombre }
    }
  }

  // No se pudo resolver
  return null
}

/**
 * Construye un objeto de documento de usuario con el shape v2.
 * @param {Object} datos datos validados (email, dni, nombre, apellido, roles, planes, fechaInscripcion, numeroLegajo)
 * @param {string} personaId
 * @returns {Object}
 */
export function construirDocumentoUsuario(datos, personaId) {
  // Normalizar campos
  const email = normalizarEmail(datos.email)
  const dni = normalizarDni(datos.dni)
  const nombre = String(datos.nombre).trim()
  const apellido = String(datos.apellido).trim()
  const roles = normalizarRoles(datos.roles)

  // Construir mapa de planes
  const planes = {}
  for (const plan of datos.planes || []) {
    const res = resolverCodigoPlan(plan, datos.nombresDePlanes || {})
    if (!res) {
      throw new Error(`Código de plan inválido: ${plan}`)
    }
    const codigo = res.codigo
    const nombrePlan = res.nombre

    // Estado inicial por plan (E2: carga masiva = ingresante si tiene pregrado, activo si no)
    // Para el alta individual el estado lo elige el operador (fuera de alcance)
    const estado = datos.estadoPorPlan?.[codigo] || 'ingresante' // placeholder

    planes[codigo] = {
      id: codigo,
      nombre: nombrePlan,
      estado,
      fechaInscripcion: datos.fechaInscripcionPorPlan?.[codigo] || datos.fechaInscripcion,
      vigente: true,
      origen: datos.origen || 'carga_masiva',
      ultimaAcreditacion: null,
      estadoCalculadoEn: null
    }
  }

  return {
    personaId,
    dni,
    nombre,
    apellido,
    email,
    roles,
    estadoRegistro: 'pendiente_registro',
    estadoUsuario: 'activo',
    estadoUsuarioActualizadoEn: null,
    motivoEstado: '',
    planes,
    numeroLegajo: datos.numeroLegajo || null,
    creadoEl: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 },
    actualizadoEn: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 }
  }
}

/**
 * Construye un objeto de legajo digital.
 * @param {Object} datos datos validados (personaId, numeroLegajo, dni, nombre, apellido, etc.)
 * @returns {Object}
 */
export function construirLegajo(datos) {
  return {
    personaId: datos.personaId,
    numeroLegajo: datos.numeroLegajo || null,
    usuarioDocId: datos.email, // referencia informativa
    dni: datos.dni,
    nombre: datos.nombre,
    apellido: datos.apellido,
    fechaNacimiento: datos.fechaNacimiento || null,
    domicilios: datos.domicilios || [],
    telefonos: datos.telefonos || [],
    datosAdministrativos: datos.datosAdministrativos || {},
    documentacion: datos.documentacion || [],
    creadoEl: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 },
    actualizadoEn: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 },
    actualizadoPor: null
  }
}

/**
 * Valida un objeto de datos de usuario completo.
 * @param {Object} datos
 * @param {{ rolesPermitidos?: string[], catalogoPlanes?: string[] }} opciones
 * @returns {{ exito: boolean, datos?: Object, error?: any }}
 */
export function validarDatosUsuario(datos, opciones = {}) {
  const errores = []
  const advertencias = []

  // Normalizar campos
  const email = normalizarEmail(datos.email)
  const dni = normalizarDni(datos.dni)
  const nombre = String(datos.nombre).trim()
  const apellido = String(datos.apellido).trim()
  const roles = normalizarRoles(datos.roles)
  const planes = Array.isArray(datos.planes) ? datos.planes : []

  // Validar email
  if (!email) errores.push('Falta el email')
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errores.push('El email tiene un formato inválido')

  // Validar DNI
  if (!dni) errores.push('Falta el DNI')

  // Validar nombre/apellido
  if (!nombre) errores.push('Falta el nombre')
  if (!apellido) errores.push('Falta el apellido')

  // Validar roles
  if (roles.length === 0) errores.push('Debe tener al menos un rol')
  const rolesPermitidos = opciones.rolesPermitidos || ['estudiante', 'docente', 'bedel', 'coordinacion', 'admin']
  const rolesInvalidos = roles.filter((r) => !rolesPermitidos.includes(r))
  if (rolesInvalidos.length > 0) errores.push(`Roles inválidos: ${rolesInvalidos.join(', ')}`)

  // Validar planes
  const catalogoPlanes = opciones.catalogoPlanes || catalogoDePlanes()
  const planesValidados = []
  for (const plan of planes) {
    const res = resolverCodigoPlan(plan, {}) // sin nombresDePlanes para validación
    if (!res) {
      errores.push(`Código de plan inválido: ${plan}`)
      continue
    }
    const codigo = res.codigo
    if (!catalogoPlanes.includes(codigo)) {
      errores.push(`El plan "${codigo}" no está disponible (no tiene JSON revisado)`)
    } else {
      planesValidados.push(codigo)
    }
  }

  // Reglas de negocio
  const esEstudiante = roles.includes('estudiante')
  if (esEstudiante && planesValidados.length === 0) errores.push('Los estudiantes deben tener al menos un plan asignado')
  if (!esEstudiante && planesValidados.length > 0) advertencias.push('No es estudiante pero tiene planes asignados')

  // Validar fecha de inscripción
  if (!datos.fechaInscripcion) errores.push('Falta la fecha de inscripción')
  else {
    try {
      normalizarFecha(datos.fechaInscripcion)
    } catch (e) {
      errores.push(e.message)
    }
  }

  if (errores.length > 0) {
    return { exito: false, datos: null, error: { errores, advertencias } }
  }

  // Construir datos normalizados para el documento
  const datosNormalizados = {
    email,
    dni,
    nombre,
    apellido,
    roles,
    planes: planesValidados,
    fechaInscripcion: datos.fechaInscripcion,
    nombresDePlanes: {}, // se llena después con el mapa real
    estadoPorPlan: {}, // placeholder
    fechaInscripcionPorPlan: {}, // placeholder
    origen: datos.origen || 'carga_masiva',
    numeroLegajo: datos.numeroLegajo || null,
    fechaNacimiento: datos.fechaNacimiento || null,
    domicilios: datos.domicilios || [],
    telefonos: datos.telefonos || [],
    datosAdministrativos: datos.datosAdministrativos || {},
    documentacion: datos.documentacion || []
  }

  return { exito: true, datos: datosNormalizados, error: null }
}

/**
 * Valida un CSV de usuarios v2 (columnas: dni, nombre, apellido, email, plan, fecha_inscripcion, numero_legajo).
 * Devuelve un array de filas normalizadas o errores.
 * @param {Object[]} filas
 * @param {Record<string, string>} nombresDePlanes mapa codigo → nombre completo
 * @returns {{ filas: Object[], errores: Object[] }}
 */
export function validarCSVUsuarios(filas, nombresDePlanes = {}) {
  const filasValidas = []
  const errores = []

  for (let i = 0; i < filas.length; i++) {
    const fila = filas[i]
    const erroresFila = []
    const advertenciasFila = []

    // Normalizar campos
    const dni = normalizarDni(fila.dni)
    const nombre = String(fila.nombre).trim()
    const apellido = String(fila.apellido).trim()
    const email = normalizarEmail(fila.email)

    // Validar campos obligatorios
    if (!dni) erroresFila.push('Falta el DNI')
    if (!nombre) erroresFila.push('Falta el nombre')
    if (!apellido) erroresFila.push('Falta el apellido')
    if (!email) erroresFila.push('Falta el email')
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) erroresFila.push('El email tiene un formato inválido')

    // Validar roles (siempre estudiante para carga masiva in-app)
    const roles = ['estudiante']

    // Validar planes
    const planes = Array.isArray(fila.plan) ? fila.plan : []
    const planesValidados = []
    for (const plan of planes) {
      const res = resolverCodigoPlan(plan, nombresDePlanes)
      if (!res) {
        erroresFila.push(`Código de plan inválido: ${plan}`)
        continue
      }
      const codigo = res.codigo
      if (!esPlanDisponible(codigo)) {
        erroresFila.push(`El plan "${codigo}" no está disponible (no tiene JSON revisado)`)
      } else {
        planesValidados.push(codigo)
      }
    }

    // Validar fecha de inscripción
    const fechaInscripcion = fila.fecha_inscripcion
    if (!fechaInscripcion) erroresFila.push('Falta la fecha de inscripción')
    else {
      try {
        normalizarFecha(fechaInscripcion)
      } catch (e) {
        erroresFila.push(e.message)
      }
    }

    // Validar numero_legajo (opcional)
    const numeroLegajo = fila.numero_legajo || null

    if (erroresFila.length > 0) {
      errores.push({
        fila: i + 2, // +1 por índice 0 y +1 por el encabezado
        email,
        detalle: erroresFila
      })
    } else {
      filasValidas.push({
        dni,
        nombre,
        apellido,
        email,
        roles,
        planes: planesValidados,
        fechaInscripcion,
        numeroLegajo
      })
    }
  }

  return { filas: filasValidas, errores }
}