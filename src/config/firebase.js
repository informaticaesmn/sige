import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFunctions } from 'firebase/functions'
import { getFirestore } from 'firebase/firestore/lite'
import { getAnalytics } from 'firebase/analytics'

// Configuración pública (no secretos sensibles)
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

//console.log("Firebase config:", firebaseConfig)
const app  = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db   = getFirestore(app)

// Inicializar Cloud Functions especificando la región.
// Este dato es CRUCIAL para que la app sepa dónde llamar a la función.
export const functions = getFunctions(app, 'southamerica-east1')

// Inicializar Analytics solo en el entorno de producción
let analytics
if (import.meta.env.PROD) {
  analytics = getAnalytics(app)
}

export { analytics }

export default app