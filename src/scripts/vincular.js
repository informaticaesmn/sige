import 'dotenv/config'
import { getAuth } from 'firebase/auth'
import { getFirestore, doc, getDocs, setDoc, deleteDoc, collection, query, where } from 'firebase/firestore'
import { initializeApp } from 'firebase/app'

const firebaseConfig = { /* mismo que antes */ }
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

export async function vincularUsuario(uid, email) {
  // 1. buscar por email
  const q = query(collection(db, 'Estudiantes'), where('email', '==', email))
  const snap = await getDocs(q)

  if (snap.empty) {
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