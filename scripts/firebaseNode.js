import 'dotenv/config'
import { readFileSync } from 'fs'
import { existsSync } from 'fs'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

// Determinar qué tipo de credenciales usar
let db

// Verificar si se está usando una cuenta de servicio
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './service-account-key.json'

try {
  let adminApp
  
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // Usar cuenta de servicio desde variable de entorno
    console.log('Usando cuenta de servicio desde variable de entorno')
    adminApp = initializeApp({
      credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
    })
  } else if (existsSync(serviceAccountPath)) {
    // Usar archivo de cuenta de servicio
    console.log('Usando archivo de cuenta de servicio:', serviceAccountPath)
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'))
    adminApp = initializeApp({
      credential: cert(serviceAccount)
    })
  } else {
    // Fallback a configuración de cliente con variables de entorno
    console.log('Usando credenciales de cliente desde variables de entorno')
    const firebaseConfig = {
      apiKey: process.env.VITE_FIREBASE_API_KEY,
      authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.VITE_FIREBASE_APP_ID
    }

    console.log('Firebase config project ID:', firebaseConfig.projectId)
    adminApp = initializeApp(firebaseConfig)
  }
  
  db = getFirestore()
  console.log('✅ Conexión a Firestore establecida correctamente')
  
} catch (error) {
  console.error('❌ Error al inicializar Firestore:', error.message)
  process.exit(1)
}

export { db }