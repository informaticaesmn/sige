// src/composables/useUsuarios.js
import { db } from '@/config/firebase.js'
import {
  doc,
  getDoc,
  updateDoc,
  writeBatch
} from 'firebase/firestore/lite'
import { catalogoDePlanes } from '@/utils/planes.js'

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

  // NORMALIZAR: estado → estadoRegistro (compatibilidad v1)
  if (data.estado && !data.estadoRegistro) {
    data.estadoRegistro = data.estado
    delete data.estado
  }
  if (!data.estadoRegistro) {
    data.estadoRegistro = 'pendiente_registro'
  }

  // NORMALIZAR: planes array → mapa mínimo (compatibilidad v1)
  // El array puede traer códigos ("662"), nombres completos ("662 Profesorado de Música")
  // o el alias legacy ("62G"). Siempre se escribe el código canónico como clave.
  if (Array.isArray(data.planes)) {
    const mapaPlanes = {}
    const codigosValidos = catalogoDePlanes()
    for (const plan of data.planes) {
      let codigo = plan
      if (typeof plan === 'string') {
        // Alias legacy: "62G" → "662G"
        if (plan === '62G') codigo = '662G'
        // Nombre completo v1: extraer primera palabra como código ("662 Profesorado..." → "662")
        else if (plan.includes(' ')) codigo = plan.split(' ')[0]
        // Si no es un código del catálogo, saltar esta entrada
        if (!codigosValidos.includes(codigo)) continue
      } else if (typeof plan === 'object' && plan.id) {
        codigo = plan.id
        mapaPlanes[codigo] = plan
        continue
      }
      mapaPlanes[codigo] = {
        id: codigo,
        nombre: `Plan ${codigo}`,
        estado: 'ingresante',
        vigente: true,
        origen: 'migracion_v1'
      }
    }
    data.planes = mapaPlanes
  } else if (!data.planes) {
    data.planes = {}
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