// #################################################################################################
// # Script para importar la oferta académica desde un archivo CSV a Firestore (Versión 2)          #
// #################################################################################################
//
// Esta versión implementa la "Arquitectura Unificada":
// 1. Lee la definición canónica de las materias desde los archivos JSON en /public/planes/.
// 2. Lee la oferta de secuencias desde un archivo CSV.
// 3. Crea la colección "ofertaAcademica_YYYY" en Firestore, combinando ambas fuentes.
//
// Uso:
// 1. Asegúrate de tener un archivo de clave de cuenta de servicio de Firebase en la raíz del
//    proyecto. Este script espera un archivo llamado 'sige-admin-key.json'.
//
// 2. Coloca el archivo CSV con la oferta de secuencias en la raíz del proyecto.
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
import path from 'path';
import csv from 'csv-parser';

// --- CONFIGURACIÓN ---
const TARGET_COLLECTION = 'ofertaAcademica_2026';
const SERVICE_ACCOUNT_KEY_PATH = './sige-admin-key.json';
const CSV_FILE_PATH = './Inscripciones Terciario - Mat.csv';
const PLANS_DIR_PATH = './public/planes';
// --- FIN DE CONFIGURACIÓN ---

console.log('--- Iniciando script de importación de oferta académica (v2) ---');

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
const materiasCanonicas = new Map();
const ofertaMaterias = new Map();

// 2. Carga de Materias Canónicas desde archivos JSON
// =================================================================================================
async function cargarPlanesJSON() {
  console.log(`Leyendo los planes desde: ${PLANS_DIR_PATH}`);
  try {
    const files = fs.readdirSync(PLANS_DIR_PATH).filter(file => file.endsWith('.json'));
    for (const file of files) {
      const filePath = path.join(PLANS_DIR_PATH, file);
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const planData = JSON.parse(fileContent);

      // Manejar la estructura de 662.json (objeto con `materias` anidadas)
      if (planData.materias && typeof planData.materias === 'object') {
        for (const materiaId in planData.materias) {
          materiasCanonicas.set(materiaId, {
            ...planData.materias[materiaId],
            materiaId: materiaId,
            planId: planData.plan,
          });
        }
      }
      // Manejar la estructura de 662G.json (array de materias)
      else if (Array.isArray(planData)) {
        planData.forEach(materia => {
          // La estructura de 662G.json no tiene un ID de materia unificado, usamos PCod.
          if (materia.PCod) {
            materiasCanonicas.set(materia.PCod, {
              nombre: materia.Materia,
              nombre_c: materia.NombreCorto || '',
              cursada: materia.Cursada,
              correlativas: {
                cursar: materia.Cursadas,
                aprobar: materia.Aprobadas,
              },
              materiaId: materia.PCod,
              planId: materia.Plan,
            });
          }
        });
      }
    }
    console.log(`✅ Carga de planes finalizada. Se encontraron ${materiasCanonicas.size} materias canónicas.`);
  } catch (error) {
    console.error('❌ Error al leer o procesar los archivos JSON de planes:', error);
    process.exit(1);
  }
}


// 3. Función para determinar el Período de Inscripción
// =================================================================================================
function determinarPeriodoId(row) {
  const cursada = row.cursada || '';
  const area = row.Área || '';
  const espacio = row.espacio || '';

  if (cursada.toUpperCase().includes('2C')) return 'ago-2026-2docuatri';
  if (area.toLowerCase().includes('instrumento') || espacio.toLowerCase() === 'gr') return 'feb-2026-instrumento';
  return 'feb-2026-colectivas';
}


// 4. Lectura y procesamiento del archivo CSV
// =================================================================================================
async function procesarCSV() {
  console.log(`Leyendo el archivo CSV desde: ${CSV_FILE_PATH}`);
  return new Promise((resolve, reject) => {
    fs.createReadStream(CSV_FILE_PATH)
      .pipe(csv())
      .on('data', (row) => {
        const materiaId = row.codM;
        const secuenciaId = row['sec.'];

        if (!materiaId || !secuenciaId || materiaId.toLowerCase() === 'no coincide') {
          return;
        }

        // Si la materia no está en nuestro mapa de OFERTA, la agregamos.
        if (!ofertaMaterias.has(materiaId)) {
          const canonica = materiasCanonicas.get(materiaId);
          if (!canonica) {
            // console.warn(`ADVERTENCIA: La materia con codM "${materiaId}" del CSV no se encontró en los JSON de planes.`);
            return;
          }
          ofertaMaterias.set(materiaId, {
            // Usamos los datos limpios del JSON canónico
            materiaId: canonica.materiaId,
            nombre: canonica.nombre,
            nombre_c: canonica.nombre_c,
            cursada: canonica.cursada,
            planId: canonica.planId,
            secuencias: [],
          });
        }

        // Añadimos la secuencia a la materia correspondiente en la oferta.
        const materiaEnOferta = ofertaMaterias.get(materiaId);
        materiaEnOferta.secuencias.push({
          id: secuenciaId,
          horario: row.horario || '',
          aula: row.aula || '',
          docente: row.docente || 'A confirmar',
          periodoId: determinarPeriodoId(row),
        });
      })
      .on('end', () => {
        console.log(`✅ Lectura de CSV finalizada. Se procesaron ${ofertaMaterias.size} materias para la oferta.`);
        resolve();
      })
      .on('error', reject);
  });
}


// 5. Escritura de los datos en Firestore
// =================================================================================================
async function escribirEnFirestore() {
  if (ofertaMaterias.size === 0) {
    console.warn('No hay datos de oferta para importar. Finalizando.');
    return;
  }

  const BATCH_LIMIT = 499;
  let batch = db.batch();
  let operationCount = 0;

  for (const materia of ofertaMaterias.values()) {
    const materiaRef = db.collection(TARGET_COLLECTION).doc(materia.materiaId);
    const materiaData = { ...materia };
    delete materiaData.secuencias;

    batch.set(materiaRef, materiaData, { merge: true });
    operationCount++;

    for (const secuencia of materia.secuencias) {
      const secuenciaRef = materiaRef.collection('secuencias').doc(secuencia.id);
      batch.set(secuenciaRef, secuencia, { merge: true });
      operationCount++;

      if (operationCount >= BATCH_LIMIT) {
        console.log(`Enviando batch de ${operationCount} operaciones...`);
        await batch.commit();
        batch = db.batch();
        operationCount = 0;
      }
    }
  }

  if (operationCount > 0) {
    console.log(`Enviando batch final de ${operationCount} operaciones...`);
    await batch.commit();
  }

  console.log('✅ Escritura en Firestore completada con éxito.');
}

// --- Ejecución Principal ---
async function main() {
  await cargarPlanesJSON();
  await procesarCSV();
  await escribirEnFirestore();
  console.log('--- Proceso de importación finalizado ---');
}

main().catch(console.error);