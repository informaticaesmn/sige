//import { getAuth } from 'firebase/auth'
import { getFirestore, doc, getDocs, setDoc, deleteDoc, collection, query, where } from 'firebase/firestore/lite'
import { auth, db } from '@/config/firebase.js'

export async function vincularUsuario(uid, email) {
  // 1. buscar por email
  const q = query(collection(db, 'Estudiantes'), where('email', '==', email))
  const snap = await getDocs(q)

  if (snap.empty) {
    //ver de mostrar mensaje en UI
    console.log('❌ no existe estudiante con ese email')
    return
  }

  const oldDoc = snap.docs[0]
  const datos = oldDoc.data()

  // 2. copiar con UID como ID
  await setDoc(doc(db, 'Estudiantes', uid), datos)

  // 3. borrar el viejo
  await deleteDoc(oldDoc.ref)

  console.log('✅ estudiante vinculado con UID:', uid)
}