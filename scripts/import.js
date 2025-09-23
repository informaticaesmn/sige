import 'dotenv/config'
import { initializeApp } from 'firebase/app'
import { getFirestore, collection, addDoc } from 'firebase/firestore'
import { readFileSync } from 'fs'
import { parse } from 'csv-parse/sync'

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
}
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

const csv = readFileSync('./muestra.csv', 'utf8')
const records = parse(csv, { columns: true, skip_empty_lines: true })

for (const row of records) {
  await addDoc(collection(db, 'Estudiantes'), {
    dni: row.dni.trim(),
    nombre: row.nombre.trim(),
    apellido: row.apellido.trim(),
    email: row.email.trim().toLowerCase(),
    rol: row.rol.trim().toLowerCase(),
    plan: row.plan.trim(),
    estado: 'pendiente_registro',
    materiasAprobadas: [],
    fechaImport: new Date().toISOString()
  })
}

console.log('✅ estudiantes importados')