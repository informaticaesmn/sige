import 'dotenv/config'
import { collection, addDoc } from 'firebase/firestore'
import { readFileSync } from 'fs'
import { parse } from 'csv-parse/sync'

// ✅ Reutilizamos tu firebaseNode.js
import { db } from './firebaseNode.js'

const csv = readFileSync('./muestra.csv', 'utf8')
const records = parse(csv, { columns: true, skip_empty_lines: true })

for (const row of records) {
  let roles = []
  let materias = []

  try {
    roles = JSON.parse(row.rol) // parsea array de roles
  } catch {
    roles = [row.rol.trim()]
  }

  try {
    materias = JSON.parse(row.materias) // parsea array de objetos materia
  } catch {
    materias = []
  }

  await addDoc(collection(db, 'usuarios'), {
    dni: row.dni.trim(),
    nombre: row.nombre.trim(),
    apellido: row.apellido.trim(),
    email: row.email.trim().toLowerCase(),
    rol: roles, // ahora es array
    plan: row.plan.trim(),
    materias, // array de objetos {nombre, nota}
    estado: 'pendiente_registro',
    fechaImport: new Date().toISOString()
  })
}

console.log('✅ Datos importados correctamente')
