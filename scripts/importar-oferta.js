
// #################################################################################################
// # Script para importar la oferta académica desde un archivo CSV a Firestore                       #
// #################################################################################################
//
// Uso:
// 1. Asegúrate de tener un archivo de clave de cuenta de servicio de Firebase en la raíz del
//    proyecto. Este script espera un archivo llamado 'sige-admin-key.json'.
//    Puedes generar este archivo desde la configuración de tu proyecto en la consola de Firebase.
//
// 2. Coloca el archivo CSV exportado desde Google Sheets en la raíz del proyecto.
//
// 3. Instala las dependencias necesarias:
//    npm install firebase-admin csv-parser
//
// 4. Configura las variables en la sección `CONFIGURACIÓN` a continuación.
//
// 5. Ejecuta el script desde tu terminal:
//    node scripts/importar-oferta.js
//
// #################################################################################################

import admin from 'firebase-admin';
import fs from 'fs';
import csv from 'csv-parser';

// --- CONFIGURACIÓN ---
// Nombre de la colección en Firestore para la oferta académica del año.
const TARGET_COLLECTION = 'ofertaAcademica_2026';
// Ruta al archivo de clave de servicio de Firebase Admin.
const SERVICE_ACCOUNT_KEY_PATH = './sige-admin-key.json';
// Ruta al archivo CSV que contiene la oferta académica.
const CSV_FILE_PATH = './Inscripciones Terciario - Mat.csv';
// --- FIN DE CONFIGURACIÓN ---

console.log('--- Iniciando script de importación de oferta académica ---');

// 1. Inicialización de Firebase Admin SDK
// =================================================================================================
try {
  const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_KEY_PATH, 'utf8'));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('✅ Conexión con Firebase establecida.');
} catch (error) {
  console.error('❌ Error al inicializar Firebase Admin SDK.');
  console.error('Asegúrate de que el archivo de clave de servicio exista en la ruta:', SERVICE_ACCOUNT_KEY_PATH);
  process.exit(1);
}

const db = admin.firestore();
const materiasMap = new Map();

// 2. Función para determinar el Período de Inscripción
// =================================================================================================
function determinarPeriodoId(row) {
  const cursada = row.cursada || '';
  const area = row.Área || '';
  const espacio = row.espacio || '';

  // Lógica para 2do cuatrimestre
  if (cursada.toUpperCase().includes('2C')) {
    return 'ago-2026-2docuatri';
  }

  // Lógica para instrumentos o grupos reducidos
  if (area.toLowerCase().includes('instrumento') || espacio.toLowerCase() === 'gr') {
    return 'feb-2026-instrumento';
  }

  // Por defecto, es una materia colectiva de inscripción en Febrero
  return 'feb-2026-colectivas';
}


// 3. Lectura y procesamiento del archivo CSV
// =================================================================================================
console.log(`Leyendo el archivo CSV desde: ${CSV_FILE_PATH}`);

fs.createReadStream(CSV_FILE_PATH)
  .pipe(csv())
  .on('data', (row) => {
    // Validamos que la fila tenga los datos mínimos para ser procesada.
    const materiaId = row.codM;
    const secuenciaId = row['sec.'];

    if (!materiaId || !secuenciaId || materiaId.toLowerCase() === 'no coincide') {
      // Opcional: puedes registrar las filas que se omiten.
      // console.warn(`Fila omitida por datos incompletos: Materia "${row.Materia}", Secuencia "${secuenciaId}"`);
      return;
    }

    // Si la materia no está en nuestro mapa, la agregamos.
    if (!materiasMap.has(materiaId)) {
      materiasMap.set(materiaId, {
        materiaId: materiaId,
        nombre: row.Materia || 'Nombre no especificado',
        año: row.año || '',
        cursada: row.cursada || '',
        campo: row.Campo || '',
        area: row.Área || '',
        planId: materiaId.split('-')[0] || '', // Extrae el ID del plan desde el codM
        secuencias: [],
      });
    }

    // Obtenemos la materia del mapa y añadimos la nueva secuencia.
    const materia = materiasMap.get(materiaId);
    materia.secuencias.push({
      id: secuenciaId,
      horario: row.horario || '',
      aula: row.aula || '',
      docente: row.docente || 'A confirmar',
      periodoId: determinarPeriodoId(row),
    });
  })
  .on('end', async () => {
    console.log(`✅ Lectura de CSV finalizada. Se procesaron ${materiasMap.size} materias únicas.`);
    console.log('--- Iniciando escritura en Firestore ---');
    await escribirEnFirestore();
    console.log('--- Proceso de importación finalizado ---');
  });


// 4. Escritura de los datos en Firestore usando Batches
// =================================================================================================
async function escribirEnFirestore() {
  if (materiasMap.size === 0) {
    console.warn('No hay datos para importar. Finalizando.');
    return;
  }

  const totalOperaciones = Array.from(materiasMap.values()).reduce((acc, m) => acc + 1 + m.secuencias.length, 0);
  console.log(`Se realizarán aproximadamente ${totalOperaciones} operaciones de escritura en Firestore.`);

  // Firestore permite un máximo de 500 operaciones por batch.
  const BATCH_LIMIT = 499;
  let batch = db.batch();
  let operationCount = 0;

  for (const materia of materiasMap.values()) {
    // Añadir la operación para la Materia
    const materiaRef = db.collection(TARGET_COLLECTION).doc(materia.materiaId);
    const materiaData = { ...materia };
    delete materiaData.secuencias; // No guardamos el array de secuencias en el documento principal
    
    batch.set(materiaRef, materiaData, { merge: true }); // merge:true para no sobreescribir datos si ya existe
    operationCount++;

    // Añadir operaciones para cada Secuencia en su subcolección
    for (const secuencia of materia.secuencias) {
      const secuenciaRef = materiaRef.collection('secuencias').doc(secuencia.id);
      batch.set(secuenciaRef, secuencia, { merge: true });
      operationCount++;

      // Si alcanzamos el límite, enviamos el batch y creamos uno nuevo.
      if (operationCount >= BATCH_LIMIT) {
        console.log(`Enviando batch de ${operationCount} operaciones...`);
        await batch.commit();
        batch = db.batch();
        operationCount = 0;
      }
    }
  }

  // Enviar el último batch si queda alguna operación pendiente.
  if (operationCount > 0) {
    console.log(`Enviando batch final de ${operationCount} operaciones...`);
    await batch.commit();
  }

  console.log('✅ Escritura en Firestore completada con éxito.');
}
