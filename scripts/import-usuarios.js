import 'dotenv/config'
import { readFileSync } from 'fs'
import { parse } from 'csv-parse/sync'

// ✅ Reutilizamos tu firebaseNode.js
import { db } from './firebaseNode.js'

// Leer el archivo CSV (los datos NO se versionan: ver data/README.md)
const csv = readFileSync('./data/usuarios.csv', 'utf8')
const records = parse(csv, { columns: true, skip_empty_lines: true })

// Contador para el seguimiento
let contador = 0
let errores = 0

// Cargar el catálogo de planes desde planes.json
const planesJson = JSON.parse(readFileSync('./public/planes/planes.json', 'utf8'))
const nombresDePlanes = {}
if (Array.isArray(planesJson.planes)) {
  planesJson.planes.forEach((plan) => {
    if (plan?.codigo) nombresDePlanes[plan.codigo] = plan.nombre || plan.codigo
  })
} else {
  Object.assign(nombresDePlanes, planesJson.planes || {})
}

// Función para parsear campos que pueden ser arrays (reutilizada de validacionUsuarios.js)
function parsearArray(valor) {
  if (!valor || valor.trim() === '') {
    return []
  }

  // Si ya es un array, devolverlo
  if (Array.isArray(valor)) {
    return valor
  }

  const valorTrim = valor.trim()

  // Intentar parsear como JSON array
  try {
    const parsed = JSON.parse(valorTrim)
    if (Array.isArray(parsed)) {
      return parsed
    }
    return [parsed]
  } catch (e) {
    // Si no se puede parsear como JSON, tratar como string separado por comas
    if (valorTrim.includes(',')) {
      return valorTrim.split(',').map((item) => item.trim())
    }
    // Si es un solo valor, devolverlo como array de un elemento
    return [valorTrim]
  }
}

// Función para normalizar un email
function normalizarEmail(email) {
  return String(email).trim().toLowerCase()
}

// Función para normalizar un DNI
function normalizarDni(dni) {
  return String(dni).replace(/[^\d]/g, '')
}

// Función para normalizar roles
function normalizarRoles(valor) {
  const array = Array.isArray(valor) ? valor : String(valor).split(',').map((r) => r.trim())
  return [...new Set(array.map((r) => r.toLowerCase()))]
}

// Función para resolver un código de plan
function resolverCodigoPlan(valor) {
  if (!valor) return null
  const str = String(valor).trim()

  // 1) Si ya es un código canónico (existe en el catálogo)
  if (['662', '708'].includes(str)) {
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

// Función para validar los datos del usuario
function validarUsuario(usuario) {
  const errores = []

  // Validar campos requeridos
  if (!usuario.dni || usuario.dni.trim() === '') {
    errores.push('El DNI es requerido')
  }

  if (!usuario.nombre || usuario.nombre.trim() === '') {
    errores.push('El nombre es requerido')
  }

  if (!usuario.apellido || usuario.apellido.trim() === '') {
    errores.push('El apellido es requerido')
  }

  if (!usuario.email || usuario.email.trim() === '') {
    errores.push('El email es requerido')
  }

  // Validar formato de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (usuario.email && !emailRegex.test(usuario.email)) {
    errores.push('El email tiene un formato inválido')
  }

  // Parsear roles
  let roles = parsearArray(usuario.roles)

  // Normalizar roles a minúsculas
  roles = roles.map((r) => typeof r === 'string' ? r.toLowerCase() : String(r).toLowerCase())

  // Validar que los roles sean válidos
  const rolesValidos = ['estudiante', 'docente', 'bedel', 'coordinacion', 'admin']
  const rolesInvalidos = roles.filter((r) => !rolesValidos.includes(r))
  if (rolesInvalidos.length > 0) {
    errores.push(`Roles inválidos: ${rolesInvalidos.join(', ')}`)
  }

  // Parsear planes
  let planes = parsearArray(usuario.plan)

  // Validar plan según roles
  const esEstudiante = roles.includes('estudiante')
  if (esEstudiante && (!planes || planes.length === 0)) {
    errores.push('Los estudiantes deben tener al menos un plan asignado')
  }

  if (!esEstudiante && planes && planes.length > 0) {
    console.warn(`Advertencia: El usuario ${usuario.email} no es estudiante pero tiene planes asignados`)
  }

  // Validar que los códigos de plan sean válidos si se proporcionan
  if (planes && planes.length > 0) {
    for (const planCodigo of planes) {
      if (planCodigo && planCodigo.trim() !== '') {
        const codigo = planCodigo.trim()
        const res = resolverCodigoPlan(codigo)
        if (!res) {
          errores.push(`Código de plan inválido: ${codigo}`)
        } else if (!['662', '708'].includes(res.codigo)) {
          errores.push(`El plan "${codigo}" no está disponible (no tiene JSON revisado)`)
        }
      }
    }
  }

  return {
    errores,
    roles,
    planes,
    esValido: errores.length === 0
  }
}

console.log('Iniciando importación de usuarios...')

for (const row of records) {
  try {
    // Validar usuario
    const validacion = validarUsuario(row)

    if (!validacion.esValido) {
      console.error(`❌ Error en usuario ${row.email || 'desconocido'}:`, validacion.errores.join(', '))
      errores++
      continue
    }

    // Formatear los planes con los nombres completos
    let planesFormateados = []
    if (validacion.planes && validacion.planes.length > 0) {
      planesFormateados = validacion.planes.map((planCodigo) => {
        if (!planCodigo || planCodigo.trim() === '') {
          return ''
        }

        const codigo = planCodigo.trim()
        const res = resolverCodigoPlan(codigo)
        if (!res) {
          return ''
        }

        return res.nombre || `${codigo} Profesorado de Música`
      }).filter((plan) => plan !== '') // Filtrar planes vacíos
    }

    // Crear documento de usuario con el email como ID
    const email = normalizarEmail(row.email)

    // Usar el email como ID del documento
    await db.collection('usuarios').doc(email).set({
      personaId: crypto.randomUUID(),
      dni: normalizarDni(row.dni.trim()),
      nombre: row.nombre.trim(),
      apellido: row.apellido.trim(),
      email: email,
      roles: validacion.roles, // Roles ya validados y normalizados
      planes: planesFormateados, // Planes formateados como array (v1)
      estadoRegistro: 'pendiente_registro', // Estado inicial para registro
      estadoUsuario: 'activo',
      numeroLegajo: null,
      creadoEl: new Date().toISOString(),
      actualizadoEn: new Date().toISOString()
    })

    // Crear legajo
    await db.collection('legajos').doc(email).set({
      personaId: email,
      numeroLegajo: null,
      usuarioDocId: email,
      dni: normalizarDni(row.dni.trim()),
      nombre: row.nombre.trim(),
      apellido: row.apellido.trim(),
      fechaNacimiento: null,
      domicilios: [],
      telefonos: [],
      datosAdministrativos: {},
      documentacion: [],
      creadoEl: new Date().toISOString(),
      actualizadoEn: new Date().toISOString(),
      actualizadoPor: null
    })

    contador++
    console.log(`✅ Usuario ${row.email} importado correctamente con ${planesFormateados.length} plan(es)`)

  } catch (error) {
    console.error(`❌ Error al importar usuario ${row.email}:`, error.message)
    if (error.code === 'permission-denied') {
      console.error('   Esto indica un problema de permisos. Verifica que las credenciales tengan acceso de escritura a Firestore.')
    }
    errores++
  }
}

console.log(`\n🏁 Importación finalizada. ${contador} usuarios importados correctamente, ${errores} errores.`)
if (errores > 0) {
    console.log('⚠️  Revisa los errores e intenta corregirlos antes de continuar.')
    process.exit(1)
}