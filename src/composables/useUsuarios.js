// src/composables/useUsuarios.js
import { db } from '@/config/firebase.js'
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  query,
  updateDoc,
  where,
  limit,
  writeBatch
} from 'firebase/firestore/lite'

/**
 * Verifica si un email corresponde a un usuario pre-aprobado.
 * Devuelve los datos del perfil si es válido, o null en caso contrario.
 * Un perfil es válido para registrar si existe y aún no tiene un UID vinculado.
 */
export async function verificarPerfilPreAprobado(email) {
  const userRef = doc(db, 'usuarios', email) // Lectura directa por ID!
  const userSnap = await getDoc(userRef)

  if (userSnap.exists() && !userSnap.data().uid) {
    // El usuario existe y no se ha registrado aún. ¡Perfecto!
    return userSnap.data()
  }

  return null
}

/**
 * Finaliza el proceso de registro migrando el documento temporal (ID=email)
 * a un documento definitivo (ID=uid).
 * Se usa una transacción en lote para garantizar la integridad de los datos.
 */
export async function migrarPerfilARegistroCompleto(email, uid, datosPerfil) {
  const batch = writeBatch(db)

  // Referencia al documento viejo (ID=email)
  const viejoDocRef = doc(db, 'usuarios', email)

  // Referencia al nuevo documento (ID=uid)
  const nuevoDocRef = doc(db, 'usuarios', uid)

  // 1. Crea el nuevo documento con el UID como ID
  batch.set(nuevoDocRef, {
    ...datosPerfil,
    uid: uid,
    email: email, // Aseguramos que el email quede en los datos
    actualizadoEn: new Date()
  })

  // 2. Elimina el viejo documento temporal
  batch.delete(viejoDocRef)

  // Ejecuta ambas operaciones de forma atómica
  await batch.commit()
  console.log(`✅ Perfil migrado de ${email} a ${uid} exitosamente.`)
}

/**
 * Obtener un usuario por UID. Ahora esto es una lectura directa y eficiente.
 */
export async function obtenerUsuario(uid) {
  const userRef = doc(db, 'usuarios', uid)
  const snap = await getDoc(userRef)
  if (!snap.exists()) return null
  
  const data = snap.data()
  
  // NORMALIZAR: asegurar que siempre usamos 'roles' en minúsculas
  if (data.rol || data.roles) {
    const rolesArray = data.roles || data.rol || []
    // Convertir a minúsculas y eliminar duplicados
    data.roles = [...new Set(rolesArray.map(r => r.toLowerCase()))]
    // Eliminar el campo viejo si existe
    if (data.rol) delete data.rol
  }
  
  return data
}
/**
 * Actualizar roles de un usuario.
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
 * 🔹 Helper que devuelve los roles de un usuario
 */
export async function getRoles(uid) {
  const usuario = await obtenerUsuario(uid)
  return usuario?.roles || []
}