/**
 * Setup para tests de integración con Firebase Emulator (API v5)
 * 
 * Inicializa el emulador de Auth y Firestore antes de cada test
 */
import { initializeTestEnvironment } from '@firebase/rules-unit-testing'

// El `--project` del CLI y este id tienen que coincidir: firebase.json tiene
// `singleProjectMode: true`, así que el emulador rechaza otros project ids.
export const TEST_PROJECT_ID = 'demo-sige'

let testEnv

export const setupTestEnvironment = async () => {
  if (!testEnv) {
    testEnv = await initializeTestEnvironment({
      projectId: TEST_PROJECT_ID,
      firestore: {
        // El emulador cargará automáticamente tus reglas locales de firestore.rules
      },
    })
  }
  return testEnv
}

export const getTestEnv = () => testEnv

export const generateTestEmail = (prefix = 'test') => {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(7)
  return `${prefix}-${timestamp}-${random}@test.com`
}