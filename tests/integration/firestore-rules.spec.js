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
      db: testEnv.authenticatedContext(uid, { email, roles: [] }).firestore(),
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

      const bedelDb = testEnv.authenticatedContext(bedelUid, { email: 'bedel@test.com', roles: ['bedel'] }).firestore()
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
      return { uid, db: testEnv.authenticatedContext(uid, { email, roles }).firestore() }
    }

    it('debe permitir a coordinacion crear usuarios estudiante/docente/bedel', async () => {
      const { db: coordDb } = await crearActorConRoles('coord-crea@test.com', ['coordinacion'])

      await assertSucceeds(setDoc(doc(coordDb, 'usuarios', 'nuevo-alumno@test.com'), {
        email: 'nuevo-alumno@test.com', roles: ['estudiante'], estadoRegistro: 'pendiente_registro', personaId: 'persona-1',
        planes: { '662': { id: '662', nombre: 'Plan 662', estado: 'ingresante', vigente: true, origen: 'alta_individual' } }
      }))
      await assertSucceeds(setDoc(doc(coordDb, 'usuarios', 'nuevo-docente@test.com'), {
        email: 'nuevo-docente@test.com', roles: ['docente'], estadoRegistro: 'pendiente_registro', personaId: 'persona-2'
      }))
      await assertSucceeds(setDoc(doc(coordDb, 'usuarios', 'nuevo-bedel@test.com'), {
        email: 'nuevo-bedel@test.com', roles: ['bedel'], estadoRegistro: 'pendiente_registro', personaId: 'persona-3'
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
          email: 'alumno@test.com', roles: ['estudiante'], estadoRegistro: 'activo'
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
          email: 'alumno2@test.com', roles: ['estudiante'], estadoRegistro: 'activo', personaId: 'persona-x'
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

  describe('Rol bedel (alta individual de estudiantes)', () => {
    const crearBedelAutenticado = (prefijo) => {
      const email = generateTestEmail(prefijo)
      const uid = `uid-bedel-${email.split('@')[0]}`
      return {
        user: { uid, email },
        db: testEnv.authenticatedContext(uid, { email, roles: ['bedel'] }).firestore(),
      }
    }

    it('debe permitir a bedel crear un pre-registro de estudiante', async () => {
      const { db: bedelDb } = crearBedelAutenticado('bedel-crea-estudiante')

      await assertSucceeds(setDoc(doc(bedelDb, 'usuarios', 'nuevo-alumno-bedel@test.com'), {
        email: 'nuevo-alumno-bedel@test.com',
        roles: ['estudiante'],
        estadoRegistro: 'pendiente_registro',
        personaId: 'persona-bedel-1',
        planes: { '662': { id: '662', nombre: 'Plan 662', estado: 'ingresante', vigente: true, origen: 'alta_individual' } }
      }))
    })

    it('NO debe permitir a bedel crear un docente', async () => {
      const { db: bedelDb } = crearBedelAutenticado('bedel-crea-docente')

      await assertFails(setDoc(doc(bedelDb, 'usuarios', 'nuevo-docente-bedel@test.com'), {
        email: 'nuevo-docente-bedel@test.com',
        roles: ['docente'],
        estadoRegistro: 'pendiente_registro',
        personaId: 'persona-bedel-2'
      }))
    })

    it('NO debe permitir a bedel crear un admin', async () => {
      const { db: bedelDb } = crearBedelAutenticado('bedel-crea-admin')

      await assertFails(setDoc(doc(bedelDb, 'usuarios', 'nuevo-admin-bedel@test.com'), {
        email: 'nuevo-admin-bedel@test.com',
        roles: ['admin'],
        estadoRegistro: 'pendiente_registro',
        personaId: 'persona-bedel-3'
      }))
    })

    it('NO debe permitir a bedel crear un estudiante sin personaId', async () => {
      const { db: bedelDb } = crearBedelAutenticado('bedel-sin-personaId')

      await assertFails(setDoc(doc(bedelDb, 'usuarios', 'sin-persona@test.com'), {
        email: 'sin-persona@test.com',
        roles: ['estudiante'],
        estadoRegistro: 'pendiente_registro'
      }))
    })

    it('debe permitir a bedel crear estudiante sin planes (validación de planes es del cliente)', async () => {
      const { db: bedelDb } = crearBedelAutenticado('bedel-sin-planes')

      // Las rules permiten el create; la validación de "estudiante sin planes"
      // se hace en el cliente (useAltaUsuario / validarDatosUsuario).
      await assertSucceeds(setDoc(doc(bedelDb, 'usuarios', 'sin-planes@test.com'), {
        email: 'sin-planes@test.com',
        roles: ['estudiante'],
        estadoRegistro: 'pendiente_registro',
        personaId: 'persona-bedel-4'
      }))
    })

    it('debe permitir a bedel crear con email distinto al ID del documento (validación es del cliente)', async () => {
      const { db: bedelDb } = crearBedelAutenticado('bedel-email-mal')

      // Las rules permiten el create; la validación de email == docId se hace en el cliente.
      await assertSucceeds(setDoc(doc(bedelDb, 'usuarios', 'otro-email@test.com'), {
        email: 'nuevo-alumno-bedel@test.com',
        roles: ['estudiante'],
        estadoRegistro: 'pendiente_registro',
        personaId: 'persona-bedel-5'
      }))
    })
  })

  describe('Legajo digital (legajos/{personaId})', () => {
    const crearBedelAutenticado = (prefijo) => {
      const email = generateTestEmail(prefijo)
      const uid = `uid-bedel-legajo-${email.split('@')[0]}`
      return {
        user: { uid, email },
        db: testEnv.authenticatedContext(uid, { email, roles: ['bedel'] }).firestore(),
      }
    }

    const crearEstudianteAutenticadoLegajo = (prefijo) => {
      const email = generateTestEmail(prefijo)
      const uid = `uid-est-legajo-${email.split('@')[0]}`
      return {
        user: { uid, email },
        db: testEnv.authenticatedContext(uid, { email, roles: ['estudiante'] }).firestore(),
      }
    }

    it('debe permitir a bedel crear un legajo', async () => {
      const { db: bedelDb } = crearBedelAutenticado('bedel-legajo-crea')

      await assertSucceeds(setDoc(doc(bedelDb, 'legajos', 'persona-legajo-1'), {
        personaId: 'persona-legajo-1',
        numeroLegajo: '2026-0001',
        dni: '37348389',
        nombre: 'María José',
        apellido: 'ORTEGA'
      }))
    })

    it('debe permitir a bedel actualizar un legajo', async () => {
      const { db: bedelDb } = crearBedelAutenticado('bedel-legajo-actualiza')

      // Crear legajo primero (con reglas deshabilitadas para simplificar)
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'legajos', 'persona-legajo-2'), {
          personaId: 'persona-legajo-2',
          numeroLegajo: null,
          dni: '30941843',
          nombre: 'Victoria',
          apellido: 'MACLEAN'
        })
      })

      await assertSucceeds(updateDoc(doc(bedelDb, 'legajos', 'persona-legajo-2'), {
        numeroLegajo: '2026-0002',
        domicilios: [{ tipo: 'real', calle: 'Falsa', numero: '123' }]
      }))
    })

    it('NO debe permitir a un estudiante crear un legajo', async () => {
      const { db: estDb } = crearEstudianteAutenticadoLegajo('est-legajo-no')

      await assertFails(setDoc(doc(estDb, 'legajos', 'persona-legajo-3'), {
        personaId: 'persona-legajo-3',
        dni: '11223344',
        nombre: 'Estudiante',
        apellido: 'De Prueba'
      }))
    })

    it('NO debe permitir a un estudiante leer un legajo ajeno', async () => {
      const { db: estDb } = crearEstudianteAutenticadoLegajo('est-legajo-lee')

      await assertFails(getDoc(doc(estDb, 'legajos', 'persona-legajo-ajeno')))
    })
  })

  describe('Auditoría de importaciones (importaciones/{id})', () => {
    const crearCoordAutenticado = (prefijo) => {
      const email = generateTestEmail(prefijo)
      const uid = `uid-coord-imp-${email.split('@')[0]}`
      return {
        user: { uid, email },
        db: testEnv.authenticatedContext(uid, { email, roles: ['coordinacion'] }).firestore(),
      }
    }

    const crearAdminAutenticado = (prefijo) => {
      const email = generateTestEmail(prefijo)
      const uid = `uid-admin-imp-${email.split('@')[0]}`
      return {
        user: { uid, email },
        db: testEnv.authenticatedContext(uid, { email, roles: ['admin'] }).firestore(),
      }
    }

    it('debe permitir a coordinacion escribir una auditoría de importación', async () => {
      const { db: coordDb } = crearCoordAutenticado('coord-imp')

      await assertSucceeds(setDoc(doc(coordDb, 'importaciones', 'imp-001'), {
        tipo: 'carga_masiva',
        usuario: 'coord@test.com',
        archivoHash: 'abc123',
        totalFilas: 10,
        importados: 8,
        errores: 2,
        creadoEn: new Date()
      }))
    })

    it('debe permitir a admin escribir una auditoría de importación', async () => {
      const { db: adminDb } = crearAdminAutenticado('admin-imp')

      await assertSucceeds(setDoc(doc(adminDb, 'importaciones', 'imp-002'), {
        tipo: 'script',
        usuario: 'admin@test.com',
        archivoHash: 'def456',
        totalFilas: 5,
        importados: 5,
        errores: 0,
        creadoEn: new Date()
      }))
    })

    it('NO debe permitir a un bedel escribir una auditoría de importación', async () => {
      const email = generateTestEmail('bedel-imp-no')
      const uid = `uid-bedel-imp-no-${email.split('@')[0]}`
      const bedelDb = testEnv.authenticatedContext(uid, { email, roles: ['bedel'] }).firestore()

      await assertFails(setDoc(doc(bedelDb, 'importaciones', 'imp-003'), {
        tipo: 'carga_masiva',
        usuario: email,
        archivoHash: 'ghi789',
        totalFilas: 1,
        importados: 0,
        errores: 1,
        creadoEn: new Date()
      }))
    })
  })
})
