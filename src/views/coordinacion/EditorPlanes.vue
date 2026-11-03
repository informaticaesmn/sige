<!-- src/views/coordinacion/EditorPlanes.vue -->
<!--
  Editor/Revisor de Planes de Estudio (rol Coordinación).
  Se centra en la edición del plan abierto (materias, correlatividades y
  exportación). La importación de JSON y la gestión de borradores viven en
  CargaDatos.vue; acá se abre un borrador con `?abrir={codigo}`.
-->
<template>
  <div class="min-h-screen font-sans bg-stone-50">
    <div class="container mx-auto px-4 py-6 max-w-7xl">
      <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 class="text-2xl font-semibold text-stone-800">
            Editor de Planes de Estudio
          </h1>
          <p class="text-sm text-stone-500">
            Editar materias, correlatividades y exportar JSON para
            <code class="text-xs bg-stone-200 px-1 py-0.5 rounded">public/planes/</code>.
          </p>
        </div>

        <!-- Acciones rápidas cuando hay materias cargadas -->
        <div v-if="materiasCount > 0" class="flex items-center gap-2">
          <button
            class="btn btn-secondary text-sm"
            :disabled="!planCodigo || guardandoNube"
            @click="guardarBorradorEnNube"
          >
            {{ guardandoNube ? 'Guardando...' : 'Guardar borrador en la nube' }}
          </button>
          <button
            class="btn btn-primary text-sm"
            @click="ejecutarValidacion"
          >
            Validar y verificar
          </button>
        </div>
      </div>

      <!-- Guardia de rol -->
      <div v-if="!esCoordinacion" class="alert alert-danger mb-6">
        Esta sección está reservada al rol de Coordinación.
      </div>

      <template v-else>
        <!-- Selector de planes provisorios -->
        <section class="card mb-6">
          <div class="flex flex-wrap items-end gap-3">
            <div class="flex-1 min-w-[16rem]">
              <label class="form-label text-xs" for="plan-selector">Plan provisorio</label>
              <select
                id="plan-selector"
                class="form-input text-sm w-full"
                :value="planCodigo"
                @change="onSeleccionarPlan($event.target.value)"
              >
                <option value="">— Elegí un plan para editar —</option>
                <option v-for="p in planesGuardados" :key="p.codigo" :value="p.codigo">
                  {{ p.codigo }} · {{ ETIQUETAS_ESTADO_REVISION[p.estadoRevision] || 'En edición' }} · {{ formatearFechaHora(p.actualizadoEn) }}
                </option>
              </select>
            </div>
            <button
              class="btn btn-secondary text-xs"
              :disabled="cargandoLista"
              @click="refrescarLista"
            >
              {{ cargandoLista ? '...' : 'Actualizar lista' }}
            </button>
            <button
              v-if="planCodigo"
              class="btn-link text-xs text-red-600 pb-2"
              :disabled="cargandoLista"
              @click="eliminarPlanAbierto"
            >
              Eliminar borrador
            </button>
            <router-link :to="{ name: 'CoordinacionCarga' }" class="btn-link text-xs pb-2">
              Importar nuevo JSON
            </router-link>
          </div>

          <!-- Estado de revisión del plan abierto -->
          <div
            v-if="materiasCount > 0"
            class="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-stone-200"
          >
            <span class="text-xs font-semibold" :class="claseEstadoRevision">
              {{ ETIQUETAS_ESTADO_REVISION[estadoRevisionActual] || 'En edición' }}
            </span>
            <button
              v-if="estadoRevisionActual !== 'listo_para_publicar'"
              class="btn btn-secondary text-xs"
              :disabled="cambiandoEstado"
              @click="marcarListo"
            >
              Marcar listo para publicar
            </button>
            <button
              v-else
              class="btn btn-secondary text-xs"
              :disabled="cambiandoEstado"
              @click="volverARevision"
            >
              Volver a revisión
            </button>
          </div>
        </section>

        <!-- Mensajes de la apertura de un borrador -->
        <div v-if="erroresImport.length > 0" class="alert alert-danger text-xs mb-4">
          <ul class="list-disc list-inside space-y-0.5">
            <li v-for="(e, i) in erroresImport" :key="i">{{ e }}</li>
          </ul>
        </div>
        <div v-if="mensajeGuardado" class="alert alert-info text-xs mb-4">
          {{ mensajeGuardado }}
        </div>

        <!-- Sin plan abierto -->
        <div v-if="materiasCount === 0" class="card text-center py-10">
          <h2 class="text-lg font-semibold text-stone-700 mb-2">
            No hay ningún plan abierto
          </h2>
          <p class="text-sm text-stone-500 mb-4">
            Elegí un plan provisorio en el selector de arriba, o importá un JSON desde Carga de Datos.
          </p>
          <router-link
            :to="{ name: 'CoordinacionCarga' }"
            class="btn btn-primary text-sm"
          >
            Ir a Carga de Datos
          </router-link>
        </div>

        <!-- ==================== 1. METADATOS Y ESTADO DEL PLAN ==================== -->
        <section v-if="materiasCount > 0" class="card mb-6">
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
              <div>
                <label class="form-label text-xs" for="plan-codigo">Código del plan</label>
                <input
                  id="plan-codigo"
                  v-model="planCodigo"
                  type="text"
                  class="form-input font-mono font-semibold text-sm w-full"
                  placeholder="Ej. 663"
                >
              </div>
              <div class="md:col-span-2">
                <label class="form-label text-xs" for="plan-nombre">Nombre del plan</label>
                <input
                  id="plan-nombre"
                  v-model="planNombre"
                  type="text"
                  class="form-input text-sm w-full"
                  placeholder="Ej. 663 Profesorado de Música"
                >
              </div>
            </div>

            <!-- Aviso si el código editado no coincide con el JSON importado -->
            <p
              v-if="planCodigoOrigen && planCodigo !== planCodigoOrigen"
              class="w-full text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1"
            >
              ⚠ El JSON importado declara el plan <strong>{{ planCodigoOrigen }}</strong>.
              Al exportar se guardará como <strong>{{ planCodigo || '(sin código)' }}</strong>.
            </p>

            <!-- Flag de disponibilidad -->
            <div class="flex items-center gap-2 bg-stone-100 p-2.5 rounded border border-stone-200">
              <input
                id="plan-disponible"
                v-model="disponible"
                type="checkbox"
                class="rounded text-primary focus:ring-primary h-4 w-4"
              >
              <label for="plan-disponible" class="text-xs font-semibold text-stone-700 cursor-pointer">
                Disponible para alta de usuarios
              </label>
            </div>
          </div>
        </section>

        <!-- ==================== 2. EDITOR DE MATERIAS Y CONDICIONES ==================== -->
        <section v-if="materiasCount > 0" class="card mb-6">
          <div class="flex flex-wrap items-center justify-between gap-2 mb-4 pb-2 border-b border-stone-200">
            <div class="flex items-center gap-3">
              <h2 class="card-header mb-0">
                Materias ({{ materiasCount }})
              </h2>
              <span v-if="hayPregrado" class="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded">
                Tiene año 0 (pregrado)
              </span>
            </div>

            <div class="flex items-center gap-2">
              <button class="btn btn-secondary text-xs" @click="agregarMateriaEn('0')">
                + Materia (Año 0)
              </button>
              <button class="btn btn-secondary text-xs" @click="agregarMateriaEn('1')">
                + Materia (Año 1)
              </button>
            </div>
          </div>

          <!-- Listado por año -->
          <div
            v-for="anio in Object.keys(materiasPorAnio).sort()"
            :key="anio"
            class="mb-8"
          >
            <h3 class="text-sm font-semibold text-stone-700 mb-3 flex items-center gap-2 bg-stone-100 p-2 rounded">
              <span>Año {{ anio === '-1' ? 'sin código' : anio }} {{ anio === '0' ? '(Pregrado / Ciclo de Formación)' : '' }}</span>
              <span class="text-xs font-normal text-stone-500">({{ materiasPorAnio[anio].length }} materias)</span>
            </h3>

            <div class="space-y-3">
              <div
                v-for="m in materiasPorAnio[anio]"
                :key="m.codigo"
                class="border border-stone-200 rounded-lg p-3 bg-stone-50/50 hover:bg-stone-50 transition-colors"
              >
                <!-- Cabecera de materia -->
                <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div class="flex items-center gap-2 flex-1">
                    <span class="font-mono text-xs font-bold text-stone-700 bg-white border border-stone-300 px-2 py-1 rounded">
                      {{ m.codigo }}
                    </span>
                    <input
                      v-model="materias[m.codigo].nombre"
                      type="text"
                      class="form-input text-sm font-medium flex-1 bg-white"
                      placeholder="Nombre completo de la materia"
                    >
                    <input
                      v-model="materias[m.codigo].nombre_c"
                      type="text"
                      class="form-input text-xs w-36 bg-white"
                      placeholder="Nombre corto"
                    >
                  </div>

                  <div class="flex items-center gap-2">
                    <select
                      v-model="materias[m.codigo].cursada"
                      class="form-input text-xs bg-white w-24"
                    >
                      <option :value="null">— Cursada —</option>
                      <option value="anual">Anual</option>
                      <option value="1C">1C</option>
                      <option value="2C">2C</option>
                    </select>

                    <button
                      type="button"
                      class="text-xs text-red-600 hover:text-red-800 font-medium px-2 py-1"
                      title="Eliminar materia"
                      @click="eliminarMateria(m.codigo)"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>

                <!-- Bloque de Correlatividades (Árbol) -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-stone-200/60">
                  <!-- Cursar -->
                  <div>
                    <label class="block text-xs font-semibold text-stone-600 mb-1">
                      Correlativas para CURSAR:
                    </label>
                    <EditorCondicion
                      :model-value="m.correlativas.cursar"
                      :materias-disponibles="materiasLista"
                      @update:model-value="actualizarCondicion(m.codigo, 'cursar', $event)"
                    />
                  </div>

                  <!-- Aprobar -->
                  <div>
                    <label class="block text-xs font-semibold text-stone-600 mb-1">
                      Correlativas para APROBAR:
                    </label>
                    <EditorCondicion
                      :model-value="m.correlativas.aprobar"
                      :materias-disponibles="materiasLista"
                      @update:model-value="actualizarCondicion(m.codigo, 'aprobar', $event)"
                    />
                  </div>
                </div>

                <!-- Equivalencias con otros planes (plan madre) -->
                <div class="mt-3 pt-2 border-t border-stone-200/60">
                  <label
                    :for="`equivale-${m.codigo}`"
                    class="block text-xs font-semibold text-stone-600 mb-1"
                  >
                    Equivale a (códigos separados por coma):
                  </label>
                  <input
                    :id="`equivale-${m.codigo}`"
                    :value="(m.equivale_a || []).join(', ')"
                    type="text"
                    class="form-input text-xs bg-white"
                    placeholder="Ej. 662-0.1, 662-0.2"
                    @change="onEquivalenciasChange(m.codigo, $event.target.value)"
                  >
                </div>

                <!-- Comentarios de la materia -->
                <div class="mt-3 pt-2 border-t border-stone-200/60">
                  <button
                    type="button"
                    class="text-xs font-medium text-stone-600 hover:text-stone-900"
                    @click="toggleComentariosMateria(m.codigo)"
                  >
                    💬 Comentarios{{ contarComentariosMateria(m.codigo) ? ` (${contarComentariosMateria(m.codigo)})` : '' }}
                  </button>
                  <PanelComentarios
                    v-if="materiaComentariosAbierta === m.codigo"
                    class="mt-2"
                    :comentarios="comentarios"
                    :materia-id="m.codigo"
                    :titulo="`Comentarios de ${m.codigo}`"
                    :cargando="cargandoComentarios"
                    :error="errorComentarios"
                    @agregar="onAgregarComentario"
                    @resolver="onResolverComentario"
                    @reabrir="onReabrirComentario"
                    @eliminar="onEliminarComentario"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- ==================== 3. VALIDACIONES ==================== -->
        <section v-if="materiasCount > 0" class="card mb-6">
          <div class="flex items-center justify-between gap-3 mb-3">
            <h2 class="card-header mb-0">
              3. Validación del Plan
            </h2>
            <button class="btn btn-secondary text-xs" @click="ejecutarValidacion">
              Re-validar
            </button>
          </div>

          <div v-if="valido" class="alert bg-green-50 border-green-200 text-green-800 text-sm">
            ✅ Plan estructurado correctamente. Listo para exportar o publicar.
          </div>

          <div v-else-if="errores.length > 0" class="alert alert-danger text-sm">
            <strong>❌ {{ errores.length }} error(es) detectado(s):</strong>
            <ul class="list-disc list-inside mt-1 text-xs space-y-1">
              <li v-for="(e, i) in errores" :key="i">
                {{ e }}
              </li>
            </ul>
          </div>

          <!-- Advertencias: no bloquean la publicación -->
          <div v-if="advertencias.length > 0" class="alert bg-amber-50 border-amber-200 text-amber-800 text-sm mt-3">
            <strong>⚠ {{ advertencias.length }} advertencia(s):</strong>
            <ul class="list-disc list-inside mt-1 text-xs space-y-1">
              <li v-for="(a, i) in advertencias" :key="i">
                {{ a }}
              </li>
            </ul>
          </div>
        </section>

        <!-- ==================== 4. EXPORTACIÓN ==================== -->
        <section v-if="materiasCount > 0" class="card mb-6">
          <h2 class="card-header text-sm mb-3">
            4. Exportar archivos JSON finales
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              class="btn btn-primary text-xs w-full"
              :disabled="!planCodigo"
              @click="exportarDetalle"
            >
              Descargar {{ planCodigo || 'plan' }}.json (detalle)
            </button>
            <button
              class="btn btn-secondary text-xs w-full"
              :disabled="!planCodigo"
              @click="exportarCatalogo"
            >
              Descargar planes.json (catálogo)
            </button>
            <button
              class="btn btn-secondary text-xs w-full"
              @click="copiarDetalle"
            >
              Copiar detalle al portapapeles
            </button>
          </div>

          <div v-if="mensajeExport" class="mt-3 alert alert-info text-xs">
            {{ mensajeExport }}
          </div>

          <p class="text-xs text-stone-500 mt-3">
            Para publicar, commiteá juntos <code>{{ planCodigo || '{codigo}' }}.json</code> y
            <code>planes.json</code>. Un push a <code>main</code> despliega hosting y reglas.
          </p>
        </section>

        <!-- ==================== 5. COMENTARIOS DEL PLAN ==================== -->
        <section v-if="materiasCount > 0" class="card mb-6">
          <PanelComentarios
            :comentarios="comentarios"
            :materia-id="null"
            titulo="Comentarios generales del plan"
            :cargando="cargandoComentarios"
            :error="errorComentarios"
            @agregar="onAgregarComentario"
            @resolver="onResolverComentario"
            @reabrir="onReabrirComentario"
            @eliminar="onEliminarComentario"
          />
        </section>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useEditorPlanes } from '@/composables/academico/useEditorPlanes.js'
import { useGestionPlanes } from '@/composables/academico/useGestionPlanes.js'
import { useCatalogoPlanes } from '@/composables/academico/useCatalogoPlanes.js'
import { useComentariosPlanes } from '@/composables/academico/useComentariosPlanes.js'
import { ETIQUETAS_ESTADO_REVISION } from '@/composables/academico/usePlanesPendientes.js'
import EditorCondicion from '@/components/ui/EditorCondicion.vue'
import PanelComentarios from '@/components/ui/PanelComentarios.vue'
import { useAuth } from '@/composables/auth/useAuth.js'
import { formatearFechaHora } from '@/utils/fechas.js'

const route = useRoute()
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
const materiaComentariosAbierta = ref(null)

const esCoordinacion = computed(() => {
  return user.value?.roles?.includes('coordinacion') === true
})

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
 * Cantidad de comentarios anclados a una materia.
 * @param {string} codigo
 * @returns {number}
 */
function contarComentariosMateria(codigo) {
  return comentarios.value.filter((c) => c.materiaId === codigo).length
}

/** Abre/cierra el panel de comentarios de una materia. */
function toggleComentariosMateria(codigo) {
  materiaComentariosAbierta.value =
    materiaComentariosAbierta.value === codigo ? null : codigo
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

/** Selecciona un plan provisorio del desplegable. */
function onSeleccionarPlan(codigo) {
  if (!codigo) return
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
  materiaComentariosAbierta.value = null

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
}

/** Marca el plan abierto como listo para publicar. */
async function marcarListo() {  if (!planCodigo.value) return

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

/**
 * Guarda el estado actual del editor como borrador en la nube.
 */
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

function agregarMateriaEn(anio) {
  if (!planCodigo.value) {
    erroresImport.value = ['Definí el código del plan antes de agregar materias.']
    return
  }
  agregarMateria(anio)
}

/**
 * Convierte el texto libre de equivalencias (`"662-0.1, 662-0.2"`) al array
 * canónico que espera el composable y el JSON exportado.
 * @param {string} codigo
 * @param {string} valor
 */
function onEquivalenciasChange(codigo, valor) {
  const equivale_a = String(valor || '')
    .split(',')
    .map((equivalencia) => equivalencia.trim())
    .filter(Boolean)
  actualizarMateria(codigo, 'equivale_a', equivale_a)
}

async function ejecutarValidacion() {
  mensajeExport.value = ''
  await validarComposable()
}

async function exportarCatalogo() {
  const listaPlanes = Object.values(catalogoActual.value || {})
  const catalogo = await generarJSONCatalogo(listaPlanes)
  descargarJSON(catalogo, 'planes.json')
  mensajeExport.value = 'Catálogo planes.json descargado.'
}

function exportarDetalle() {
  const detalle = generarJSONDetalle({ revisadoPor: user.value?.uid || null })
  if (!detalle) return
  descargarJSON(detalle, `${planCodigo.value}.json`)
  mensajeExport.value = `Detalle ${planCodigo.value}.json descargado.`
}

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

onMounted(async () => {
  if (!esCoordinacion.value) return
  await asegurarCatalogo()
  await refrescarLista()
  const codigo = route.query?.abrir
  if (codigo) abrirBorrador(String(codigo))
})
</script>
