/**
 * Import function triggers from their respective submodules:
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {setGlobalOptions} = require("firebase-functions/v2");
const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");

admin.initializeApp();

const db = admin.firestore();
const auth = admin.auth();

// Configuración global para las funciones
setGlobalOptions({region: "southamerica-west1", maxInstances: 10});

/**
 * Registra un nuevo usuario si su email
 * está pre-aprobado en la colección 'usuarios'.
 * 1. Verifica que el email exista como ID de documento en 'usuarios'.
 * 2. Si existe, crea el usuario en Firebase Authentication.
 * 3. Migra el documento de Firestore del ID=email al ID=uid.
 * 4. Devuelve el perfil completo del usuario al cliente.
 * @param {object} request - La solicitud a la función.
 * @param {object} request.data - Los datos enviados a la función.
 * @param {string} request.data.email - El email del usuario a registrar.
 * @param {string} request.data.password - La contraseña del usuario.
 * @return {Promise<object>} El perfil completo del usuario creado.
 */
exports.registrarUsuario = onCall(async (request) => {
  const {email, password} = request.data;

  if (!email || !password) {
    throw new HttpsError(
        "invalid-argument",
        "El email y la contraseña son obligatorios.",
    );
  }

  const perfilTemporalRef = db.collection("usuarios").doc(email);

  try {
    const perfilTemporalDoc = await perfilTemporalRef.get();

    if (!perfilTemporalDoc.exists || perfilTemporalDoc.data().uid) {
      // No existe o ya tiene un UID (ya se registró)
      throw new HttpsError(
          "not-found",
          "auth/user-not-pre-approved-or-already-registered",
      );
    }

    const perfilTemporal = perfilTemporalDoc.data();

    // Crear el usuario en Firebase Auth
    const userRecord = await auth.createUser({
      email: email,
      password: password,
      displayName: `${perfilTemporal.nombre} ${perfilTemporal.apellido}`,
    });

    const nuevoUid = userRecord.uid;
    const perfilCompletoRef = db.collection("usuarios").doc(nuevoUid);

    // Usar un batch para asegurar la atomicidad de la migración
    const batch = db.batch();

    // Creamos el nuevo documento con todos los datos + el uid
    const perfilCompleto = {
      ...perfilTemporal,
      uid: nuevoUid,
      email: email, // Aseguramos que el email quede en los datos
      actualizadoEn: new Date(),
    };
    batch.set(perfilCompletoRef, perfilCompleto);

    // Eliminamos el documento temporal
    batch.delete(perfilTemporalRef);

    await batch.commit();

    logger.log(`Usuario ${email} registrado exitosamente con UID: ${nuevoUid}`);

    // Devolvemos el perfil completo para que el cliente pueda hacer login
    return perfilCompleto;
  } catch (error) {
    logger.error("Error en registrarUsuario:", error);
    // Re-lanzar errores para que el cliente los reciba
    if (error instanceof HttpsError) {
      throw error;
    }
    if (error.code === "auth/email-already-exists") {
      throw new HttpsError("already-exists", "auth/email-already-in-use");
    }
    if (error.code === "auth/invalid-password") {
      throw new HttpsError("invalid-argument", "auth/weak-password");
    }

    throw new HttpsError(
        "internal",
        "Ocurrió un error inesperado durante el registro.",
        error,
    );
  }
});
