//import { getAuth } from 'firebase/auth'
import { getFirestore, doc, getDocs, setDoc, deleteDoc, collection, query, where } from 'firebase/firestore/lite'
import { auth, db } from '@/config/firebase.js'

export async function vincularUsuario(uid, email) {
  // 1. verificar si YA existe el UID
  const uidSnap = await getDoc(doc(db, 'Usuarios', uid))
  if (uidSnap.exists()) {
    console.log('⚠️ usuario ya vinculado')
    return
  }

  // 2. buscar por email
  const q = query(collection(db, 'Usuarios'), where('email', '==', email))
  const snap = await getDocs(q)

  if (snap.empty) {
    console.log('❌ no existe estudiante con ese email')
    return
  }

  const oldDoc = snap.docs[0]
  const datos = oldDoc.data()

  // 3. copiar con UID como ID
  await setDoc(doc(db, 'Usuarios', uid), datos)

  // 4. borrar el viejo
  await deleteDoc(oldDoc.ref)

  console.log('✅ estudiante vinculado con UID:', uid)
}
