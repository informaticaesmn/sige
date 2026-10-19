/**
 * Tests de integración para reglas de seguridad de Firestore
 *
 * Valida:
 * - Un usuario 'estudiante' NO puede escribir en la colección 'usuarios' de otro
 * - Un usuario SÍ puede escribir en su propia subcolección inscripciones{ciclo}
 *   (ej. `inscripciones20261`), vía el comodín de segmento `{subcoleccion}` + matches()
 * - Un estudiante NO puede auto-confirmarse una inscripción
 * - Un bedel SÍ puede confirmarla, y solo tocando el campo `estado`
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
// OJO: acá se usa el SDK completo (`firebase/firestore`), NO `/lite`. El `Firestore`
// que devuelve `rules-unit-testing` es una instancia del SDK completo (compat), así que
// las funciones de `/lite` (clases propias) la rechazan con
// "Expected first argument to doc() to be a CollectionReference, ...".
import { doc, setDoc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore'

import { setupTestEnvironment, generateTestEmail } from './setup.js'
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

  /**
   * Devuelve un uid de mentira + un Firestore autenticado como él.
   * `authenticatedContext()` firma un token falso, así que NO hace falta crear un
   * usuario real en el emulador de Auth para probar las reglas de Firestore.
   * @param {string} prefijo prefijo del email de prueba
   */
  const crearEstudianteAutenticado = (prefijo) => {
    const email = generateTestEmail(prefijo)
    const uid = `uid-${email.split('@')[0]}`
    return {
      user: { uid, email },
      db: testEnv.authenticatedContext(uid, { email }).firestore(),
    }
  }

  describe('Colección usuarios', () => {
    it('debe denegar a un estudiante escribir en la colección usuarios de otro usuario', async () => {
      const { db: userDb } = crearEstudianteAutenticado('estudiante1')

      // Intentar escribir en el documento de OTRO usuario
      const otherUserUid = 'otro-usuario-falso-123'
      const otherUserRef = doc(userDb, 'usuarios', otherUserUid)

      // ASSERT: debe fallar por reglas de seguridad
      await assertFails(setDoc(otherUserRef, { uid: otherUserUid, nombre: 'Intruso' }))
    })

    it('debe permitir a un estudiante escribir en su propia subcolección inscripciones20261', async () => {
      const { user, db: userDb } = crearEstudianteAutenticado('inscripcion')

      const inscripcionRef = doc(userDb, 'usuarios', user.uid, 'inscripciones20261', 'materia-001')

      // ASSERT: debe tener éxito
      await assertSucceeds(setDoc(inscripcionRef, {
        materiaId: 'materia-001', estado: 'pendiente', ciclo: '20261'
      }))

      const inscripcionDoc = await getDoc(inscripcionRef)
      expect(inscripcionDoc.exists()).toBe(true)
    })
  })

  describe('Inscripciones (subcolección por ciclo)', () => {
    it('NO debe permitir que un estudiante se auto-confirme la inscripción', async () => {
      const { user, db: userDb } = crearEstudianteAutenticado('autoconfirma')
      const inscripcionRef = doc(userDb, 'usuarios', user.uid, 'inscripciones20261', 'materia-002')

      await assertSucceeds(setDoc(inscripcionRef, {
        materiaId: 'materia-002', estado: 'pendiente', ciclo: '20261'
      }))

      // Intento de auto-confirmación: debe fallar
      await assertFails(setDoc(inscripcionRef, {
        materiaId: 'materia-002', estado: 'confirmada', ciclo: '20261'
      }))
    })

    it('debe permitir a un bedel confirmar la inscripción de un estudiante', async () => {
      const bedelUid = 'bedel-test-001'

      // El doc del bedel lo crea un admin (fuera de las reglas), como en producción
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'usuarios', bedelUid), {
          nombre: 'Bedel', roles: ['bedel']
        })
      })

      const { user, db: userDb } = crearEstudianteAutenticado('bedel-confirma')
      const inscripcionRef = doc(userDb, 'usuarios', user.uid, 'inscripciones20261', 'materia-003')

      await assertSucceeds(setDoc(inscripcionRef, {
        materiaId: 'materia-003', estado: 'pendiente', ciclo: '20261'
      }))

      const bedelDb = testEnv.authenticatedContext(bedelUid, { email: 'bedel@test.com' }).firestore()
      const refDelBedel = doc(bedelDb, 'usuarios', user.uid, 'inscripciones20261', 'materia-003')

      // Confirmar: permitido
      await assertSucceeds(updateDoc(refDelBedel, { estado: 'confirmada' }))

      // Cambiar otros campos (ej. la comisión): denegado
      await assertFails(updateDoc(refDelBedel, { comisionId: 'comision-hackeada' }))
    })
  })

  describe('Rol coordinacion (carga masiva y oferta académica)', () => {
    /**
     * Crea el documento del actor con sus roles vía `withSecurityRulesDisabled`
     * (equivalente a lo que haría el Admin SDK en producción) y devuelve un
     * Firestore autenticado como ese usuario.
     */
    const crearActorConRoles = async (email, roles) => {
      const uid = `uid-${email.split('@')[0]}`
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'usuarios', uid), { email, roles })
      })
      return { uid, db: testEnv.authenticatedContext(uid, { email }).firestore() }
    }

    it('debe permitir a coordinacion crear usuarios estudiante/docente/bedel', async () => {
      const { db: coordDb } = await crearActorConRoles('coord-crea@test.com', ['coordinacion'])

      await assertSucceeds(setDoc(doc(coordDb, 'usuarios', 'nuevo-alumno@test.com'), {
        email: 'nuevo-alumno@test.com', roles: ['estudiante'], estado: 'pendiente_registro'
      }))
      await assertSucceeds(setDoc(doc(coordDb, 'usuarios', 'nuevo-docente@test.com'), {
        email: 'nuevo-docente@test.com', roles: ['docente'], estado: 'pendiente_registro'
      }))
      await assertSucceeds(setDoc(doc(coordDb, 'usuarios', 'nuevo-bedel@test.com'), {
        email: 'nuevo-bedel@test.com', roles: ['bedel'], estado: 'pendiente_registro'
      }))
    })

    it('NO debe permitir a coordinacion crear un admin ni otro coordinador', async () => {
      const { db: coordDb } = await crearActorConRoles('coord-crea2@test.com', ['coordinacion'])

      await assertFails(setDoc(doc(coordDb, 'usuarios', 'falso-admin@test.com'), {
        email: 'falso-admin@test.com', roles: ['admin'], estado: 'pendiente_registro'
      }))
      await assertFails(setDoc(doc(coordDb, 'usuarios', 'falso-coord@test.com'), {
        email: 'falso-coord@test.com', roles: ['coordinacion'], estado: 'pendiente_registro'
      }))
    })

    it('NO debe permitir a coordinacion modificar el array roles (sí otros campos de un estudiante)', async () => {
      const { db: coordDb } = await crearActorConRoles('coord-update@test.com', ['coordinacion'])
      const alumnoUid = 'alumno-para-ascender'

      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'usuarios', alumnoUid), {
          email: 'alumno@test.com', roles: ['estudiante'], estado: 'activo'
        })
      })

      // Ascenso encubierto editando `roles`: denegado
      await assertFails(updateDoc(doc(coordDb, 'usuarios', alumnoUid), { roles: ['admin'] }))
      // Editar un campo normal (sin tocar roles): permitido
      await assertSucceeds(updateDoc(doc(coordDb, 'usuarios', alumnoUid), { estado: 'egresado' }))
    })

    it('debe permitir a admin modificar el array roles', async () => {
      const { db: adminDb } = await crearActorConRoles('admin-roles@test.com', ['admin'])
      const alumnoUid = 'alumno-a-ascender'

      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'usuarios', alumnoUid), {
          email: 'alumno2@test.com', roles: ['estudiante'], estado: 'activo'
        })
      })

      await assertSucceeds(updateDoc(doc(adminDb, 'usuarios', alumnoUid), { roles: ['estudiante', 'bedel'] }))
    })

    it('NO debe permitir a un estudiante crear usuarios', async () => {
      const { db: userDb } = crearEstudianteAutenticado('estudiante-crea')

      await assertFails(setDoc(doc(userDb, 'usuarios', 'intruso@test.com'), {
        email: 'intruso@test.com', roles: ['estudiante']
      }))
    })

    it('debe permitir a coordinacion escribir y borrar la oferta académica', async () => {
      const { db: coordDb } = await crearActorConRoles('coord-oferta@test.com', ['coordinacion'])
      const ofertaRef = doc(coordDb, 'ofertaAcademica', '2026-1')

      await assertSucceeds(setDoc(ofertaRef, { nombreCiclo: 'Ciclo 2026-1', etapas: [] }))
      await assertSucceeds(deleteDoc(ofertaRef))
    })

    it('NO debe permitir a un estudiante escribir la oferta académica', async () => {
      const { db: userDb } = crearEstudianteAutenticado('estudiante-oferta')

      await assertFails(setDoc(doc(userDb, 'ofertaAcademica', '2026-2'), { nombreCiclo: 'x' }))
    })
  })
})
