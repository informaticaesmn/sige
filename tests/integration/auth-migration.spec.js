/**
 * Tests de integración para migración de usuario
 * 
 * Flujo completo de registro:
 * 1. Crear usuario en Auth
 * 2. Verificar que se crea el doc con ID=email (pre-aprobación)
 * 3. Verificar que se migra correctamente a ID=uid con writeBatch
 * 4. Verificar que el documento email se elimina
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { getFirestore, doc, getDoc, setDoc, writeBatch } from 'firebase/firestore/lite'
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth'

import { setupTestEnvironment, getTestEnv, generateTestEmail, TEST_PROJECT_ID } from './setup.js'
import { clearFirestore } from './teardown.js'

describe('Auth Migration Flow', () => {
  let testEnv
  let db
  let auth

  beforeAll(async () => {
    testEnv = await setupTestEnvironment()
  })

  beforeEach(async () => {
    // Contexto no autenticado para operaciones iniciales
    const unauthContext = testEnv.unauthenticatedContext()
    db = unauthContext.firestore()
    auth = unauthContext.auth()
  })

  afterAll(async () => {
    await clearFirestore()
    await testEnv.cleanup()
  })

  describe('Flujo de registro', () => {
    it('debe crear usuario en Auth y verificar el documento pre-aprobado', async () => {
      const email = generateTestEmail('registro')
      const password = 'Password123!'
      
      // 1. Simular pre-aprobación
      await setDoc(doc(db, 'usuarios', email.toLowerCase()), {
        nombre: 'Test', apellido: 'User', email: email.toLowerCase(),
        estado: 'pre-aprobado', roles: ['estudiante'], plan: '662'
      })

      // 2. Crear usuario en Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      expect(user).toBeDefined()
      expect(user.email).toBe(email)

      // 3. Verificar que el documento pre-aprobado sigue existiendo
      const preApprovedSnapshot = await getDoc(doc(db, 'usuarios', email.toLowerCase()))
      expect(preApprovedSnapshot.exists()).toBe(true)
    })

    it('debe migrar el documento de email a uid con writeBatch', async () => {
      const email = generateTestEmail('migracion')
      const password = 'Password123!'
      
      await setDoc(doc(db, 'usuarios', email.toLowerCase()), {
        nombre: 'Migrado', email: email.toLowerCase(), estado: 'pre-aprobado', roles: ['estudiante']
      })

      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      // Simular migración con writeBatch
      const batch = writeBatch(db)
      batch.set(doc(db, 'usuarios', user.uid), {
        nombre: 'Migrado', email: email.toLowerCase(), uid: user.uid, estado: 'activo', roles: ['estudiante']
      })
      batch.delete(doc(db, 'usuarios', email.toLowerCase()))
      await batch.commit()

      const newDoc = await getDoc(doc(db, 'usuarios', user.uid))
      expect(newDoc.exists()).toBe(true)
      expect(newDoc.data().uid).toBe(user.uid)

      const oldDoc = await getDoc(doc(db, 'usuarios', email.toLowerCase()))
      expect(oldDoc.exists()).toBe(false)
    })
  })
})