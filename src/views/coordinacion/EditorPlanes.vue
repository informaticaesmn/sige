<!-- src/views/coordinacion/EditorPlanes.vue -->
<!--
  Editor/Revisor de Planes de Estudio (rol Coordinación).
  Permite importar CSV de Google Sheets, editar materias, validar y exportar JSON
  para public/planes/.
-->
<template>
  <div class="min-h-screen font-sans bg-stone-50">
    <div class="container mx-auto px-4 py-6 max-w-7xl">
      <h1 class="text-2xl font-medium mb-2 text-stone-800">
        Editor de Planes de Estudio
      </h1>
      <p class="text-muted mb-6">
        Revisar, validar y exportar planes de estudio antes de incluirlos como
        archivos JSON estáticos en <code>public/planes/</code>.
      </p>

      <!-- Guardia de rol -->
      <div
        v-if="!esCoordinacion"
        class="alert alert-danger mb-6"
      >
        Esta sección está reservada al rol de Coordinación.
      </div>

      <template v-else>
        <!-- ==================== 1. PLANES GUARDADOS ==================== -->
        <section class="card mb-6">
          <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
            <h2 class="card-header mb-0">
              1. Planes guardados
            </h2>
            <button
              class="btn btn-secondary"
              :disabled="cargandoLista"
              @click="cargarListaPlanes"
            >
              {{ cargandoLista ? 'Actualizando...' : 'Actualizar lista' }}
            </button>
          </div>

          <p class="text-muted mb-4">
            CSV ya cargados en Firestore. Abrí uno para retomar la revisión sin
            volver a subir el archivo.
          </p>

          <div
            v-if="errorLista"
            class="alert alert-danger mb-4"
          >
            {{ errorLista }}
          </div>

          <div
            v-if="!cargandoLista && planesGuardados.length === 0"
            class="alert alert-info"
          >
            Todavía no hay CSV guardados. Importá uno abajo y usá
            “Guardar CSV en la nube”.
          </div>

          <div
            v-else-if="planesGuardados.length > 0"
            class="overflow-x-auto border border-stone-200 rounded"
          >
            <table class="min-w-full text-left text-sm">
              <thead class="bg-stone-100">
                <tr>
                  <th class="px-3 py-2 font-semibold text-stone-600">Código</th>
                  <th class="px-3 py-2 font-semibold text-stone-600">Nombre</th>
                  <th class="px-3 py-2 font-semibold text-stone-600">Materias</th>
                  <th class="px-3 py-2 font-semibold text-stone-600">Actualizado</th>
                  <th class="px-3 py-2 font-semibold text-stone-600">Por</th>
                  <th class="px-3 py-2 font-semibold text-stone-600 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="plan in planesGuardados"
                  :key="plan.codigo"
                  class="border-b border-stone-100 hover:bg-stone-50"
                >
                  <td class="px-3 py-2 font-mono text-xs text-stone-600">
                    {{ plan.codigo }}
                  </td>
                  <td class="px-3 py-2">
                    {{ plan.nombre }}
                  </td>
                  <td class="px-3 py-2">
                    {{ plan.materiasCount ?? '—' }}
                  </td>
                  <td class="px-3 py-2 text-xs text-stone-500">
                    {{ formatearFecha(plan.actualizadoEn) }}
                  </td>
                  <td class="px-3 py-2 text-xs text-stone-500">
                    {{ plan.actualizadoPorEmail || '—' }}
                  </td>
                  <td class="px-3 py-2 text-center">
                    <button
                      class="btn-link"
                      :disabled="cargandoPlan === plan.codigo"
                      @click="abrirPlanGuardado(plan.codigo)"
                    >
                      {{ cargandoPlan === plan.codigo ? 'Abriendo...' : 'Abrir' }}
                    </button>

                    <template v-if="planAEliminar === plan.codigo">
                      <button
                        class="btn-link font-semibold text-red-700"
                        @click="eliminarPlanGuardado(plan.codigo)"
                      >
                        Confirmar
                      </button>
                      <button
                        class="btn-link"
                        @click="planAEliminar = ''"
                      >
                        Cancelar
                      </button>
                    </template>
                    <button
                      v-else
                      class="btn-link text-red-600"
                      @click="planAEliminar = plan.codigo"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- ==================== 2. IMPORTAR CSV ==================== -->
        <section class="card mb-6">
          <h2 class="card-header">
            2. Importar CSV del plan
          </h2>
          <p class="text-muted mb-4">
            Seleccioná un archivo CSV exportado de Google Sheets. Las columnas
            finales (<code>materia_id</code>, <code>nombre</code>, <code>nombre_c</code>,
            <code>cursada</code>, <code>correlativas_cursar</code>,
            <code>correlativas_aprobar</code>) se toman como fuente de verdad.
          </p>

          <div class="space-y-3">
            <label
              class="form-label"
              for="archivo-csv"
            >Archivo CSV</label>
            <input
              id="archivo-csv"
              type="file"
              accept=".csv,text/csv"
              class="form-input"
              @change="onArchivoCSV"
            >

            <div
              v-if="textoCSV"
              class="mt-2 alert bg-stone-100 border border-stone-200 text-stone-700"
            >
              {{ filasCSV.length }} filas detectadas · {{ materiasCount }} materias
              <span
                v-if="hayPregrado"
                class="ml-2 font-medium text-primary"
              >Tiene pregrado (año 0)</span>
            </div>

            <div
              v-if="erroresImport.length > 0"
              class="mt-2 alert alert-info"
            >
              <strong>Advertencias al importar:</strong>
              <ul class="list-disc list-inside mt-1 text-xs">
                <li
                  v-for="(e, i) in erroresImport"
                  :key="i"
                >
                  {{ e }}
                </li>
              </ul>
            </div>

            <button
              v-if="filasCSV.length > 0"
              class="btn btn-primary"
              :disabled="loadingImportar"
              @click="importarCSV"
            >
              {{ loadingImportar ? 'Procesando...' : 'Procesar CSV y cargar materias' }}
            </button>

            <div
              v-if="materiasCount > 0 && textoCSV"
              class="mt-3 flex flex-wrap items-center gap-3"
            >
              <button
                class="btn btn-secondary"
                :disabled="!planCodigo || guardandoCSV"
                @click="guardarCSVEnNube"
              >
                {{ guardandoCSV ? 'Guardando...' : (planGuardadoActual ? 'Actualizar CSV guardado' : 'Guardar CSV en la nube') }}
              </button>
              <span
                v-if="planGuardadoActual"
                class="text-muted"
              >
                Ya guardado por {{ planGuardadoActual.actualizadoPorEmail || 'otro usuario' }}
                el {{ formatearFecha(planGuardadoActual.actualizadoEn) }}.
              </span>
            </div>

            <div
              v-if="mensajeGuardado"
              class="mt-3 alert alert-info"
            >
              {{ mensajeGuardado }}
            </div>
          </div>
        </section>

        <!-- ==================== 3. METADATOS ==================== -->
        <section
          v-if="materiasCount > 0"
          class="card mb-6"
        >
          <h2 class="card-header">
            3. Metadatos del plan
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                class="form-label"
                for="plan-codigo"
              >Código del plan</label>
              <input
                id="plan-codigo"
                v-model="planCodigo"
                type="text"
                class="form-input w-full"
                placeholder="Ej. 663"
              >
            </div>
            <div>
              <label
                class="form-label"
                for="plan-nombre"
              >Nombre del plan</label>
              <input
                id="plan-nombre"
                v-model="planNombre"
                type="text"
                class="form-input w-full"
                placeholder="Ej. 663 Profesorado de Música con orientación en Dirección Coral"
              >
            </div>
          </div>
        </section>

        <!-- ==================== 4. TABLA DE MATERIAS ==================== -->
        <section
          v-if="materiasCount > 0"
          class="card mb-6"
        >
          <h2 class="card-header">
            4. Materias ({{ Object.keys(materias).length }})
            <button
              v-if="planCodigo"
              class="btn btn-secondary ml-2"
              @click="agregarMateriaEn('0')"
            >
              + Agregar materia (año 0)
            </button>
          </h2>

          <div
            v-if="Object.keys(materiasPorAnio).length === 0"
            class="p-4 text-stone-500 text-sm"
          >
            No hay materias cargadas.
          </div>

          <div
            v-for="anio in Object.keys(materiasPorAnio).sort()"
            :key="anio"
            class="mb-6"
          >
            <h3 class="text-lg font-semibold text-stone-800 mb-3 border-b border-stone-200 pb-1">
              Año {{ anio === '-1' ? 'sin código' : anio }} {{ anio === '0' ? '(pregrado)' : '' }}
            </h3>

            <div class="overflow-x-auto border border-stone-200 rounded">
              <table class="min-w-full text-left text-sm">
                <thead class="bg-stone-100">
                  <tr>
                    <th class="px-3 py-2 font-semibold text-stone-600">
                      Código
                    </th>
                    <th class="px-3 py-2 font-semibold text-stone-600">
                      Nombre
                    </th>
                    <th class="px-3 py-2 font-semibold text-stone-600">
                      Nombre corto
                    </th>
                    <th class="px-3 py-2 font-semibold text-stone-600">
                      Cursada
                    </th>
                    <th class="px-3 py-2 font-semibold text-stone-600">
                      Correlativas de cursar
                    </th>
                    <th class="px-3 py-2 font-semibold text-stone-600">
                      Correlativas de aprobar
                    </th>
                    <th class="px-3 py-2 font-semibold text-stone-600">
                      Equivale a
                    </th>
                    <th class="px-3 py-2 font-semibold text-stone-600 text-center">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="m in materiasPorAnio[anio]"
                    :key="m.codigo"
                    class="border-b border-stone-100 hover:bg-stone-50"
                  >
                    <td class="px-3 py-2 font-mono text-xs text-stone-600">
                      {{ m.codigo }}
                    </td>
                    <td class="px-3 py-2">
                      <input
                        v-model="materias[m.codigo].nombre"
                        class="form-input w-full text-sm"
                        placeholder="Nombre de la materia"
                      >
                    </td>
                    <td class="px-3 py-2">
                      <input
                        v-model="materias[m.codigo].nombre_c"
                        class="form-input w-full text-sm"
                        placeholder="Nombre corto"
                      >
                    </td>
                    <td class="px-3 py-2">
                      <select
                        v-model="materias[m.codigo].cursada"
                        class="form-input w-full text-sm"
                      >
                        <option value="">
                          —
                        </option>
                        <option value="anual">
                          Anual
                        </option>
                        <option value="1C">
                          1C
                        </option>
                        <option value="2C">
                          2C
                        </option>
                      </select>
                    </td>
                    <td class="px-3 py-2 align-top">
                      <div class="mb-2 flex flex-wrap gap-1">
                        <span
                          v-for="c in m.correlativas.cursar"
                          :key="c"
                          class="inline-flex items-center gap-1 rounded bg-stone-100 px-2 py-0.5 text-xs text-stone-700"
                          :title="nombreMateria(c)"
                        >
                          {{ c }}
                          <button
                            type="button"
                            class="text-stone-400 hover:text-red-600"
                            title="Quitar correlativa"
                            @click="eliminarCorrelativa(m.codigo, 'cursar', c)"
                          >
                            ×
                          </button>
                        </span>
                      </div>
                      <SelectMateria
                        :materias-disponibles="materiasLista"
                        :excluir="m.correlativas.cursar"
                        placeholder="Agregar correlativa..."
                        @select="agregarCorrelativa(m.codigo, 'cursar', $event)"
                      />
                    </td>
                    <td class="px-3 py-2 align-top">
                      <div class="mb-2 flex flex-wrap gap-1">
                        <span
                          v-for="c in m.correlativas.aprobar"
                          :key="c"
                          class="inline-flex items-center gap-1 rounded bg-stone-100 px-2 py-0.5 text-xs text-stone-700"
                          :title="nombreMateria(c)"
                        >
                          {{ c }}
                          <button
                            type="button"
                            class="text-stone-400 hover:text-red-600"
                            title="Quitar correlativa"
                            @click="eliminarCorrelativa(m.codigo, 'aprobar', c)"
                          >
                            ×
                          </button>
                        </span>
                      </div>
                      <SelectMateria
                        :materias-disponibles="materiasLista"
                        :excluir="m.correlativas.aprobar"
                        placeholder="Agregar correlativa..."
                        @select="agregarCorrelativa(m.codigo, 'aprobar', $event)"
                      />
                    </td>
                    <td class="px-3 py-2">
                      <input
                        v-model="materias[m.codigo].equivale_a"
                        class="form-input w-full text-sm font-mono"
                        placeholder="Código plan madre"
                      >
                    </td>
                    <td class="px-3 py-2 text-center">
                      <button
                        class="text-red-600 hover:text-red-800 text-xs"
                        title="Eliminar materia"
                        @click="eliminarMateria(m.codigo)"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <!-- ==================== 5. VALIDACIONES ==================== -->
        <section
          v-if="materiasCount > 0"
          class="card mb-6"
        >
          <h2 class="card-header">
            5. Validaciones
          </h2>
          <div class="flex items-center gap-3 mb-4">
            <button
              class="btn btn-primary"
              @click="ejecutarValidacion"
            >
              Validar plan
            </button>
            <span
              v-if="valido"
              class="rounded-md bg-primary/10 px-3 py-1 text-sm font-medium text-primary"
            >
              ✅ Plan válido para exportar
            </span>
            <span
              v-if="!valido && errores.length > 0"
              class="rounded-md border border-red-100 bg-red-50 px-3 py-1 text-sm font-medium text-red-700"
            >
              ❌ {{ errores.length }} error(es)
            </span>
          </div>

          <div
            v-if="errores.length > 0"
            class="alert alert-danger"
          >
            <ul class="list-disc list-inside mt-1">
              <li
                v-for="(e, i) in errores"
                :key="i"
              >
                {{ e }}
              </li>
            </ul>
          </div>

          <div
            v-if="valido && errores.length === 0"
            class="alert alert-info"
          >
            No se encontraron errores. El plan está listo para exportar.
          </div>
        </section>

        <!-- ==================== 6. EXPORTAR ==================== -->
        <section
          v-if="materiasCount > 0 && valido"
          class="card mb-6"
        >
          <h2 class="card-header">
            6. Exportar JSON
          </h2>
          <p class="text-muted mb-4">
            Descargá los archivos JSON o copiálos al portapapeles para pegarlos
            en <code>public/planes/</code>.
          </p>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <button
                class="btn btn-primary w-full"
                :disabled="!planCodigo"
                @click="exportarCatalogo"
              >
                Descargar planes.json (catálogo)
              </button>
            </div>
            <div>
              <button
                class="btn btn-primary w-full"
                :disabled="!planCodigo"
                @click="exportarDetalle"
              >
                Descargar {{ planCodigo || 'plan' }}.json (detalle)
              </button>
            </div>
            <div>
              <button
                class="btn btn-secondary w-full"
                @click="copiarDetalle"
              >
                Copiar detalle al portapapeles
              </button>
            </div>
          </div>

          <div
            v-if="mensajeExport"
            class="mt-4 alert alert-info"
          >
            {{ mensajeExport }}
          </div>

          <div class="mt-4 alert alert-info">
            <strong>Próximo paso:</strong> colocar los archivos en
            <code>public/planes/</code> y marcar el plan como
            <code>disponible: true</code> para que aparezca en el catálogo de alta de usuarios.
          </div>
        </section>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useEditorPlanes } from '@/composables/academico/useEditorPlanes.js'
import { usePlanesPendientes } from '@/composables/academico/usePlanesPendientes.js'
import SelectMateria from '@/components/ui/SelectMateria.vue'
import { useAuth } from '@/composables/auth/useAuth.js'

const { user } = useAuth()

const {
  listarPlanesPendientes,
  obtenerPlanPendiente,
  guardarPlanPendiente,
  eliminarPlanPendiente
} = usePlanesPendientes()

const {
  filasCSV,
  materias,
  planCodigo,
  planNombre,
  errores,
  valido,
  hayPregrado,
  materiasPorAnio,
  materiasLista,
  importarCSV: importarCSVComposable,
  agregarMateria,
  eliminarMateria,
  agregarCorrelativa,
  eliminarCorrelativa,
  validar: validarComposable,
  generarJSONCatalogo,
  generarJSONDetalle,
  descargarJSON,
  copiarJSON
} = useEditorPlanes()

// --- Estado local de la vista ---
const textoCSV = ref('')
const loadingImportar = ref(false)
const erroresImport = ref([])
const mensajeExport = ref('')

// --- Estado del listado de CSV guardados ---
const planesGuardados = ref([])
const errorLista = ref('')
const cargandoLista = ref(false)
const cargandoPlan = ref('')
const guardandoCSV = ref(false)
const mensajeGuardado = ref('')
const planAEliminar = ref('')

const esCoordinacion = computed(() => {
  return user.value?.roles?.includes('coordinacion') === true
})

const materiasCount = computed(() => Object.keys(materias.value).length)

/** Plan guardado que corresponde al código actualmente abierto (si existe). */
const planGuardadoActual = computed(() => {
  return planesGuardados.value.find((plan) => plan.codigo === planCodigo.value) || null
})

/**
 * Devuelve "código - nombre" para mostrar el detalle de una correlativa.
 * @param {string} codigo
 * @returns {string}
 */
function nombreMateria(codigo) {
  const materia = materias.value[codigo]
  return materia ? `${codigo} - ${materia.nombre}` : codigo
}

/**
 * Formatea una fecha para mostrarla en la tabla de planes guardados.
 * @param {Date|string|null} valor
 * @returns {string}
 */
function formatearFecha(valor) {
  if (!valor) return '—'
  const fecha = valor instanceof Date ? valor : new Date(valor)
  if (Number.isNaN(fecha.getTime())) return '—'
  return fecha.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
}

// ---------------------------------------------------------------------------
// 1. Planes guardados en Firestore
// ---------------------------------------------------------------------------

/** Carga el listado de CSV guardados en Firestore. */
async function cargarListaPlanes() {
  cargandoLista.value = true
  errorLista.value = ''

  const resultado = await listarPlanesPendientes()

  if (resultado.exito) {
    planesGuardados.value = resultado.datos
  } else {
    errorLista.value = resultado.error?.message || 'No se pudo leer el listado de planes guardados.'
  }

  cargandoLista.value = false
}

/**
 * Abre un CSV guardado y lo vuelve a cargar en el editor.
 * @param {string} codigo
 */
async function abrirPlanGuardado(codigo) {
  cargandoPlan.value = codigo
  erroresImport.value = []
  mensajeGuardado.value = ''
  mensajeExport.value = ''

  try {
    const resultado = await obtenerPlanPendiente(codigo)

    if (!resultado.exito) {
      erroresImport.value = [resultado.error?.message || 'No se pudo abrir el plan guardado.']
      return
    }

    const { csvTexto: csvGuardado, nombre } = resultado.datos
    textoCSV.value = csvGuardado

    const importado = await importarCSVComposable(csvGuardado, {
      planCodigo: codigo,
      planNombre: nombre
    })
    erroresImport.value = importado.errores || []
    mensajeGuardado.value = `Plan ${codigo} cargado desde Firestore.`
  } catch (err) {
    erroresImport.value = [err.message || 'Error al abrir el plan guardado.']
  } finally {
    cargandoPlan.value = ''
  }
}

/** Guarda (crea o reemplaza) el CSV actual en Firestore. */
async function guardarCSVEnNube() {
  if (!planCodigo.value || !textoCSV.value) {
    erroresImport.value = ['Procesá un CSV antes de guardarlo.']
    return
  }

  guardandoCSV.value = true
  mensajeGuardado.value = ''

  try {
    const resultado = await guardarPlanPendiente({
      codigo: planCodigo.value,
      nombre: planNombre.value,
      csvTexto: textoCSV.value,
      materiasCount: materiasCount.value,
      uid: user.value?.uid || '',
      email: user.value?.email || ''
    })

    if (!resultado.exito) {
      erroresImport.value = [resultado.error?.message || 'No se pudo guardar el CSV.']
      return
    }

    mensajeGuardado.value = `CSV del plan ${resultado.datos.codigo} guardado en Firestore.`
    await cargarListaPlanes()
  } catch (err) {
    erroresImport.value = [err.message || 'Error al guardar el CSV.']
  } finally {
    guardandoCSV.value = false
  }
}

/**
 * Elimina el CSV guardado de un plan (con confirmación en dos pasos en la vista).
 * @param {string} codigo
 */
async function eliminarPlanGuardado(codigo) {
  planAEliminar.value = ''

  try {
    const resultado = await eliminarPlanPendiente(codigo)

    if (!resultado.exito) {
      errorLista.value = resultado.error?.message || 'No se pudo eliminar el plan guardado.'
      return
    }

    if (planCodigo.value === codigo) {
      mensajeGuardado.value = `El plan ${codigo} ya no está guardado en Firestore.`
    }
    await cargarListaPlanes()
  } catch (err) {
    errorLista.value = err.message || 'Error al eliminar el plan guardado.'
  }
}

// ---------------------------------------------------------------------------
// 2. Importar CSV
// ---------------------------------------------------------------------------

/**
 * Lee el archivo CSV elegido y guarda su contenido en `textoCSV`.
 * @param {Event} event
 */
function onArchivoCSV(event) {
  const archivo = event.target.files?.[0]
  if (!archivo) return

  const lector = new FileReader()
  lector.onload = (e) => {
    textoCSV.value = e.target.result
    mensajeExport.value = ''
    mensajeGuardado.value = ''
    erroresImport.value = []
    // El nombre del plan no viene en el CSV: se completa a mano o desde el catálogo.
    planNombre.value = ''
  }
  lector.readAsText(archivo)
}

/** Procesa el CSV cargado y construye el mapa de materias. */
async function importarCSV() {
  loadingImportar.value = true
  erroresImport.value = []
  mensajeExport.value = ''

  try {
    const resultado = await importarCSVComposable(textoCSV.value)
    erroresImport.value = resultado.errores || []
  } catch (err) {
    erroresImport.value = [err.message || 'Error al procesar el CSV']
  } finally {
    loadingImportar.value = false
  }
}

// ---------------------------------------------------------------------------
// 3. Acciones de tabla
// ---------------------------------------------------------------------------

/**
 * Agrega una materia vacía. Requiere que el plan tenga código.
 * @param {string} anio
 */
function agregarMateriaEn(anio) {
  if (!planCodigo.value) {
    erroresImport.value = ['Definí el código del plan antes de agregar materias.']
    return
  }
  agregarMateria(anio)
}

// ---------------------------------------------------------------------------
// 5. Validación
// ---------------------------------------------------------------------------

/** Ejecuta las validaciones sobre el plan actual. */
async function ejecutarValidacion() {
  mensajeExport.value = ''
  await validarComposable()
}

// ---------------------------------------------------------------------------
// 6. Exportar
// ---------------------------------------------------------------------------

/** Descarga el catálogo `planes.json`. */
function exportarCatalogo() {
  descargarJSON(generarJSONCatalogo(), 'planes.json')
  mensajeExport.value = 'Catálogo planes.json descargado.'
}

/** Descarga el detalle del plan `{codigo}.json`. */
function exportarDetalle() {
  const detalle = generarJSONDetalle()
  if (!detalle) return
  descargarJSON(detalle, `${planCodigo.value}.json`)
  mensajeExport.value = `Detalle ${planCodigo.value}.json descargado.`
}

/** Copia el detalle del plan al portapapeles. */
async function copiarDetalle() {
  const detalle = generarJSONDetalle()
  if (!detalle) return

  try {
    await copiarJSON(detalle)
    mensajeExport.value = 'JSON del plan copiado al portapapeles.'
  } catch (err) {
    mensajeExport.value = err.message || 'No se pudo copiar al portapapeles.'
  }
}

// ---------------------------------------------------------------------------
// Inicialización
// ---------------------------------------------------------------------------

onMounted(() => {
  if (esCoordinacion.value) cargarListaPlanes()
})
</script>
