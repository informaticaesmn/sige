/**
 * Tests de integración para reglas de seguridad de Firestore
 * 
 * Valida:
 * - Un usuario 'estudiante' NO puede escribir en la colección 'usuarios' de otro
 * - Un usuario SÍ puede escribir en su propia subcolección inscripciones20261
 * - Uso de wildcards para colecciones dinámicas inscripciones${ciclo}
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore/lite'
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth'

import { setupTestEnvironment, getTestEnv, generateTestEmail } from './setup.js'
import { clearFirestore } from './teardown.js'

describe('Firestore Security Rules', () => {
  let testEnv

  beforeAll(async () => {
    testEnv = await setupTestEnvironment()
  })

  afterAll(async () => {
    await clearFirestore()
    await testEnv.cleanup()
  })

  describe('Colección usuarios', () => {
    it('debe denegar a un estudiante escribir en la colección usuarios de otro usuario', async () => {
      const email = generateTestEmail('estudiante1')
      const password = 'Password123!'

      // Crear usuario real en Auth
      const unauthContext = testEnv.unauthenticatedContext()
      const auth = unauthContext.auth()
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      // Contexto autenticado como este usuario
      const userContext = testEnv.authenticatedContext(user.uid, { email: user.email })
      const userDb = userContext.firestore()

      // Intentar escribir en el documento de OTRO usuario
      const otherUserUid = 'otro-usuario-falso-123'
      const otherUserRef = doc(userDb, 'usuarios', otherUserUid)
      
      // ASSERT: Debe fallar por reglas de seguridad
      await expect(assertFails(setDoc(otherUserRef, { uid: otherUserUid, nombre: 'Intruso' })))
        .resolves.not.toThrow() // assertFails ya lanza si tiene éxito, así que esperamos que NO lance error extra
    })

    it('debe permitir a un estudiante escribir en su propia subcolección inscripciones20261', async () => {
      const email = generateTestEmail('inscripcion')
      const password = 'Password123!'

      const unauthContext = testEnv.unauthenticatedContext()
      const userCredential = await createUserWithEmailAndPassword(unauthContext.auth(), email, password)
      const user = userCredential.user

      const userContext = testEnv.authenticatedContext(user.uid, { email: user.email })
      const userDb = userContext.firestore()

      const inscripcionRef = doc(userDb, 'usuarios', user.uid, 'inscripciones20261', 'materia-001')

      // ASSERT: Debe tener éxito
      await expect(assertSucceeds(setDoc(inscripcionRef, {
        materiaId: 'materia-001', estado: 'pendiente', ciclo: '20261'
      }))).resolves.not.toThrow()

      const inscripcionDoc = await getDoc(inscripcionRef)
      expect(inscripcionDoc.exists()).toBe(true)
    })
  })
})