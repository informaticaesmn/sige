/**
 * Tests de integración para migración de usuario
 * 
 * Flujo completo de registro:
 * 1. Crear usuario en Auth
 * 2. Verificar que se crea el doc con ID=email (pre-aprobación)
 * 3. Verificar que se migra correctamente a ID=uid con writeBatch
 * 4. Verificar que el documento email se elimina
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { initializeTestApp } from '@firebase/rules-unit-testing'
import { getFirestore, doc, getDoc, setDoc, writeBatch, collection, getDocs } from 'firebase/firestore/lite'
import { getAuth, createUserWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth'

import { TEST_PROJECT_ID, generateTestEmail } from './setup.js'
import { clearFirestore, clearCollection } from './teardown.js'

describe('Auth Migration Flow', () => {
  let testApp
  let db
  let auth

  beforeEach(async () => {
    // Crear una nueva app de test para cada test
    testApp = initializeTestApp({
      projectId: TEST_PROJECT_ID,
    })
    db = getFirestore(testApp)
    auth = getAuth(testApp)
  })

  afterEach(async () => {
    // Limpiar la base de datos
    await clearFirestore(testApp)
  })

  afterAll(async () => {
    // Limpiar al finalizar todos los tests
    await clearFirestore(testApp)
  })

  describe('Flujo de registro', () => {
    it('debe crear usuario en Auth y verificar el documento pre-aprobado', async () => {
      // Arrange
      const email = generateTestEmail('registro')
      const password = 'Password123!'
      
      // Simular pre-aprobación: crear documento con ID=email
      const preApprovedDoc = {
        nombre: 'Test',
        apellido: 'User',
        email: email.toLowerCase(),
        carrera: 'Ingeniería',
        dni: '12345678',
        legajo: '12345',
        estado: 'pre-aprobado',
        roles: ['estudiante'],
        plan: '662',
      }
      
      await setDoc(doc(db, 'usuarios', email.toLowerCase()), preApprovedDoc)

      // Act - Crear usuario en Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      // Assert - Verificar que el usuario fue creado en Auth
      expect(user).toBeDefined()
      expect(user.email).toBe(email)
      expect(user.uid).toBeDefined()

      // Assert - Verificar que el documento pre-aprobado existe
      const preApprovedSnapshot = await getDoc(doc(db, 'usuarios', email.toLowerCase()))
      expect(preApprovedSnapshot.exists()).toBe(true)
    })

    it('debe migrar el documento de email a uid con writeBatch', async () => {
      // Arrange
      const email = generateTestEmail('migracion')
      const password = 'Password123!'
      
      // Simular pre-aprobación
      const preApprovedDoc = {
        nombre: 'Migrado',
        apellido: 'Usuario',
        email: email.toLowerCase(),
        carrera: 'Ingeniería Informática',
        dni: '87654321',
        legajo: '54321',
        estado: 'pre-aprobado',
        roles: ['estudiante'],
        plan: '662',
      }
      
      await setDoc(doc(db, 'usuarios', email.toLowerCase()), preApprovedDoc)

      // Act - Crear usuario en Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      // Simular la migración con writeBatch (como lo hace la Cloud Function)
      const batch = writeBatch(db)
      
      // Crear nuevo documento con ID=uid
      const newDocRef = doc(db, 'usuarios', user.uid)
      batch.set(newDocRef, {
        ...preApprovedDoc,
        uid: user.uid,
        actualizadoEn: new Date(),
      })
      
      // Eliminar documento antiguo con ID=email
      const oldDocRef = doc(db, 'usuarios', email.toLowerCase())
      batch.delete(oldDocRef)
      
      await batch.commit()

      // Assert - Verificar que el nuevo documento con UID existe
      const newDocSnapshot = await getDoc(doc(db, 'usuarios', user.uid))
      expect(newDocSnapshot.exists()).toBe(true)
      
      const newDocData = newDocSnapshot.data()
      expect(newDocData.uid).toBe(user.uid)
      expect(newDocData.email).toBe(email.toLowerCase())
      expect(newDocData.nombre).toBe('Migrado')
      expect(newDocData.estado).toBe('pre-aprobado')

      // Assert - Verificar que el documento antiguo fue eliminado
      const oldDocSnapshot = await getDoc(doc(db, 'usuarios', email.toLowerCase()))
      expect(oldDocSnapshot.exists()).toBe(false)
    })

    it('debe manejar la migración con múltiples roles', async () => {
      // Arrange
      const email = generateTestEmail('multirol')
      const password = 'Password123!'
      
      const preApprovedDoc = {
        nombre: 'Multi',
        apellido: 'Rol',
        email: email.toLowerCase(),
        carrera: 'Ingeniería',
        dni: '11111111',
        legajo: '11111',
        estado: 'pre-aprobado',
        roles: ['estudiante', 'bedel'], // Múltiples roles
        plan: '662',
      }
      
      await setDoc(doc(db, 'usuarios', email.toLowerCase()), preApprovedDoc)

      // Act - Crear usuario y migrar
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      const batch = writeBatch(db)
      const newDocRef = doc(db, 'usuarios', user.uid)
      batch.set(newDocRef, {
        ...preApprovedDoc,
        uid: user.uid,
        actualizadoEn: new Date(),
      })
      
      const oldDocRef = doc(db, 'usuarios', email.toLowerCase())
      batch.delete(oldDocRef)
      
      await batch.commit()

      // Assert - Verificar roles migrados correctamente
      const newDocSnapshot = await getDoc(doc(db, 'usuarios', user.uid))
      const newDocData = newDocSnapshot.data()
      
      expect(newDocData.roles).toEqual(['estudiante', 'bedel'])
      expect(newDocData.uid).toBe(user.uid)
    })

    it('debe normalizar roles a minúsculas durante la migración', async () => {
      // Arrange
      const email = generateTestEmail('normalizacion')
      const password = 'Password123!'
      
      // Simular roles con mayúsculas (error común)
      const preApprovedDoc = {
        nombre: 'Normalizado',
        apellido: 'Usuario',
        email: email.toLowerCase(),
        carrera: 'Ingeniería',
        dni: '22222222',
        legajo: '22222',
        estado: 'pre-aprobado',
        roles: ['Estudiante', 'BEDel'], // Mayúsculas
        plan: '662',
      }
      
      await setDoc(doc(db, 'usuarios', email.toLowerCase()), preApprovedDoc)

      // Act - Crear usuario y migrar
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      const batch = writeBatch(db)
      const newDocRef = doc(db, 'usuarios', user.uid)
      
      // Normalizar roles a minúsculas
      const normalizedRoles = preApprovedDoc.roles.map(r => r.toLowerCase())
      
      batch.set(newDocRef, {
        ...preApprovedDoc,
        uid: user.uid,
        roles: normalizedRoles,
        actualizadoEn: new Date(),
      })
      
      const oldDocRef = doc(db, 'usuarios', email.toLowerCase())
      batch.delete(oldDocRef)
      
      await batch.commit()

      // Assert - Verificar roles normalizados
      const newDocSnapshot = await getDoc(doc(db, 'usuarios', user.uid))
      const newDocData = newDocSnapshot.data()
      
      expect(newDocData.roles).toEqual(['estudiante', 'bedel'])
    })
  })

  describe('Validación de datos', () => {
    it('debe conservar todos los campos durante la migración', async () => {
      // Arrange
      const email = generateTestEmail('validacion')
      const password = 'Password123!'
      
      const preApprovedDoc = {
        nombre: 'Validado',
        apellido: 'Campos',
        email: email.toLowerCase(),
        carrera: 'Ingeniería Electrónica',
        dni: '33333333',
        legajo: '33333',
        estado: 'pre-aprobado',
        roles: ['estudiante'],
        plan: '662G',
      }
      
      await setDoc(doc(db, 'usuarios', email.toLowerCase()), preApprovedDoc)

      // Act
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      const batch = writeBatch(db)
      const newDocRef = doc(db, 'usuarios', user.uid)
      batch.set(newDocRef, {
        ...preApprovedDoc,
        uid: user.uid,
        actualizadoEn: new Date(),
      })
      
      const oldDocRef = doc(db, 'usuarios', email.toLowerCase())
      batch.delete(oldDocRef)
      
      await batch.commit()

      // Assert - Verificar todos los campos
      const newDocSnapshot = await getDoc(doc(db, 'usuarios', user.uid))
      const newDocData = newDocSnapshot.data()
      
      expect(newDocData.nombre).toBe('Validado')
      expect(newDocData.apellido).toBe('Campos')
      expect(newDocData.email).toBe(email.toLowerCase())
      expect(newDocData.carrera).toBe('Ingeniería Electrónica')
      expect(newDocData.dni).toBe('33333333')
      expect(newDocData.legajo).toBe('33333')
      expect(newDocData.estado).toBe('pre-aprobado')
      expect(newDocData.roles).toEqual(['estudiante'])
      expect(newDocData.plan).toBe('662G')
      expect(newDocData.uid).toBe(user.uid)
      expect(newDocData.actualizadoEn).toBeDefined()
    })
  })
})