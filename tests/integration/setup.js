/**
 * Setup para tests de integración con Firebase Emulator
 * 
 * Inicializa el emulador de Auth y Firestore antes de cada test
 */

import { initializeTestApp } from '@firebase/rules-unit-testing'
import { getFirestore } from 'firebase/firestore/lite'
import { getAuth } from 'firebase/auth'

// Configuración del proyecto de test
export const TEST_PROJECT_ID = 'sige-test'

// Helper para crear una app de test
export const createTestApp = (auth = null) => {
  return initializeTestApp({
    projectId: TEST_PROJECT_ID,
    auth,
  })
}

// Helper para obtener Firestore de la app de test
export const getTestFirestore = (app) => {
  return getFirestore(app)
}

// Helper para obtener Auth de la app de test
export const getTestAuth = (app) => {
  return getAuth(app)
}

// Helper para crear un usuario de test en Auth
export const createTestUser = async (auth, email, password, uid = null) => {
  const { createUserWithEmailAndPassword } = await import('firebase/auth')
  const userCredential = await createUserWithEmailAndPassword(auth, email, password)
  return userCredential.user
}

// Helper para crear un usuario con UID específico (para tests de migración)
export const createTestUserWithUid = async (auth, email, password, uid) => {
  const { createUserWithEmailAndPassword } = await import('firebase/auth')
  const userCredential = await createUserWithEmailAndPassword(auth, email, password)
  // Nota: El UID lo asigna Firebase Auth automáticamente
  // Para tests de migración, necesitamos simular el flujo completo
  return userCredential.user
}

// Helper para generar un email único para cada test
export const generateTestEmail = (prefix = 'test') => {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(7)
  return `${prefix}-${timestamp}-${random}@test.com`
}

// Helper para esperar a que el emulador esté listo
export const waitForEmulator = async (timeout = 5000) => {
  const startTime = Date.now()
  while (Date.now() - startTime < timeout) {
    try {
      // Intentar conectarse al emulador
      const testApp = createTestApp()
      const db = getTestFirestore(testApp)
      await db.collection('test').limit(1).get()
      return true
    } catch (error) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }
  throw new Error('El emulador no está respondiendo en el tiempo límite')
}