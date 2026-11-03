// src/composables/academico/useGestionPlanes.js
//
// Orquestación de los borradores de planes de estudio (`planesPendientes`) para
// las vistas de coordinación. Encapsula el estado y las acciones que antes
// vivían en el `script setup` de las vistas (AGENTS.md §3): listar, abrir,
// importar/guardar y eliminar borradores.
//
// La persistencia pura la sigue haciendo `usePlanesPendientes.js`; este
// composable agrega el estado de UI (`planesGuardados`, `cargandoLista`,
// `errorLista`) y la derivación de metadatos desde el JSON crudo.
//
// Lo consumen `src/views/coordinacion/CargaDatos.vue` (importar y abrir) y
// `src/views/coordinacion/EditorPlanes.vue` (guardar los cambios del editor).
import { computed, ref } from 'vue'
import { ESTADO_REVISION_DEFAULT, usePlanesPendientes } from './usePlanesPendientes.js'

/**
 * Deriva los metadatos canónicos de un JSON de plan crudo, sin depender del
 * editor: código (primer token de `plan`), nombre (sin el prefijo `"Plan "`) y
 * cantidad de materias.
 *
 * @param {string|Object} entrada JSON crudo (string) u objeto ya parseado.
 * @returns {{ codigo: string, nombre: string, materiasCount: number }}
 * @throws {Error} si el JSON no es parseable o no declara el código del plan.
 */
export function metadatosDePlanJson(entrada) {
  let datos
  if (typeof entrada === 'string') {
    datos = JSON.parse(entrada)
  } else if (entrada && typeof entrada === 'object') {
    datos = entrada
  } else {
    throw new Error('El insumo no es un JSON válido.')
  }

  const rawPlan = String(datos.plan ?? datos.codigo ?? '').trim()
  const codigo = rawPlan.split(/\s+/)[0]
  if (!codigo) {
    throw new Error('El JSON no declara el código del plan.')
  }

  const nombre =
    String(datos.nombre ?? '').trim().replace(/^Plan\s+/i, '') || `Plan ${codigo}`

  const materias =
    datos.materias && typeof datos.materias === 'object' ? datos.materias : {}
  const materiasCount = Array.isArray(materias)
    ? materias.length
    : Object.keys(materias).length

  return { codigo, nombre, materiasCount }
}

/**
 * Normaliza la entrada a un texto JSON serializable.
 * @param {string|Object} entrada
 * @returns {string}
 */
function serializarEntrada(entrada) {
  if (typeof entrada === 'string') return entrada
  return JSON.stringify(entrada, null, 2)
}

/**
 * Composable de gestión de borradores de planes (estado + acciones).
 * Todas las acciones devuelven `{ exito, datos, error }` (AGENTS.md §5).
 */
export function useGestionPlanes() {
  const {
    listarPlanesPendientes,
    obtenerPlanPendiente,
    guardarPlanPendiente,
    eliminarPlanPendiente,
    marcarListoParaPublicar: marcarListoPlanPendiente,
    volverARevision: volverPlanPendiente
  } = usePlanesPendientes()

  // --- Estado de UI compartido por las vistas ---
  const planesGuardados = ref([])
  const cargandoLista = ref(false)
  const errorLista = ref('')

  /**
   * Provisorios que el equipo marcó como listos para publicar (bandeja del
   * admin). Se deriva de la lista ya cargada.
   */
  const planesListosParaPublicar = computed(() =>
    planesGuardados.value.filter((plan) => plan.estadoRevision === 'listo_para_publicar')
  )

  /**
   * Recarga la lista de borradores desde Firestore y actualiza el estado.
   * @returns {Promise<{ exito: boolean, datos: Object[], error: any }>}
   */
  async function refrescarLista() {
    cargandoLista.value = true
    errorLista.value = ''

    const resultado = await listarPlanesPendientes()
    if (resultado.exito) {
      planesGuardados.value = resultado.datos
    } else {
      errorLista.value =
        resultado.error?.message || 'No se pudo leer la lista de borradores.'
    }

    cargandoLista.value = false
    return resultado
  }

  /**
   * Abre un borrador guardado devolviendo su JSON crudo.
   * @param {string} codigo
   * @returns {Promise<{ exito: boolean, datos: Object|null, error: any }>}
   */
  async function cargarBorrador(codigo) {
    return obtenerPlanPendiente(codigo)
  }

  /**
   * Guarda (crea o reemplaza) un borrador. No refresca la lista: el editor lo
   * usa sin necesidad de listado.
   * @param {{ codigo: string, nombre?: string, jsonTexto: string, materiasCount?: number, uid?: string, email?: string }} plan
   */
  async function guardarBorrador(plan = {}) {
    return guardarPlanPendiente(plan)
  }

  /**
   * Parsea un JSON de plan crudo y lo guarda como borrador, derivando los
   * metadatos automáticamente. Pensado para la importación desde archivo.
   * @param {string|Object} entrada JSON crudo.
   * @param {{ uid?: string, email?: string }} [auditoria]
   */
  async function importarBorradorDesdeTexto(entrada, { uid = '', email = '' } = {}) {
    let meta
    try {
      meta = metadatosDePlanJson(entrada)
    } catch (error) {
      return { exito: false, datos: null, error }
    }

    const resultado = await guardarBorrador({
      codigo: meta.codigo,
      nombre: meta.nombre,
      jsonTexto: serializarEntrada(entrada),
      materiasCount: meta.materiasCount,
      uid,
      email,
      estadoRevision: ESTADO_REVISION_DEFAULT
    })

    if (resultado.exito) await refrescarLista()
    return resultado
  }

  /**
   * Elimina un borrador y refresca la lista.
   * @param {string} codigo
   */
  async function eliminarBorrador(codigo) {
    const resultado = await eliminarPlanPendiente(codigo)
    if (resultado.exito) await refrescarLista()
    return resultado
  }

  /**
   * Marca un provisorio como listo para publicar y refresca la lista.
   * @param {string} codigo
   * @param {{ uid?: string, email?: string }} [auditoria]
   */
  async function marcarListoParaPublicar(codigo, { uid = '', email = '' } = {}) {
    const resultado = await marcarListoPlanPendiente(codigo, { uid, email })
    if (resultado.exito) await refrescarLista()
    return resultado
  }

  /**
   * Devuelve un provisorio a edición (deshace "listo para publicar").
   * @param {string} codigo
   * @param {{ uid?: string, email?: string }} [auditoria]
   */
  async function volverARevision(codigo, { uid = '', email = '' } = {}) {
    const resultado = await volverPlanPendiente(codigo, { uid, email })
    if (resultado.exito) await refrescarLista()
    return resultado
  }

  return {
    // Estado
    planesGuardados,
    planesListosParaPublicar,
    cargandoLista,
    errorLista,

    // Acciones
    refrescarLista,
    cargarBorrador,
    guardarBorrador,
    importarBorradorDesdeTexto,
    eliminarBorrador,
    marcarListoParaPublicar,
    volverARevision
  }
}
