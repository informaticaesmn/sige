import 'dotenv/config'
import { readFileSync } from 'fs'
import { parse } from 'csv-parse/sync'

// ✅ Reutilizamos tu firebaseNode.js
import { db } from './firebaseNode.js'

// Verificar que la base de datos esté correctamente inicializada
if (!db) {
  console.error('❌ No se pudo inicializar la conexión a Firestore')
  process.exit(1)
}

// Leer el archivo CSV (los datos NO se versionan: ver data/README.md)
const csv = readFileSync('./data/usuarios.csv', 'utf8')
const records = parse(csv, { columns: true, skip_empty_lines: true })

// Contador para el seguimiento
let contador = 0
let errores = 0

// Mapeo de códigos de plan a nombres completos
const nombresDePlanes = {
  '662': '662 Profesorado de Música',
  '662A': '662A Profesorado de Música con orientación en Arpa',
  '662B': '662B Profesorado de Música con orientación en Canto',
  '662C': '662C Profesorado de Música con orientación en Clarinete',
  '662D': '662D Profesorado de Música con orientación en Composición',
  '662E': '662E Profesorado de Música con orientación en Contrabajo',
  '662F': '662F Profesorado de Música con orientación en Dirección Coral',
  '662G': '662G Profesorado de Música con orientación en Guitarra',
  '662H': '662H Profesorado de Música con orientación en Fagot',
  '662I': '662I Profesorado de Música con orientación en Percusión',
  '662J': '662J Profesorado de Música con orientación en Piano',
  '662K': '662K Profesorado de Música con orientación en Oboe',
  '662L': '662L Profesorado de Música con orientación en Instrumento de Cuerda',
  '662M': '662M Profesorado de Música con orientación en Instrumento de Percusión',
  '662N': '662N Profesorado de Música con orientación en Instrumento de Viento Metal',
  '662O': '662O Profesorado de Música con orientación en Clarinete',
  '662P': '662P Profesorado de Música con orientación en Instrumento de Viento Madera',
  '662Q': '662Q Profesorado de Música con orientación en Tuba',
  '662R': '662R Profesorado de Música con orientación en Trombón',
  '662S': '662S Profesorado de Música con orientación en Trompeta',
  '662T': '662T Profesorado de Música con orientación en Violín',
  '662U': '662U Profesorado de Música con orientación en Viola',
  '662V': '662V Profesorado de Música con orientación en Violoncello',
  '663': '663 Profesorado de Música con orientación en Dirección Coral',
  '664': '664 Profesorado de Música con orientación en Canto Lírico',
  '665': '665 Profesorado de Música con orientación en Dirección Orquestal',
  '666': '666 Profesorado de Música con orientación en Composición',
  '389': '389 Cantante',
  '390': '390 Compositor',
  '391': '391 Director Coral',
  '392': '392 Director Orquestal',
  '393': '393 Instrumentista',
  '708': '708 Técnico Superior en Sonido',
  'PREGRADO': 'PREGRADO Programa Propedéutico'
}

// Función para parsear campos que pueden ser arrays
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
      return valorTrim.split(',').map(item => item.trim())
    }
    // Si es un solo valor, devolverlo como array de un elemento
    return [valorTrim]
  }
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
  roles = roles.map(r => typeof r === 'string' ? r.toLowerCase() : String(r).toLowerCase())
  
  // Validar que los roles sean válidos
  const rolesValidos = ['estudiante', 'docente', 'bedel', 'coordinacion', 'admin']
  const rolesInvalidos = roles.filter(r => !rolesValidos.includes(r))
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
        if (!nombresDePlanes[codigo]) {
          console.warn(`Advertencia: El código de plan "${codigo}" no está en la lista de planes conocidos`)
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
      planesFormateados = validacion.planes.map(planCodigo => {
        if (!planCodigo || planCodigo.trim() === '') {
          return ''
        }
        
        const codigo = planCodigo.trim()
        return nombresDePlanes[codigo] || `${codigo} Profesorado de Música`
      }).filter(plan => plan !== '') // Filtrar planes vacíos
    }
    
    // Crear documento de usuario con el email como ID
    const email = row.email.trim().toLowerCase()
    
    // Usar el email como ID del documento
    await db.collection('usuarios').doc(email).set({
      dni: row.dni.trim(),
      nombre: row.nombre.trim(),
      apellido: row.apellido.trim(),
      email: email,
      roles: validacion.roles, // Roles ya validados y normalizados
      planes: planesFormateados, // Planes formateados como array
      estado: 'pendiente_registro', // Estado inicial para registro
      fechaImport: new Date().toISOString(),
      creadoEl: new Date().toISOString()
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