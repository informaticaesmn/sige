#!/usr/bin/env node
// scripts/seed-dev.js
//
// Deja staging (`prueba1-esmn`) usable después de una purga:
//   - un usuario de Auth + documento en `usuarios/{uid}` por rol, con custom claims
//   - su legajo en `legajos/{personaId}`
//   - una oferta académica de prueba en `ofertaAcademica/2026-1`
//   - una inscripción pendiente del estudiante (para probar el flujo de bedelía)
//   - un borrador de plan en `planesPendientes/663`
//
// Es idempotente: se puede correr las veces que haga falta. Los usuarios existentes se
// actualizan (contraseña, claims, documento) conservando `personaId` y `creadoEl`.
//
// SEGURIDAD:
//   - Se niega a correr contra cualquier proyecto que no sea `prueba1-esmn`.
//   - Por defecto es dry-run (no escribe). Usar `--apply` para aplicar.
//   - NUNCA usar datos reales de estudiantes: este seed es sintético a propósito.
//
// Uso:
//   $env:GOOGLE_APPLICATION_CREDENTIALS="secrets\prueba1-esmn-ba3fad6bfcff.json"
//   npm run seed:staging            # dry-run
//   npm run seed:staging -- --apply # escribe
//
// Variables opcionales:
//   SEED_PASSWORD  contraseña de todos los usuarios (default: SigeStaging2026!)
//   SEED_DOMAIN    dominio de los emails (default: example.com)

import 'dotenv/config'
import { existsSync, readFileSync } from 'fs'
import { randomUUID } from 'crypto'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'

const PROYECTO_STAGING = 'prueba1-esmn'
const CICLO = '2026-1'
const SUBCOLECCION_INSCRIPCIONES = `inscripciones${CICLO.replace('-', '')}` // inscripciones20261
const PLAN_ESTUDIANTE = '662'
const PLAN_BORRADOR = '663'

const APLICAR = process.argv.includes('--apply')
const DOMINIO = (process.env.SEED_DOMAIN || 'example.com').trim().toLowerCase()
const PASSWORD = process.env.SEED_PASSWORD || 'SigeStaging2026!'

/**
 * Usuarios de prueba. Un rol por usuario (el modelo soporta varios).
 * Los DNI son ficticios y no colisionan con rangos reales usados en la escuela.
 */
const USUARIOS = [
  { rol: 'admin', nombre: 'Admin', apellido: 'Staging', dni: '90000001', email: `admin@${DOMINIO}` },
  { rol: 'coordinacion', nombre: 'Coordinación', apellido: 'Staging', dni: '90000002', email: `coordinacion@${DOMINIO}` },
  { rol: 'bedel', nombre: 'Bedel', apellido: 'Staging', dni: '90000003', email: `bedel@${DOMINIO}` },
  { rol: 'docente', nombre: 'Docente', apellido: 'Staging', dni: '90000004', email: `docente@${DOMINIO}` },
  {
    rol: 'estudiante',
    nombre: 'Estudiante',
    apellido: 'Staging',
    dni: '90000005',
    email: `estudiante@${DOMINIO}`,
    planes: [PLAN_ESTUDIANTE],
    numeroLegajo: '2026-9001'
  }
]

/**
 * Lee el catálogo de planes para guardar el nombre completo en el documento del usuario.
 * @returns {Record<string, string>} mapa código → nombre
 */
function leerNombresDePlanes() {
  const ruta = new URL('../public/planes/planes.json', import.meta.url)
  const json = JSON.parse(readFileSync(ruta, 'utf8'))
  const nombres = {}
  for (const plan of json.planes || []) {
    if (plan?.codigo) nombres[plan.codigo] = plan.nombre || plan.codigo
  }
  return nombres
}

/**
 * Resuelve la service account desde `FIREBASE_SERVICE_ACCOUNT` o
 * `GOOGLE_APPLICATION_CREDENTIALS`. Falla con un mensaje claro si no hay credenciales.
 * @returns {Object} JSON de la service account
 */
function cargarServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  }

  const ruta = process.env.GOOGLE_APPLICATION_CREDENTIALS
  if (!ruta) {
    console.error('❌ Falta GOOGLE_APPLICATION_CREDENTIALS (o FIREBASE_SERVICE_ACCOUNT).')
    console.error('   Ejemplo: $env:GOOGLE_APPLICATION_CREDENTIALS="secrets\\prueba1-esmn-ba3fad6bfcff.json"')
    process.exit(1)
  }
  if (!existsSync(ruta)) {
    console.error(`❌ No existe el archivo de credenciales: ${ruta}`)
    process.exit(1)
  }
  return JSON.parse(readFileSync(ruta, 'utf8'))
}

/**
 * Aborta si las credenciales no son del proyecto de staging. Evita que un seed
 * accidental escriba datos de prueba en producción.
 * @param {Object} serviceAccount
 */
function verificarProyecto(serviceAccount) {
  const proyecto = serviceAccount.project_id || ''
  if (proyecto !== PROYECTO_STAGING) {
    console.error(`❌ Este seed solo corre contra '${PROYECTO_STAGING}'. Las credenciales son de '${proyecto || 'desconocido'}'.`)
    process.exit(1)
  }
}

/**
 * Busca un usuario de Auth por email.
 * @param {import('firebase-admin/auth').Auth} auth
 * @param {string} email
 * @returns {Promise<Object|null>}
 */
async function buscarUsuario(auth, email) {
  try {
    return await auth.getUserByEmail(email)
  } catch (error) {
    if (error.code === 'auth/user-not-found') return null
    throw error
  }
}

/**
 * Construye el documento de `usuarios/{uid}` con el shape v2.
 * @param {Object} usuario definición de USUARIOS
 * @param {string} uid
 * @param {string} personaId
 * @param {Record<string,string>} nombresPlanes
 * @param {Object} [existente] documento previo (para conservar creadoEl)
 * @returns {Object}
 */
function construirUsuario(usuario, uid, personaId, nombresPlanes, existente = {}) {
  const ahora = Timestamp.now()
  const planes = {}

  for (const codigo of usuario.planes || []) {
    planes[codigo] = {
      id: codigo,
      nombre: nombresPlanes[codigo] || codigo,
      estado: 'activo',
      fechaInscripcion: Timestamp.fromDate(new Date('2026-03-01T12:00:00Z')),
      vigente: true,
      origen: 'script',
      ultimaAcreditacion: null,
      estadoCalculadoEn: null
    }
  }

  return {
    personaId,
    dni: usuario.dni,
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    email: usuario.email,
    roles: [usuario.rol],
    estadoRegistro: 'registrado',
    uid,
    estadoUsuario: 'activo',
    estadoUsuarioActualizadoEn: null,
    motivoEstado: '',
    planes,
    numeroLegajo: usuario.numeroLegajo || null,
    creadoEl: existente.creadoEl || ahora,
    actualizadoEn: ahora
  }
}

/**
 * Construye el legajo digital mínimo (sin datos administrativos).
 * @param {Object} usuario
 * @param {string} personaId
 * @param {string} uid
 * @param {Object} [existente]
 * @returns {Object}
 */
function construirLegajo(usuario, personaId, uid, existente = {}) {
  const ahora = Timestamp.now()
  return {
    personaId,
    numeroLegajo: usuario.numeroLegajo || null,
    usuarioDocId: uid,
    dni: usuario.dni,
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    fechaNacimiento: null,
    domicilios: [],
    telefonos: [],
    datosAdministrativos: {},
    documentacion: [],
    creadoEl: existente.creadoEl || ahora,
    actualizadoEn: ahora,
    actualizadoPor: null
  }
}

/**
 * Documento de oferta académica de prueba. La etapa está vigente (desde/hasta
 * alrededor de hoy) porque `useOfertaAcademica` necesita `desde.toDate()`.
 * @returns {Object}
 */
function construirOferta() {
  const ahora = Date.now()
  const desde = Timestamp.fromDate(new Date(ahora - 7 * 24 * 60 * 60 * 1000))
  const hasta = Timestamp.fromDate(new Date(ahora + 60 * 24 * 60 * 60 * 1000))

  return {
    nombreCiclo: `Ciclo ${CICLO} (staging)`,
    etapas: [
      {
        nombre: 'Inscripciones',
        descripcion: 'Etapa de prueba generada por scripts/seed-dev.js',
        desde,
        hasta,
        materias: [
          {
            id: '662-0.1',
            nombre: 'Audioperceptiva',
            tipo: 'colectiva',
            comisiones: [
              { id: 'C1', cupo: 30, horario: 'Lun 18:00–20:00', aula: 'Aula 1', docente: 'Docente Staging' }
            ]
          },
          {
            id: '662-0.2',
            nombre: 'Educación Vocal',
            tipo: 'colectiva',
            comisiones: [
              { id: 'C1', cupo: 30, horario: 'Mar 18:00–20:00', aula: 'Aula 2', docente: 'Docente Staging' }
            ]
          }
        ]
      }
    ],
    actualizadoEn: Timestamp.now()
  }
}

/**
 * Borrador de plan para la bandeja de revisión (código 663, no disponible en el catálogo).
 * @param {{ uid: string, email: string }} autor
 * @returns {Object}
 */
function construirBorrador(autor) {
  const json = {
    plan: PLAN_BORRADOR,
    nombre: '663 Profesorado de Música con orientación en Dirección Coral (borrador de prueba)',
    formato: 'objeto',
    materias: {
      '663-0.1': {
        id: '663-0.1',
        anio: 0,
        nombre: 'Audioperceptiva',
        cursada: 'anual',
        correlativas: { cursar: null, aprobar: null },
        equivale_a: []
      },
      '663-1.1': {
        id: '663-1.1',
        anio: 1,
        nombre: 'Dirección Coral I',
        cursada: 'anual',
        correlativas: { cursar: '663-0.1', aprobar: null },
        equivale_a: []
      }
    },
    disponible: false
  }

  return {
    codigo: PLAN_BORRADOR,
    nombre: '663 Profesorado de Música con orientación en Dirección Coral',
    jsonTexto: JSON.stringify(json, null, 2),
    materiasCount: Object.keys(json.materias).length,
    actualizadoEn: Timestamp.now(),
    actualizadoPor: autor.uid,
    actualizadoPorEmail: autor.email,
    estadoRevision: 'revision',
    listoParaPublicarEn: null,
    listoParaPublicarPor: '',
    publicadoEn: null
  }
}

/**
 * Punto de entrada: conecta, verifica el proyecto, recorre usuarios y escribe el seed.
 */
async function main() {
  const serviceAccount = cargarServiceAccount()
  verificarProyecto(serviceAccount)

  const app = initializeApp({ credential: cert(serviceAccount) }, 'seed-dev')
  const auth = getAuth(app)
  const db = getFirestore(app)
  const nombresPlanes = leerNombresDePlanes()

  console.log(`Proyecto: ${serviceAccount.project_id}`)
  console.log(`Modo: ${APLICAR ? 'APPLY (escribe)' : 'DRY-RUN (no escribe)'}`)
  console.log(`Emails: @${DOMINIO} | Password: ${PASSWORD}`)
  console.log('')

  const resumen = []
  let estudianteUid = null

  for (const usuario of USUARIOS) {
    const email = usuario.email.toLowerCase().trim()
    const existente = await buscarUsuario(auth, email)
    const uid = existente?.uid || null

    // personaId estable: se reutiliza el del documento previo si existe.
    let personaId = null
    let docPrevio = {}
    if (uid) {
      const snap = await db.collection('usuarios').doc(uid).get()
      docPrevio = snap.exists ? snap.data() : {}
      personaId = docPrevio.personaId || null
    }
    personaId = personaId || randomUUID()

    resumen.push({ ...usuario, uid, personaId, existente: !!existente })

    if (!APLICAR) {
      console.log(`  [dry-run] ${existente ? 'actualizaría' : 'crearía'} ${usuario.rol}: ${email}`)
      if (usuario.rol === 'estudiante') estudianteUid = uid || 'UID-DEL-ESTUDIANTE'
      continue
    }

    // 1. Auth: crear o actualizar (contraseña, nombre visible, claims).
    let usuarioAuth = existente
    if (!usuarioAuth) {
      usuarioAuth = await auth.createUser({
        email,
        password: PASSWORD,
        displayName: `${usuario.nombre} ${usuario.apellido}`,
        emailVerified: true,
        disabled: false
      })
    } else {
      usuarioAuth = await auth.updateUser(usuarioAuth.uid, {
        password: PASSWORD,
        displayName: `${usuario.nombre} ${usuario.apellido}`,
        emailVerified: true,
        disabled: false
      })
    }

    await auth.setCustomUserClaims(usuarioAuth.uid, { roles: [usuario.rol] })

    // 2. Firestore: documento del usuario y legajo.
    const docUsuario = construirUsuario(usuario, usuarioAuth.uid, personaId, nombresPlanes, docPrevio)
    const docLegajo = construirLegajo(usuario, personaId, usuarioAuth.uid)

    const batch = db.batch()
    batch.set(db.collection('usuarios').doc(usuarioAuth.uid), docUsuario)
    batch.set(db.collection('legajos').doc(personaId), docLegajo)

    // Si quedó un pre-registro viejo con ID=email, se elimina (ya hay doc por uid).
    batch.delete(db.collection('usuarios').doc(email))

    await batch.commit()

    console.log(`  ✅ ${usuario.rol}: ${email} (uid ${usuarioAuth.uid})`)
    if (usuario.rol === 'estudiante') estudianteUid = usuarioAuth.uid
  }

  if (!APLICAR) {
    console.log('\n[dry-run] También se escribirían:')
    console.log(`  - ofertaAcademica/${CICLO} (2 materias, etapa vigente)`)
    console.log(`  - planesPendientes/${PLAN_BORRADOR} (estado: revision)`)
    console.log(`  - usuarios/${estudianteUid}/${SUBCOLECCION_INSCRIPCIONES}/662-0.1 (inscripción pendiente)`)
    console.log('\nEjecutá con --apply para escribir.')
    return
  }

  // 3. Oferta académica del ciclo.
  await db.collection('ofertaAcademica').doc(CICLO).set(construirOferta())

  // 4. Borrador de plan (autor: admin).
  const admin = resumen.find((u) => u.rol === 'admin')
  await db.collection('planesPendientes').doc(PLAN_BORRADOR).set({
    ...construirBorrador({ uid: admin.uid, email: admin.email })
  })

  // 5. Inscripción pendiente del estudiante (para el flujo de bedelía).
  if (estudianteUid) {
    await db
      .collection('usuarios')
      .doc(estudianteUid)
      .collection(SUBCOLECCION_INSCRIPCIONES)
      .doc('662-0.1')
      .set({
        materiaId: '662-0.1',
        comisionId: 'C1',
        estado: 'pendiente',
        fechaInscripcion: Timestamp.now(),
        ciclo: CICLO
      })
  }

  console.log('\n🏁 Seed aplicado.')
  console.log(`   Oferta:    ofertaAcademica/${CICLO}`)
  console.log(`   Borrador:  planesPendientes/${PLAN_BORRADOR}`)
  console.log(`   Inscripción: usuarios/${estudianteUid}/${SUBCOLECCION_INSCRIPCIONES}/662-0.1`)
  console.log('\nUsuarios (todos con la misma contraseña):')
  for (const u of resumen) console.log(`   ${u.rol.padEnd(12)} ${u.email}`)
}

main().catch((error) => {
  console.error('❌ Error en el seed:', error.message)
  process.exit(1)
})
