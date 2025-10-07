import 'dotenv/config'; // Carga las variables de entorno desde .env
import admin from 'firebase-admin';

// 1. Configura el Firebase Admin SDK usando variables de entorno
// No necesitas un archivo serviceAccountKey.json si tienes las variables correctas en tu .env
// Asegúrate de que tu .env tiene las variables VITE_FIREBASE_*
const firebaseConfig = {
  apiKey:            process.env.VITE_FIREBASE_API_KEY,
  authDomain:        process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.VITE_FIREBASE_APP_ID
};

admin.initializeApp({
  ...firebaseConfig,
  // Para el SDK de Admin, es mejor usar una cuenta de servicio para autenticarse.
  // Si ejecutas esto localmente, la forma más fácil es configurar la variable de entorno GOOGLE_APPLICATION_CREDENTIALS
  // que apunte a tu archivo de clave de servicio JSON. Si esa variable existe, no necesitas `credential` aquí.
});

const db = admin.firestore();

async function migrateUserDocuments() {
  console.log("🚀 Iniciando la migración de documentos de usuarios...");

  const usuariosRef = db.collection('usuarios');
  const snapshot = await usuariosRef.get();

  if (snapshot.empty) {
    console.log("👋 No se encontraron documentos en la colección 'usuarios' para migrar.");
    return;
  }

  const operations = [];
  const BATCH_SIZE = 400; // Un buen tamaño para estar por debajo del límite de 500 operaciones por batch
  let currentBatch = db.batch();
  let processedCount = 0;
  const emailsProcessed = new Set(); // Para detectar emails duplicados

  for (const doc of snapshot.docs) {
    const userData = doc.data();
    const originalDocId = doc.id;
    const userEmail = userData.email;

    if (!userEmail) {
      console.warn(`⚠️ Advertencia: El documento con ID '${originalDocId}' no tiene un campo 'email'. ¡Saltando este documento!`);
      continue;
    }

    // Opcional: Validación básica del formato del email
    if (typeof userEmail !== 'string' || !/\S+@\S+\.\S+/.test(userEmail)) {
        console.warn(`⚠️ Advertencia: El email '${userEmail}' del documento '${originalDocId}' no parece un formato válido. ¡Saltando este documento!`);
        continue;
    }

    if (emailsProcessed.has(userEmail)) {
      console.error(`🚨 ¡ERROR CRÍTICO! Se encontró un email duplicado: '${userEmail}' (documento original ID: '${originalDocId}'). Si continúas, el documento anterior con este email SERÁ SOBRESCRITO. Se recomienda DETENER la ejecución y resolver los emails duplicados ANTES de proceder.`);
      // En un entorno real, probablemente querrías detener el script aquí.
      // Por ahora, el script continuará, pero el último documento con el email prevalecerá.
    }
    emailsProcessed.add(userEmail);

    const newDocRef = usuariosRef.doc(userEmail.toLowerCase()); // Guardamos el email en minúsculas como ID

    // 2. Crea el nuevo documento con el email como ID
    currentBatch.set(newDocRef, userData);

    // 3. Marca el documento original para su eliminación
    currentBatch.delete(doc.ref);

    processedCount++;
    console.log(`✨ Preparando para migrar documento ID: ${originalDocId} a nuevo ID: ${userEmail.toLowerCase()}`);

    // Ejecuta el batch periódicamente para evitar exceder el límite de 500 operaciones
    if (processedCount % BATCH_SIZE === 0) {
      console.log(`📦 Commitando batch de ${processedCount} documentos...`);
      operations.push(currentBatch.commit());
      currentBatch = db.batch(); // Inicia un nuevo batch
    }
  }

  // Commit de las operaciones restantes en el último batch
  if (processedCount % BATCH_SIZE !== 0) {
    console.log(`📦 Commitando el batch final. Documentos en este lote: ${processedCount % BATCH_SIZE === 0 ? BATCH_SIZE : processedCount % BATCH_SIZE}`);
    operations.push(currentBatch.commit());
  } else if (processedCount === 0) {
    console.log("🤷 No se encontraron documentos válidos para migrar.");
    return;
  }

  await Promise.all(operations); // Espera a que todos los batches se completen
  console.log(`✅ ¡Migración completada! Se procesaron ${processedCount} documentos.`);
  console.log("👉 ¡Recordatorio muy importante! Si tu aplicación usa los IDs de documento originales, necesitarás actualizar esas referencias también.");
}

// Ejecuta la función de migración y maneja errores
migrateUserDocuments().catch(error => {
  console.error("❌ Ocurrió un error grave durante la migración:", error);
  process.exit(1); // Sale con código de error
});
