<!-- src/views/coordinacion/EditorPlanes.vue -->
<!--
  Editor/Revisor de Planes de Estudio (rol Coordinación).
  Permite revisar borradores en Firestore, importar JSON del Apps Script,
  editar el árbol de correlatividades (AND/OR/año), validar y exportar JSON.
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
            Revisar, editar condiciones y exportar JSON para
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
        <!-- ==================== 1. BORRADORES Y CARGA DE JSON ==================== -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <!-- Columna 1 y 2: Borradores guardados -->
          <div class="lg:col-span-2 card">
            <div class="flex items-center justify-between gap-2 mb-3">
              <h2 class="card-header mb-0">
                1. Borradores en la nube
              </h2>
              <button
                class="btn btn-secondary text-xs"
                :disabled="cargandoLista"
                @click="cargarListaPlanes"
              >
                {{ cargandoLista ? '...' : 'Actualizar' }}
              </button>
            </div>

            <div v-if="errorLista" class="alert alert-danger text-xs mb-3">
              {{ errorLista }}
            </div>

            <div
              v-if="!cargandoLista && planesGuardados.length === 0"
              class="text-xs text-stone-500 italic p-3 bg-stone-100 rounded"
            >
              No hay borradores guardados en la nube.
            </div>

            <div v-else-if="planesGuardados.length > 0" class="overflow-x-auto border border-stone-200 rounded">
              <table class="min-w-full text-left text-xs">
                <thead class="bg-stone-100 font-semibold text-stone-600">
                  <tr>
                    <th class="px-2 py-1.5">Código</th>
                    <th class="px-2 py-1.5">Nombre</th>
                    <th class="px-2 py-1.5">Materias</th>
                    <th class="px-2 py-1.5">Actualizado</th>
                    <th class="px-2 py-1.5 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="plan in planesGuardados"
                    :key="plan.codigo"
                    class="border-b border-stone-100 hover:bg-stone-50"
                  >
                    <td class="px-2 py-1.5 font-mono text-stone-700 font-medium">
                      {{ plan.codigo }}
                    </td>
                    <td class="px-2 py-1.5 text-stone-800 max-w-xs truncate">
                      {{ plan.nombre }}
                    </td>
                    <td class="px-2 py-1.5">
                      {{ plan.materiasCount ?? '—' }}
                    </td>
                    <td class="px-2 py-1.5 text-stone-500">
                      {{ formatearFecha(plan.actualizadoEn) }}
                    </td>
                    <td class="px-2 py-1.5 text-center flex items-center justify-center gap-1">
                      <button
                        class="btn-link font-medium"
                        :disabled="cargandoPlan === plan.codigo"
                        @click="abrirPlanGuardado(plan.codigo)"
                      >
                        {{ cargandoPlan === plan.codigo ? '...' : 'Abrir' }}
                      </button>
                      <button
                        class="btn-link text-red-600"
                        @click="eliminarPlanGuardado(plan.codigo)"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Columna 3: Carga rápida de JSON local -->
          <div class="card bg-stone-100/60 border border-stone-200">
            <h2 class="card-header text-sm mb-2">
              Cargar archivo JSON
            </h2>
            <p class="text-xs text-stone-500 mb-3">
              Importar salida del Apps Script o archivo local.
            </p>

            <div class="space-y-3">
              <input
                id="archivo-json"
                type="file"
                accept=".json,application/json"
                class="form-input text-xs w-full bg-white"
                @change="onArchivoJSON"
              >

              <div
                v-if="erroresImport.length > 0"
                class="alert alert-danger text-xs p-2"
              >
                <ul class="list-disc list-inside space-y-0.5">
                  <li v-for="(e, i) in erroresImport" :key="i">
                    {{ e }}
                  </li>
                </ul>
              </div>

              <div v-if="mensajeGuardado" class="alert alert-info text-xs p-2">
                {{ mensajeGuardado }}
              </div>
            </div>
          </div>
        </div>

        <!-- ==================== 2. METADATOS Y ESTADO DEL PLAN ==================== -->
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

        <!-- ==================== 3. EDITOR DE MATERIAS Y CONDICIONES ==================== -->
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
              </div>
            </div>
          </div>
        </section>

        <!-- ==================== 4. VALIDACIONES ==================== -->
        <section v-if="materiasCount > 0" class="card mb-6">
          <div class="flex items-center justify-between gap-3 mb-3">
            <h2 class="card-header mb-0">
              4. Validación del Plan
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
        </section>

        <!-- ==================== 5. EXPORTACIÓN ==================== -->
        <section v-if="materiasCount > 0" class="card mb-6">
          <h2 class="card-header text-sm mb-3">
            5. Exportar archivos JSON finales
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
        </section>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useEditorPlanes } from '@/composables/academico/useEditorPlanes.js'
import { usePlanesPendientes } from '@/composables/academico/usePlanesPendientes.js'
import { useCatalogoPlanes } from '@/composables/academico/useCatalogoPlanes.js'
import EditorCondicion from '@/components/ui/EditorCondicion.vue'
import { useAuth } from '@/composables/auth/useAuth.js'

const { user } = useAuth()
const { catalogo: catalogoActual } = useCatalogoPlanes()

const {
  listarPlanesPendientes,
  obtenerPlanPendiente,
  guardarPlanPendiente,
  eliminarPlanPendiente
} = usePlanesPendientes()

const {
  jsonTexto,
  materias,
  planCodigo,
  planNombre,
  disponible,
  errores,
  valido,
  hayPregrado,
  materiasPorAnio,
  materiasLista,
  importarJSONPlan,
  agregarMateria,
  eliminarMateria,
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

// --- Estado del listado de borradores guardados ---
const planesGuardados = ref([])
const errorLista = ref('')
const cargandoLista = ref(false)
const cargandoPlan = ref('')
const guardandoNube = ref(false)
const mensajeGuardado = ref('')

const esCoordinacion = computed(() => {
  return user.value?.roles?.includes('coordinacion') === true
})

const materiasCount = computed(() => Object.keys(materias.value).length)

function formatearFecha(valor) {
  if (!valor) return '—'
  const fecha = valor instanceof Date ? valor : new Date(valor)
  if (Number.isNaN(fecha.getTime())) return '—'
  return fecha.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
}

// 1. Borradores en Firestore
async function cargarListaPlanes() {
  cargandoLista.value = true
  errorLista.value = ''

  const resultado = await listarPlanesPendientes()
  if (resultado.exito) {
    planesGuardados.value = resultado.datos
  } else {
    errorLista.value = resultado.error?.message || 'No se pudo leer el listado de borradores guardados.'
  }

  cargandoLista.value = false
}

async function abrirPlanGuardado(codigo) {
  cargandoPlan.value = codigo
  erroresImport.value = []
  mensajeGuardado.value = ''
  mensajeExport.value = ''

  try {
    const resultado = await obtenerPlanPendiente(codigo)
    if (!resultado.exito) {
      erroresImport.value = [resultado.error?.message || 'No se pudo abrir el borrador.']
      return
    }

    const { jsonTexto: jsonGuardado, nombre } = resultado.datos
    const importado = await importarJSONPlan(jsonGuardado, {
      planCodigo: codigo,
      planNombre: nombre
    })
    erroresImport.value = importado.errores || []
    mensajeGuardado.value = `Borrador ${codigo} cargado desde Firestore.`
  } catch (err) {
    erroresImport.value = [err.message || 'Error al abrir el borrador.']
  } finally {
    cargandoPlan.value = ''
  }
}

async function guardarBorradorEnNube() {
  if (!planCodigo.value) {
    erroresImport.value = ['Definí un código de plan antes de guardarlo.']
    return
  }

  guardandoNube.value = true
  mensajeGuardado.value = ''

  try {
    const detalleJson = generarJSONDetalle()
    const jsonStr = JSON.stringify(detalleJson, null, 2)

    const resultado = await guardarPlanPendiente({
      codigo: planCodigo.value,
      nombre: planNombre.value,
      jsonTexto: jsonStr,
      materiasCount: materiasCount.value,
      uid: user.value?.uid || '',
      email: user.value?.email || ''
    })

    if (!resultado.exito) {
      erroresImport.value = [resultado.error?.message || 'No se pudo guardar el borrador.']
      return
    }

    mensajeGuardado.value = `Borrador del plan ${resultado.datos.codigo} guardado en la nube.`
    await cargarListaPlanes()
  } catch (err) {
    erroresImport.value = [err.message || 'Error al guardar el borrador.']
  } finally {
    guardandoNube.value = false
  }
}

async function eliminarPlanGuardado(codigo) {
  try {
    const resultado = await eliminarPlanPendiente(codigo)
    if (!resultado.exito) {
      errorLista.value = resultado.error?.message || 'No se pudo eliminar el borrador.'
      return
    }
    await cargarListaPlanes()
  } catch (err) {
    errorLista.value = err.message || 'Error al eliminar el borrador.'
  }
}

// 2. Importar JSON Local
function onArchivoJSON(event) {
  const archivo = event.target.files?.[0]
  if (!archivo) return

  const lector = new FileReader()
  lector.onload = async (e) => {
    erroresImport.value = []
    mensajeGuardado.value = ''
    try {
      const res = await importarJSONPlan(e.target.result)
      erroresImport.value = res.errores || []
      mensajeGuardado.value = `JSON cargado exitosamente (${res.materiasCount} materias).`
    } catch (err) {
      erroresImport.value = [err.message || 'Error al procesar el archivo JSON.']
    }
  }
  lector.readAsText(archivo)
}

function agregarMateriaEn(anio) {
  if (!planCodigo.value) {
    erroresImport.value = ['Definí el código del plan antes de agregar materias.']
    return
  }
  agregarMateria(anio)
}

async function ejecutarValidacion() {
  mensajeExport.value = ''
  await validarComposable()
}

function exportarCatalogo() {
  const listaPlanes = Object.values(catalogoActual.value || {})
  descargarJSON(generarJSONCatalogo(listaPlanes), 'planes.json')
  mensajeExport.value = 'Catálogo planes.json descargado.'
}

function exportarDetalle() {
  const detalle = generarJSONDetalle()
  if (!detalle) return
  descargarJSON(detalle, `${planCodigo.value}.json`)
  mensajeExport.value = `Detalle ${planCodigo.value}.json descargado.`
}

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

onMounted(() => {
  if (esCoordinacion.value) cargarListaPlanes()
})
</script>
