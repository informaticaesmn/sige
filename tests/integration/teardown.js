/**
 * Teardown para tests de integración con Firebase Emulator
 * 
 * Limpia la base de datos entre cada test
 */

import { TEST_PROJECT_ID } from './setup.js'

// Helper para limpiar la base de datos del emulador
export const clearFirestore = async (app) => {
  const { getFirestore, collection, getDocs, deleteDoc, doc } = await import('firebase/firestore/lite')
  
  const db = getFirestore(app)
  
  // Obtener todas las colecciones y eliminar sus documentos
  try {
    // Limpiar colección usuarios
    const usuariosSnapshot = await getDocs(collection(db, 'usuarios'))
    const deletePromises = usuariosSnapshot.docs.map((docSnap) => 
      deleteDoc(doc(db, 'usuarios', docSnap.id))
    )
    await Promise.all(deletePromises)
  } catch (error) {
    // Ignorar errores si la colección no existe
  }
}

// Helper para limpiar colecciones específicas
export const clearCollection = async (app, collectionName) => {
  const { getFirestore, collection, getDocs, deleteDoc, doc } = await import('firebase/firestore/lite')
  
  const db = getFirestore(app)
  
  try {
    const snapshot = await getDocs(collection(db, collectionName))
    const deletePromises = snapshot.docs.map((docSnap) => 
      deleteDoc(doc(db, collectionName, docSnap.id))
    )
    await Promise.all(deletePromises)
  } catch (error) {
    // Ignorar errores si la colección no existe
  }
}

// Helper para limpiar subcolecciones
export const clearSubcollection = async (app, parentPath) => {
  const { getFirestore, collection, getDocs, deleteDoc, doc } = await import('firebase/firestore/lite')
  
  const db = getFirestore(app)
  
  try {
    const snapshot = await getDocs(collection(db, parentPath))
    const deletePromises = snapshot.docs.map((docSnap) => 
      deleteDoc(doc(db, parentPath, docSnap.id))
    )
    await Promise.all(deletePromises)
  } catch (error) {
    // Ignorar errores si la subcolección no existe
  }
}

// Helper para limpiar todo el emulador
export const cleanupTestApp = async (app) => {
  // Limpiar Firestore
  await clearFirestore(app)
  
  // Limpiar colecciones con nombres dinámicos
  const collectionsToClean = [
    'usuarios',
    'ofertaAcademica',
  ]
  
  for (const collectionName of collectionsToClean) {
    await clearCollection(app, collectionName)
  }
}

// Helper para limpiar inscripciones de un ciclo específico
export const clearInscripcionesByCiclo = async (app, ciclo) => {
  const { getFirestore, collection, getDocs, deleteDoc, doc } = await import('firebase/firestore/lite')
  
  const db = getFirestore(app)
  
  try {
    // Limpiar subcolecciones de inscripciones para cada usuario
    const usuariosSnapshot = await getDocs(collection(db, 'usuarios'))
    
    for (const usuarioDoc of usuariosSnapshot.docs) {
      const inscripcionesPath = `usuarios/${usuarioDoc.id}/inscripciones${ciclo}`
      await clearSubcollection(app, inscripcionesPath)
    }
  } catch (error) {
    // Ignorar errores
  }
}

// Helper para resetear el emulador completamente
export const resetEmulator = async () => {
  // Este método limpia todos los datos del emulador
  // Se puede usar en afterAll para limpiar entre suites de tests
  try {
    const { getFirestore, collection, getDocs, deleteDoc, doc } = await import('firebase/firestore/lite')
    
    // Crear una app temporal para limpiar
    const { initializeApp } = await import('firebase/app')
    const app = initializeApp({
      projectId: TEST_PROJECT_ID,
    })
    
    const db = getFirestore(app)
    
    // Limpiar todas las colecciones conocidas
    const collections = ['usuarios', 'ofertaAcademica']
    
    for (const colName of collections) {
      try {
        const snapshot = await getDocs(collection(db, colName))
        const deletePromises = snapshot.docs.map((docSnap) => 
          deleteDoc(doc(db, colName, docSnap.id))
        )
        await Promise.all(deletePromises)
      } catch (e) {
        // Continuar
      }
    }
  } catch (error) {
    // Ignorar errores
  }
}