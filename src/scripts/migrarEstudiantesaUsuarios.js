// src/scripts/migrarEstudiantesaUsuarios.js
import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, setDoc, deleteDoc, doc } from 'firebase/firestore/lite'
import { db } from '../config/firebaseNode.js'

async function migrarEstudiantesAUsuarios() {
  console.log('🔄 iniciando migración...')  
  
  const estudiantesSnap = await getDocs(collection(db, 'Estudiantes'))
  console.log('📦 documentos a migrar:', estudiantesSnap.size)
  
for (const estudiante of estudiantesSnap.docs) {
  const datos = estudiante.data()
  console.log('📄 migrando:', estudiante.id, datos)

  await setDoc(doc(db, 'Usuarios', estudiante.id), datos)
  await deleteDoc(doc(db, 'Estudiantes', estudiante.id))
}

  console.log('✅ migración completa')
}

// ejecutar una sola vez
migrarEstudiantesAUsuarios()