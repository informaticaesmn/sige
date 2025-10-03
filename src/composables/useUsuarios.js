// src/composables/useUsuarios.js
import { db } from '@/config/firebase.js'
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  writeBatch
} from 'firebase/firestore/lite'

/**
 * Vincular usuario de Auth con documento existente en Firestore
 * Estrategia: si existe documento con mismo email → se migra al UID
 */
export async function vincularUsuario(uid, email) {
  console.log('🔍 vinculando:', uid, email)

  const userRef = doc(db, 'usuarios', uid)
  const userSnap = await getDoc(userRef)

  // Si ya existe documento con ese UID, no hacemos nada
  if (userSnap.exists()) {
    console.log('⚠️ usuario ya vinculado con UID')
    return
  }

  // Buscar documentos con ese email
  const q = query(collection(db, 'usuarios'), where('email', '==', email))
  const snap = await getDocs(q)

  if (snap.empty) {
    console.log('❌ no existe usuario con ese email en Firestore')
    return
  }
  if (snap.size > 1) {
    console.error('🚨 Hay más de un documento con ese email, revisar base')
    return
  }

  const oldDoc = snap.docs[0]
  const datos = oldDoc.data()
  const batch = writeBatch(db)

  // Crear nuevo documento con UID
  batch.set(userRef, {
    ...datos,
    email,
    uid,
    actualizadoEn: new Date()
  })

  // Marcar viejo como migrado (no borrar)
  batch.update(oldDoc.ref, {
    migrado: true,
    reemplazadoPor: uid,
    actualizadoEn: new Date()
  })

  await batch.commit()
  console.log('✅ usuario vinculado con UID (doc viejo marcado como migrado):', uid)
}

/**
 * Obtener un usuario por UID
 */
export async function obtenerUsuario(uid) {
  const userRef = doc(db, 'usuarios', uid)
  const snap = await getDoc(userRef)
  return snap.exists() ? snap.data() : null
}

/**
 * Actualizar roles de un usuario
 */
export async function actualizarRoles(uid, roles = []) {
  const userRef = doc(db, 'usuarios', uid)
  await updateDoc(userRef, {
    roles,
    actualizadoEn: new Date()
  })
  console.log('✅ roles actualizados para', uid, roles)
}

/**
 * Crear un nuevo usuario en Firestore
 * (ej: si viene de un registro directo y no existía nada previo)
 */
export async function crearUsuario(uid, email, extra = {}) {
  const userRef = doc(db, 'usuarios', uid)
  await setDoc(userRef, {
    uid,
    email,
    roles: ['estudiante'], // por defecto estudiante
    creadoEn: new Date(),
    ...extra
  })
  console.log('✅ usuario creado en Firestore:', uid)
}

/**
 * 🔹 Helper que devuelve los roles de un usuario
 */
export async function getRoles(uid) {
  const usuario = await obtenerUsuario(uid)
  return usuario?.roles || []
}