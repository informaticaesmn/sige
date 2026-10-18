/**
 * Teardown para tests de integración con Firebase Emulator
 * Limpia la base de datos usando el endpoint nativo del emulador (mucho más rápido)
 */
import { getTestEnv } from './setup.js'

export const clearFirestore = async () => {
  const env = getTestEnv()
  if (env) {
    await env.clearFirestore()
  }
}

export const cleanupTestApp = clearFirestore
export const resetEmulator = clearFirestore 