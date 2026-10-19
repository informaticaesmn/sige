/**
 * Tests de integración para migración de usuario
 *
 * Flujo completo de registro:
 * 1. Crear usuario en Auth
 * 2. Verificar que se crea el doc con ID=email (pre-aprobación)
 * 3. Verificar que se migra correctamente a ID=uid con writeBatch
 * 4. Verificar que el documento email se elimina
 *
 * OJO 1: la pre-aprobación y la migración las hace código con privilegios (los scripts
 * de importación con firebase-admin y la Cloud Function `registrarUsuario` con el
 * Admin SDK), que NO pasa por las reglas de seguridad. Por eso esas escrituras se
 * hacen en un contexto con `withSecurityRulesDisabled()`: si las hiciera un cliente
 * normal, las reglas (correctamente) las rechazarían.
 *
 * OJO 2: `@firebase/rules-unit-testing` v5 ya no expone `.auth()` en el context, así
 * que los usuarios de Auth se crean llamando a la API REST del emulador.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
// OJO: SDK completo, no `/lite` (ver el comentario en firestore-rules.spec.js).
import { doc, getDoc, setDoc, writeBatch } from 'firebase/firestore'

import { setupTestEnvironment, generateTestEmail } from './setup.js'
import { clearFirestore } from './teardown.js'

// La API REST del emulador de Auth es la de Identity Platform (la clave es cualquiera).
const AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || 'localhost:9099'
const URL_SIGN_UP = `http://${AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`

/**
 * Crea un usuario real en el emulador de Auth y devuelve su uid.
 * @param {string} email
 * @param {string} password
 */
const crearUsuarioEnAuth = async (email, password) => {
  const respuesta = await fetch(URL_SIGN_UP, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  })

  if (!respuesta.ok) {
    throw new Error(`No se pudo crear el usuario en Auth (${respuesta.status}): ${await respuesta.text()}`)
  }

  const datos = await respuesta.json()
  return { uid: datos.localId, email: datos.email }
}

describe('Auth Migration Flow', () => {
  let testEnv

  beforeAll(async () => {
    testEnv = await setupTestEnvironment()
  })

  afterAll(async () => {
    await clearFirestore()
    await testEnv.cleanup()
  })

  describe('Flujo de registro', () => {
    it('debe crear usuario en Auth y verificar el documento pre-aprobado', async () => {
      const email = generateTestEmail('registro')
      const password = 'Password123!'

      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore()

        // 1. Simular pre-aprobación (script de importación con Admin SDK)
        await setDoc(doc(adminDb, 'usuarios', email.toLowerCase()), {
          nombre: 'Test', apellido: 'User', email: email.toLowerCase(),
          estado: 'pre-aprobado', roles: ['estudiante'], plan: '662'
        })

        // 2. Crear usuario en Auth
        const user = await crearUsuarioEnAuth(email, password)

        expect(user.uid).toBeTruthy()
        expect(user.email).toBe(email)

        // 3. Verificar que el documento pre-aprobado sigue existiendo
        const preApprovedSnapshot = await getDoc(doc(adminDb, 'usuarios', email.toLowerCase()))
        expect(preApprovedSnapshot.exists()).toBe(true)
      })
    })

    it('debe migrar el documento de email a uid con writeBatch', async () => {
      const email = generateTestEmail('migracion')
      const password = 'Password123!'

      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore()

        await setDoc(doc(adminDb, 'usuarios', email.toLowerCase()), {
          nombre: 'Migrado', email: email.toLowerCase(), estado: 'pre-aprobado', roles: ['estudiante']
        })

        const user = await crearUsuarioEnAuth(email, password)

        // Simular la migración con writeBatch (Cloud Function con Admin SDK)
        const batch = writeBatch(adminDb)
        batch.set(doc(adminDb, 'usuarios', user.uid), {
          nombre: 'Migrado', email: email.toLowerCase(), uid: user.uid, estado: 'activo', roles: ['estudiante']
        })
        batch.delete(doc(adminDb, 'usuarios', email.toLowerCase()))
        await batch.commit()

        const newDoc = await getDoc(doc(adminDb, 'usuarios', user.uid))
        expect(newDoc.exists()).toBe(true)
        expect(newDoc.data().uid).toBe(user.uid)

        const oldDoc = await getDoc(doc(adminDb, 'usuarios', email.toLowerCase()))
        expect(oldDoc.exists()).toBe(false)
      })
    })
  })
})
