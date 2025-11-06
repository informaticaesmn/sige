import 'dotenv/config'
import { collection, addDoc } from 'firebase/firestore'
import { readFileSync } from 'fs'
import { parse } from 'csv-parse/sync'

// ✅ Reutilizamos tu firebaseNode.js
import { db } from './firebaseNode.js'

// Leer el archivo CSV
const csv = readFileSync('./usuarios.csv', 'utf8')
const records = parse(csv, { columns: true, skip_empty_lines: true })

// Contador para el seguimiento
let contador = 0
let errores = 0

// Mapeo de códigos de plan a nombres completos
const nombresDePlanes = {
  '662': '662 Profesorado de Música',
  '662G': '662G Profesorado de Música con orientación en Instrumento (letra)',
  '663': '663 Profesorado de Música con orientación en Dirección Coral',
  '664': '664 Profesorado de Música con orientación en Canto Lírico',
  '665': '665 Profesorado de Música con orientación en Dirección Orquestal',
  '666': '666 Profesorado de Música con orientación en Composición',
  '389': '389 Cantante',
  '390': '390 Compositor',
  '391': '391 Director Coral',
  '392': '392 Director Orquestal',
  '393': '393 Instrumentista',
  '708': '708 Técnico Superior en Sonido'
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
  let roles = []
  try {
    // Intentar parsear roles como array JSON
    roles = JSON.parse(usuario.roles)
  } catch {
    // Si no se puede parsear, usar como string simple
    if (usuario.roles && usuario.roles.trim() !== '') {
      roles = [usuario.roles.trim()]
    }
  }
  
  // Validar que los roles sean un array
  if (!Array.isArray(roles)) {
    roles = [roles]
  }
  
  // Normalizar roles a minúsculas
  roles = roles.map(r => typeof r === 'string' ? r.toLowerCase() : String(r).toLowerCase())
  
  // Validar que los roles sean válidos
  const rolesValidos = ['estudiante', 'docente', 'bedel', 'admin']
  const rolesInvalidos = roles.filter(r => !rolesValidos.includes(r))
  if (rolesInvalidos.length > 0) {
    errores.push(`Roles inválidos: ${rolesInvalidos.join(', ')}`)
  }
  
  // Validar plan según roles
  const esEstudiante = roles.includes('estudiante')
  if (esEstudiante && (!usuario.plan || usuario.plan.trim() === '')) {
    errores.push('Los estudiantes deben tener un plan asignado')
  }
  
  if (!esEstudiante && usuario.plan && usuario.plan.trim() !== '') {
    console.warn(`Advertencia: El usuario ${usuario.email} no es estudiante pero tiene un plan asignado`)
  }
  
  // Validar que el código de plan sea válido si se proporciona
  if (usuario.plan && usuario.plan.trim() !== '') {
    const planCodigo = usuario.plan.trim()
    if (!nombresDePlanes[planCodigo]) {
      console.warn(`Advertencia: El código de plan "${planCodigo}" no está en la lista de planes conocidos`)
    }
  }
  
  return {
    errores,
    roles,
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
    
    // Formatear el plan con el nombre completo
    let planFormateado = ''
    if (row.plan && row.plan.trim() !== '') {
      const planCodigo = row.plan.trim()
      planFormateado = nombresDePlanes[planCodigo] || `${planCodigo} Profesorado de Música`
      
      // Excepciones especiales
      if (planCodigo === '708') {
        planFormateado = '708 Técnico Superior en Sonido'
      }
    }
    
    // Crear documento de usuario
    await addDoc(collection(db, 'usuarios'), {
      dni: row.dni.trim(),
      nombre: row.nombre.trim(),
      apellido: row.apellido.trim(),
      email: row.email.trim().toLowerCase(),
      roles: validacion.roles, // Roles ya validados y normalizados
      plan: planFormateado, // Plan con nombre completo
      estado: 'pendiente_registro', // Estado inicial para registro
      fechaImport: new Date().toISOString(),
      creadoEl: new Date().toISOString()
    })
    
    contador++
    console.log(`✅ Usuario ${row.email} importado correctamente`)
    
  } catch (error) {
    console.error(`❌ Error al importar usuario ${row.email}:`, error.message)
    errores++
  }
}

console.log(`\n🏁 Importación finalizada. ${contador} usuarios importados correctamente, ${errores} errores.`)
if (errores > 0) {
    console.log('⚠️  Revisa los errores e intenta corregirlos antes de continuar.')
    process.exit(1)
}