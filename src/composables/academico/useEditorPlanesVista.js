// src/composables/academico/useEditorPlanesVista.js
//
// Orquestación (view-model) de `src/views/coordinacion/EditorPlanes.vue`.
//
// Encapsula el estado de UI y las acciones que antes vivían en el `script
// setup` de la vista (AGENTS.md §3): apertura/guardado/eliminación de
// borradores, selector de materia con URL (`?abrir=...&materia=...`), estado
// de revisión, comentarios, cambios sin guardar y vista mobile.
//
// No reimplementa dominio ni persistencia: combina `useEditorPlanes`,
// `useGestionPlanes`, `useComentariosPlanes` y `useCatalogoPlanes`, que son los
// composables que ya conocen el modelo y Firestore.
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import { useAuth } from '@/composables/auth/useAuth.js'
import { useCatalogoPlanes } from '@/composables/academico/useCatalogoPlanes.js'
import { useComentariosPlanes } from '@/composables/academico/useComentariosPlanes.js'
import { useEditorPlanes } from '@/composables/academico/useEditorPlanes.js'
import { useGestionPlanes } from '@/composables/academico/useGestionPlanes.js'

/**
 * Composable de orquestación de la vista del editor de planes.
 */
export function useEditorPlanesVista() {
  const route = useRoute()
  const router = useRouter()
  const { user } = useAuth()
  const { catalogo: catalogoActual, asegurarCatalogo } = useCatalogoPlanes()

  const {
    planesGuardados,
    cargandoLista,
    refrescarLista,
    cargarBorrador,
    guardarBorrador,
    eliminarBorrador,
    marcarListoParaPublicar: marcarListoComposable,
    volverARevision: volverARevisionComposable
  } = useGestionPlanes()

  const {
    listarComentarios,
    agregarComentario,
    resolverComentario,
    reabrirComentario,
    eliminarComentario
  } = useComentariosPlanes()

  const {
    materias,
    planCodigo,
    planCodigoOrigen,
    planNombre,
    disponible,
    errores,
    advertencias,
    valido,
    hayPregrado,
    materiasPorAnio,
    materiasLista,
    importarJSONPlan,
    agregarMateria,
    eliminarMateria,
    actualizarMateria,
    actualizarCondicion,
    validar: validarComposable,
    generarJSONCatalogo,
    generarJSONDetalle,
    descargarJSON,
    copiarJSON
  } = useEditorPlanes()

  // --- Estado local de la vista ---
  const erroresImport = ref([])
  const mensajeExport = ref('')
  const guardandoNube = ref(false)
  const mensajeGuardado = ref('')

  // --- Estado de revisión y comentarios del plan abierto ---
  const estadoRevisionActual = ref('en_edicion')
  const cambiandoEstado = ref(false)
  const comentarios = ref([])
  const cargandoComentarios = ref(false)
  const errorComentarios = ref('')
  const codigoSeleccionado = ref('')
  const vistaMobile = ref('lista')
  const snapshotGuardado = ref('')

  const esCoordinacion = computed(() => user.value?.roles?.includes('coordinacion') === true)

  const materiasCount = computed(() => Object.keys(materias.value).length)

  /** Clase visual de la píldora de estado de revisión. */
  const claseEstadoRevision = computed(() => {
    switch (estadoRevisionActual.value) {
      case 'listo_para_publicar':
        return 'bg-green-100 text-green-800 px-2 py-1 rounded'
      case 'revision':
        return 'bg-amber-100 text-amber-800 px-2 py-1 rounded'
      default:
        return 'bg-stone-200 text-stone-700 px-2 py-1 rounded'
    }
  })

  /**
   * Materias como array plano, ordenadas por año y código natural.
   * @returns {{ codigo: string }[]}
   */
  const materiasOrdenadas = computed(() =>
    Object.entries(materias.value)
      .map(([codigo, materia]) => ({ codigo, ...materia }))
      .sort((a, b) => {
        const anioA = Number.isFinite(Number(a.anio)) ? Number(a.anio) : -1
        const anioB = Number.isFinite(Number(b.anio)) ? Number(b.anio) : -1
        if (anioA !== anioB) return anioA - anioB
        return String(a.codigo).localeCompare(String(b.codigo), 'es', { numeric: true })
      })
  )

  /** Materia abierta en el detalle, con su código incluido. */
  const materiaSeleccionada = computed(() => {
    const materia = materias.value[codigoSeleccionado.value]
    return materia ? { codigo: codigoSeleccionado.value, ...materia } : null
  })

  /** Cantidad de años distintos del plan. */
  const aniosCount = computed(() => Object.keys(materiasPorAnio.value).length)

  /** Materias a las que les falta nombre o cursada. */
  const faltantesCount = computed(
    () =>
      materiasOrdenadas.value.filter(
        (materia) => !String(materia.nombre || '').trim() || !materia.cursada
      ).length
  )

  /** Comentarios del plan sin resolver. */
  const comentariosAbiertos = computed(
    () => comentarios.value.filter((comentario) => !comentario.resuelto).length
  )

  /** JSON canónico del estado actual (misma forma que el detalle exportado). */
  const jsonActual = computed(() => {
    if (!planCodigo.value || materiasCount.value === 0) return ''
    return JSON.stringify(generarJSONDetalle())
  })

  /** Indica si hay cambios respecto del último estado importado/guardado. */
  const hayCambiosSinGuardar = computed(
    () => snapshotGuardado.value !== '' && jsonActual.value !== snapshotGuardado.value
  )

  /**
   * Refleja la selección en la URL (`?abrir=...&materia=...`) sin recargar.
   * @param {string} codigo
   */
  function actualizarQueryMateria(codigo) {
    const query = { ...route.query }
    if (planCodigo.value) query.abrir = planCodigo.value
    if (codigo) query.materia = codigo
    else delete query.materia
    router.replace({ query }).catch(() => {})
  }

  /**
   * Aplica un cambio de campo sobre la materia seleccionada.
   * @param {string} campo
   * @param {*} valor
   */
  function onActualizarCampo(campo, valor) {
    if (!materiaSeleccionada.value) return
    actualizarMateria(materiaSeleccionada.value.codigo, campo, valor)
  }

  /**
   * Aplica un cambio de correlativa sobre la materia seleccionada.
   * @param {'cursar'|'aprobar'} tipo
   * @param {Object|null} condicion
   */
  function onActualizarCondicion(tipo, condicion) {
    if (!materiaSeleccionada.value) return
    actualizarCondicion(materiaSeleccionada.value.codigo, tipo, condicion)
  }

  /**
   * Elimina una materia y selecciona la siguiente (o la anterior si era la última).
   * @param {string} codigo
   */
  function onEliminarMateria(codigo) {
    const lista = materiasOrdenadas.value
    const indice = lista.findIndex((materia) => materia.codigo === codigo)
    eliminarMateria(codigo)

    const restantes = lista.filter((materia) => materia.codigo !== codigo)
    codigoSeleccionado.value = restantes.length
      ? restantes[Math.min(Math.max(indice, 0), restantes.length - 1)].codigo
      : ''
    vistaMobile.value = codigoSeleccionado.value ? 'detalle' : 'lista'
    actualizarQueryMateria(codigoSeleccionado.value)
  }

  /**
   * Selecciona una materia desde la lista o un enlace compartido.
   * @param {string} codigo
   */
  function onSeleccionarMateria(codigo) {
    codigoSeleccionado.value = codigo
    vistaMobile.value = 'detalle'
    actualizarQueryMateria(codigo)
  }

  /** Vuelve a la lista de materias en mobile. */
  function volverAListaMobile() {
    vistaMobile.value = 'lista'
  }

  /** Restaura `?materia` si existe en el plan; si no, selecciona la primera. */
  function seleccionarMateriaInicial() {
    const desdeUrl = String(route.query?.materia || '')
    const valida = desdeUrl && materias.value[desdeUrl]
    codigoSeleccionado.value = valida
      ? desdeUrl
      : materiasOrdenadas.value[0]?.codigo || ''
    vistaMobile.value = valida ? 'detalle' : 'lista'
    actualizarQueryMateria(codigoSeleccionado.value)
  }

  /**
   * Carga los comentarios de un borrador.
   * @param {string} codigo
   */
  async function cargarComentarios(codigo) {
    if (!codigo) {
      comentarios.value = []
      return
    }

    cargandoComentarios.value = true
    errorComentarios.value = ''

    const resultado = await listarComentarios(codigo)
    if (resultado.exito) {
      comentarios.value = resultado.datos
    } else {
      errorComentarios.value = resultado.error?.message || 'No se pudieron cargar los comentarios.'
    }

    cargandoComentarios.value = false
  }

  /**
   * Selecciona un plan provisorio; confirma si hay cambios sin guardar.
   * @param {string} codigo
   * @param {Event} [event]
   */
  function onSeleccionarPlan(codigo, event) {
    if (!codigo) return
    if (
      hayCambiosSinGuardar.value &&
      !window.confirm('Hay cambios sin guardar en el plan actual. ¿Descartarlos y abrir otro?')
    ) {
      if (event?.target) event.target.value = planCodigo.value
      return
    }
    abrirBorrador(codigo)
  }

  /**
   * Elimina el borrador abierto (no toca el plan publicado) y limpia el editor.
   */
  async function eliminarPlanAbierto() {
    const codigo = planCodigo.value
    if (!codigo) return
    if (!window.confirm(`¿Eliminar el borrador del plan ${codigo}? El plan publicado no se modifica.`)) {
      return
    }

    const resultado = await eliminarBorrador(codigo)
    if (!resultado.exito) {
      erroresImport.value = [resultado.error?.message || 'No se pudo eliminar el borrador.']
      return
    }

    materias.value = {}
    planCodigo.value = ''
    planNombre.value = ''
    planCodigoOrigen.value = ''
    disponible.value = false
    estadoRevisionActual.value = 'en_edicion'
    comentarios.value = []
    codigoSeleccionado.value = ''
    snapshotGuardado.value = ''
    vistaMobile.value = 'lista'
    const query = { ...route.query }
    delete query.abrir
    delete query.materia
    router.replace({ query }).catch(() => {})
    mensajeGuardado.value = `Borrador ${codigo} eliminado.`
  }

  /**
   * Abre un borrador guardado en Firestore y lo carga en el editor.
   * @param {string} codigo
   */
  async function abrirBorrador(codigo) {
    erroresImport.value = []
    mensajeGuardado.value = ''
    mensajeExport.value = ''
    codigoSeleccionado.value = ''
    snapshotGuardado.value = ''

    const resultado = await cargarBorrador(codigo)
    if (!resultado.exito) {
      erroresImport.value = [resultado.error?.message || 'No se pudo abrir el borrador.']
      return
    }

    const { jsonTexto, nombre, estadoRevision } = resultado.datos
    const importado = await importarJSONPlan(jsonTexto, {
      planCodigo: codigo,
      planNombre: nombre
    })
    erroresImport.value = importado.errores || []
    estadoRevisionActual.value = estadoRevision || 'en_edicion'
    mensajeGuardado.value = `Borrador ${codigo} cargado desde la nube.`

    await cargarComentarios(codigo)
    seleccionarMateriaInicial()
    snapshotGuardado.value = jsonActual.value
  }

  /** Marca el plan abierto como listo para publicar. */
  async function marcarListo() {
    if (!planCodigo.value) return

    cambiandoEstado.value = true
    erroresImport.value = []

    const resultado = await marcarListoComposable(planCodigo.value, {
      uid: user.value?.uid || '',
      email: user.value?.email || ''
    })

    cambiandoEstado.value = false

    if (resultado.exito) {
      estadoRevisionActual.value = 'listo_para_publicar'
      mensajeGuardado.value = `Plan ${planCodigo.value} marcado como listo para publicar.`
    } else {
      erroresImport.value = [resultado.error?.message || 'No se pudo cambiar el estado.']
    }
  }

  /** Devuelve el plan abierto a "en edición". */
  async function volverARevision() {
    if (!planCodigo.value) return

    cambiandoEstado.value = true
    erroresImport.value = []

    const resultado = await volverARevisionComposable(planCodigo.value, {
      uid: user.value?.uid || '',
      email: user.value?.email || ''
    })

    cambiandoEstado.value = false

    if (resultado.exito) {
      estadoRevisionActual.value = 'en_edicion'
      mensajeGuardado.value = `Plan ${planCodigo.value} devuelto a edición.`
    } else {
      erroresImport.value = [resultado.error?.message || 'No se pudo cambiar el estado.']
    }
  }

  /**
   * Agrega un comentario al plan abierto.
   * @param {{ texto: string, tipo: string, materiaId: string|null }} datos
   */
  async function onAgregarComentario({ texto, tipo, materiaId }) {
    if (!planCodigo.value) {
      erroresImport.value = ['Cargá o guardá un plan antes de comentar.']
      return
    }

    const resultado = await agregarComentario(planCodigo.value, {
      texto,
      tipo,
      materiaId: materiaId || null,
      uid: user.value?.uid || '',
      email: user.value?.email || ''
    })

    if (resultado.exito) await cargarComentarios(planCodigo.value)
    else errorComentarios.value = resultado.error?.message || 'No se pudo agregar el comentario.'
  }

  /** Resuelve un comentario. */
  async function onResolverComentario(id) {
    const resultado = await resolverComentario(planCodigo.value, id, {
      uid: user.value?.uid || ''
    })
    if (resultado.exito) await cargarComentarios(planCodigo.value)
    else errorComentarios.value = resultado.error?.message || 'No se pudo resolver el comentario.'
  }

  /** Reabre un comentario resuelto. */
  async function onReabrirComentario(id) {
    const resultado = await reabrirComentario(planCodigo.value, id)
    if (resultado.exito) await cargarComentarios(planCodigo.value)
    else errorComentarios.value = resultado.error?.message || 'No se pudo reabrir el comentario.'
  }

  /** Elimina un comentario. */
  async function onEliminarComentario(id) {
    if (!window.confirm('¿Eliminar este comentario?')) return
    const resultado = await eliminarComentario(planCodigo.value, id)
    if (resultado.exito) await cargarComentarios(planCodigo.value)
    else errorComentarios.value = resultado.error?.message || 'No se pudo eliminar el comentario.'
  }

  /** Guarda el estado actual del editor como borrador en la nube. */
  async function guardarBorradorEnNube() {
    if (!planCodigo.value) {
      erroresImport.value = ['Definí un código de plan antes de guardarlo.']
      return
    }

    guardandoNube.value = true
    mensajeGuardado.value = ''

    try {
      const detalleJson = generarJSONDetalle()
      const resultado = await guardarBorrador({
        codigo: planCodigo.value,
        nombre: planNombre.value,
        jsonTexto: JSON.stringify(detalleJson, null, 2),
        materiasCount: materiasCount.value,
        uid: user.value?.uid || '',
        email: user.value?.email || ''
      })

      mensajeGuardado.value = resultado.exito
        ? `Borrador del plan ${resultado.datos.codigo} guardado en la nube.`
        : `No se pudo guardar el borrador: ${resultado.error?.message}`
      if (resultado.exito) {
        snapshotGuardado.value = JSON.stringify(detalleJson)
        await refrescarLista()
      } else {
        erroresImport.value = [resultado.error?.message || 'No se pudo guardar el borrador.']
      }
    } catch (err) {
      erroresImport.value = [err.message || 'Error al guardar el borrador.']
    } finally {
      guardandoNube.value = false
    }
  }

  /**
   * Agrega una materia en el año indicado y la selecciona.
   * @param {string|number} anio
   */
  function agregarMateriaEn(anio) {
    if (!planCodigo.value) {
      erroresImport.value = ['Definí el código del plan antes de agregar materias.']
      return
    }
    const nuevoCodigo = agregarMateria(anio)
    if (nuevoCodigo) codigoSeleccionado.value = nuevoCodigo
  }

  /** Ejecuta la validación del plan abierto. */
  async function ejecutarValidacion() {
    mensajeExport.value = ''
    await validarComposable()
  }

  /** Exporta el catálogo `planes.json` con todos los planes conocidos. */
  async function exportarCatalogo() {
    const listaPlanes = Object.values(catalogoActual.value || {})
    const catalogo = await generarJSONCatalogo(listaPlanes)
    descargarJSON(catalogo, 'planes.json')
    mensajeExport.value = 'Catálogo planes.json descargado.'
  }

  /** Exporta el detalle del plan abierto. */
  function exportarDetalle() {
    const detalle = generarJSONDetalle({ revisadoPor: user.value?.uid || null })
    if (!detalle) return
    descargarJSON(detalle, `${planCodigo.value}.json`)
    mensajeExport.value = `Detalle ${planCodigo.value}.json descargado.`
  }

  /** Copia el detalle del plan abierto al portapapeles. */
  async function copiarDetalle() {
    const detalle = generarJSONDetalle({ revisadoPor: user.value?.uid || null })
    if (!detalle) return

    try {
      await copiarJSON(detalle)
      mensajeExport.value = 'JSON del plan copiado al portapapeles.'
    } catch (err) {
      mensajeExport.value = err.message || 'No se pudo copiar al portapapeles.'
    }
  }

  /** Avisa al cerrar o recargar la pestaña si hay cambios sin guardar. */
  function onBeforeUnload(event) {
    if (!hayCambiosSinGuardar.value) return
    event.preventDefault()
    event.returnValue = ''
  }

  onBeforeRouteLeave(() => {
    if (!hayCambiosSinGuardar.value) return true
    return window.confirm('Hay cambios sin guardar en el plan. ¿Salir igual?')
  })

  onMounted(() => window.addEventListener('beforeunload', onBeforeUnload))
  onUnmounted(() => window.removeEventListener('beforeunload', onBeforeUnload))

  /** Carga catálogo, lista de borradores y abre el plan de `?abrir`. */
  async function inicializar() {
    if (!esCoordinacion.value) return
    await asegurarCatalogo()
    await refrescarLista()
    const codigo = route.query?.abrir
    if (codigo) abrirBorrador(String(codigo))
  }

  onMounted(inicializar)

  return {
    // Selector y borradores
    planesGuardados,
    cargandoLista,
    refrescarLista,
    onSeleccionarPlan,
    eliminarPlanAbierto,

    // Datos del plan (useEditorPlanes)
    materias,
    planCodigo,
    planCodigoOrigen,
    planNombre,
    disponible,
    errores,
    advertencias,
    valido,
    hayPregrado,
    materiasLista,
    materiasOrdenadas,

    // Derivados de la vista
    esCoordinacion,
    materiasCount,
    aniosCount,
    faltantesCount,
    comentariosAbiertos,
    claseEstadoRevision,
    jsonActual,
    hayCambiosSinGuardar,

    // Selección de materia y mobile
    codigoSeleccionado,
    vistaMobile,
    materiaSeleccionada,
    onSeleccionarMateria,
    volverAListaMobile,
    onActualizarCampo,
    onActualizarCondicion,
    onEliminarMateria,
    agregarMateriaEn,

    // Estado de revisión
    estadoRevisionActual,
    cambiandoEstado,
    marcarListo,
    volverARevision,

    // Comentarios
    comentarios,
    cargandoComentarios,
    errorComentarios,
    onAgregarComentario,
    onResolverComentario,
    onReabrirComentario,
    onEliminarComentario,

    // Guardado, validación y exportación
    erroresImport,
    mensajeGuardado,
    guardandoNube,
    guardarBorradorEnNube,
    ejecutarValidacion,
    mensajeExport,
    exportarDetalle,
    exportarCatalogo,
    copiarDetalle,

    // Ciclo de vida / test
    inicializar,
    abrirBorrador,
    onBeforeUnload
  }
}
