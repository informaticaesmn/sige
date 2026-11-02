import 'dotenv/config'
import { readFileSync } from 'fs'

// ✅ Reutilizamos firebaseNode.js (Firebase Admin SDK para service account)
import { db } from './firebaseNode.js'

// Núcleo compartido de validación (src/utils) — evita duplicar lógica
import {
  validarCSVUsuarios,
  construirDocumentoUsuario,
  construirLegajo
} from '../src/utils/validacionUsuarios.js'

import {
  catalogoDePlanes,
  normalizarPlanJson
} from '../src/utils/planes.js'

import { parsearCSVUsuarios } from '../src/utils/csv.js'

// ---------------------------------------------------------------------------
// Configuración
// ---------------------------------------------------------------------------
const LIMITE_BATCH = 500
const CSV_PATH = './data/usuarios.csv'
const PLANES_JSON_PATH = './public/planes/planes.json'

// Parsear argumentos CLI: --apply para escribir, por defecto es --dry-run
const args = process.argv.slice(2)
const APLICAR = args.includes('--apply')
const DRY_RUN = !APLICAR

if (DRY_RUN) {
  console.log('🔍 Modo dry-run (no se escribe en Firestore). Usa --apply para confirmar.')
} else {
  console.log('⚠️  Modo apply (se escribirá en Firestore).')
}

// ---------------------------------------------------------------------------
// Cargar catálogo de planes desde planes.json
// ---------------------------------------------------------------------------
let planesJson
try {
  planesJson = JSON.parse(readFileSync(PLANES_JSON_PATH, 'utf8'))
} catch (error) {
  console.error(`❌ No se pudo leer ${PLANES_JSON_PATH}:`, error.message)
  process.exit(1)
}

const nombresDePlanes = {}
if (Array.isArray(planesJson.planes)) {
  planesJson.planes.forEach((plan) => {
    if (plan?.codigo) nombresDePlanes[plan.codigo] = plan.nombre || plan.codigo
  })
} else {
  Object.assign(nombresDePlanes, planesJson.planes || {})
}

// Códigos con JSON disponible (para validación D8: solo planes con JSON revisado)
const planesConJsonDisponible = new Set()
for (const codigo of catalogoDePlanes()) {
  try {
    const ruta = `./public/planes/${codigo}.json`
    const json = JSON.parse(readFileSync(ruta, 'utf8'))
    const normalizado = normalizarPlanJson(json, codigo)
    if (normalizado.disponible) {
      planesConJsonDisponible.add(codigo)
    }
  } catch {
    // Archivo no existe o no se puede leer → no disponible
  }
}

// ---------------------------------------------------------------------------
// Leer y parsear CSV
// ---------------------------------------------------------------------------
let csvText
try {
  csvText = readFileSync(CSV_PATH, 'utf8')
} catch (error) {
  console.error(`❌ No se pudo leer ${CSV_PATH}:`, error.message)
  process.exit(1)
}

// Usar parsearCSVUsuarios (util propio, sin dependencias) para obtener filas
const filasCSV = parsearCSVUsuarios(csvText)

// Validar filas con el núcleo compartido
const { filas: filasValidas, errores: erroresValidacion } =
  validarCSVUsuarios(filasCSV, nombresDePlanes, [...planesConJsonDisponible])

// ---------------------------------------------------------------------------
// Validación D8: filtrar planes sin JSON disponible
// ---------------------------------------------------------------------------
const filasConErroresJson = []
const filasFinales = []

for (const fila of filasValidas) {
  const planesSinJson = fila.planes.filter((c) => !planesConJsonDisponible.has(c))
  if (planesSinJson.length > 0) {
    filasConErroresJson.push({
      fila: fila.email,
      detalle: planesSinJson.map((c) => `El plan "${c}" no tiene JSON revisado y no se puede dar de alta`)
    })
  } else {
    filasFinales.push(fila)
  }
}

// ---------------------------------------------------------------------------
// Deduplicar en memoria (email y DNI dentro del archivo)
// ---------------------------------------------------------------------------
const emailsVistos = new Set()
const dnisVistos = new Set()
const filasDeduplicadas = []
const filasDuplicadas = []

for (const fila of filasFinales) {
  if (emailsVistos.has(fila.email)) {
    filasDuplicadas.push({ fila: fila.email, detalle: ['Email duplicado dentro del archivo'] })
    continue
  }
  if (dnisVistos.has(fila.dni)) {
    filasDuplicadas.push({ fila: fila.email, detalle: ['DNI duplicado dentro del archivo'] })
    continue
  }
  emailsVistos.add(fila.email)
  dnisVistos.add(fila.dni)
  filasDeduplicadas.push(fila)
}

// ---------------------------------------------------------------------------
// Reporte de errores antes de escribir
// ---------------------------------------------------------------------------
const todosErrores = [
  ...erroresValidacion,
  ...filasConErroresJson,
  ...filasDuplicadas
]

if (todosErrores.length > 0) {
  console.log('\n❌ Errores de validación (abortando carga):')
  for (const err of todosErrores) {
    console.log(`   - ${err.fila || 'desconocido'}: ${Array.isArray(err.detalle) ? err.detalle.join(', ') : err.detalle}`)
  }
  process.exit(1)
}

if (filasDeduplicadas.length === 0) {
  console.log('\n⚠️  No hay filas válidas para importar.')
  process.exit(0)
}

console.log(`\n📋 Filas válidas para importar: ${filasDeduplicadas.length}`)

// ---------------------------------------------------------------------------
// Construir documentos (usuario v2 + legajo) en memoria
// ---------------------------------------------------------------------------
const operaciones = [] // { tipo: 'usuario' | 'legajo', ref, data }

for (const fila of filasDeduplicadas) {
  const personaId = crypto.randomUUID()

  const docUsuario = construirDocumentoUsuario(
    {
      email: fila.email,
      dni: fila.dni,
      nombre: fila.nombre,
      apellido: fila.apellido,
      roles: fila.roles,
      planes: fila.planes,
      fechaInscripcion: fila.fechaInscripcion,
      numeroLegajo: fila.numeroLegajo || null,
      nombresDePlanes,
      origen: 'script',
      estadoPorPlan: {},
      fechaInscripcionPorPlan: {}
    },
    personaId
  )

  const docLegajo = construirLegajo({
    personaId,
    numeroLegajo: fila.numeroLegajo || null,
    email: fila.email,
    dni: fila.dni,
    nombre: fila.nombre,
    apellido: fila.apellido
  })

  const emailNormalizado = fila.email.toLowerCase().trim()

  operaciones.push({
    tipo: 'usuario',
    ref: db.collection('usuarios').doc(emailNormalizado),
    data: docUsuario
  })

  operaciones.push({
    tipo: 'legajo',
    ref: db.collection('legajos').doc(personaId),
    data: docLegajo
  })
}

console.log(`📦 Documentos a escribir: ${operaciones.length} (${filasDeduplicadas.length} usuarios + ${filasDeduplicadas.length} legajos)`)

// ---------------------------------------------------------------------------
// Dry-run: solo reporte, no se escribe
// ---------------------------------------------------------------------------
if (DRY_RUN) {
  console.log('\n🔍 Dry-run completo. No se escribió nada en Firestore.')
  console.log('   Ejecuta con --apply para confirmar la importación.')
  process.exit(0)
}

// ---------------------------------------------------------------------------
// Apply: escribir en Firestore por lotes de ≤500
// ---------------------------------------------------------------------------
let contador = 0
let erroresEscritura = 0

for (let i = 0; i < operaciones.length; i += LIMITE_BATCH) {
  const lote = operaciones.slice(i, i + LIMITE_BATCH)
  const batch = db.batch()

  for (const op of lote) {
    batch.set(op.ref, op.data)
  }

  try {
    await batch.commit()
    contador += lote.length
    console.log(`   ✅ Lote ${Math.floor(i / LIMITE_BATCH) + 1}: ${lote.length} documentos escritos`)
  } catch (error) {
    erroresEscritura += lote.length
    console.error(`   ❌ Error en lote ${Math.floor(i / LIMITE_BATCH) + 1}:`, error.message)
  }
}

console.log(`\n🏁 Importación finalizada. ${contador} documentos escritos, ${erroresEscritura} errores.`)

if (erroresEscritura > 0) {
  process.exit(1)
}
