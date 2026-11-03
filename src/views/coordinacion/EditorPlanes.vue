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
        <div
          v-if="materiasCount > 0"
          class="flex items-center gap-2"
        >
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
      <div
        v-if="!esCoordinacion"
        class="alert alert-danger mb-6"
      >
        Esta sección está reservada al rol de Coordinación.
      </div>

      <template v-else>
        <!-- Selector de planes provisorios -->
        <section class="card mb-4 sticky top-0 z-20">
          <div class="flex flex-wrap items-end gap-3">
            <div class="flex-1 min-w-[16rem]">
              <label
                class="form-label text-xs"
                for="plan-selector"
              >Plan provisorio</label>
              <select
                id="plan-selector"
                class="form-input text-sm w-full"
                :value="planCodigo"
                @change="onSeleccionarPlan($event.target.value, $event)"
              >
                <option value="">
                  — Elegí un plan para editar —
                </option>
                <option
                  v-for="p in planesGuardados"
                  :key="p.codigo"
                  :value="p.codigo"
                >
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
            <router-link
              :to="{ name: 'CoordinacionCarga' }"
              class="btn-link text-xs pb-2"
            >
              Importar nuevo JSON
            </router-link>
          </div>
        </section>

        <!-- Mensajes de la apertura de un borrador -->
        <div
          v-if="erroresImport.length > 0"
          class="alert alert-danger text-xs mb-4"
        >
          <ul class="list-disc list-inside space-y-0.5">
            <li
              v-for="(e, i) in erroresImport"
              :key="i"
            >
              {{ e }}
            </li>
          </ul>
        </div>
        <div
          v-if="mensajeGuardado"
          class="alert alert-info text-xs mb-4"
        >
          {{ mensajeGuardado }}
        </div>

        <!-- Sin plan abierto -->
        <div
          v-if="materiasCount === 0"
          class="card text-center py-10"
        >
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

        <!-- ==================== 1. RESUMEN DEL PLAN ==================== -->
        <section
          v-if="materiasCount > 0"
          class="card mb-4"
        >
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex flex-wrap items-center gap-2 min-w-0">
              <span class="font-mono text-sm font-bold bg-white border border-stone-300 px-2 py-1 rounded">
                {{ planCodigo }}
              </span>
              <span class="text-sm font-semibold text-stone-800 truncate max-w-[24rem]">
                {{ planNombre || '(sin nombre)' }}
              </span>
              <span
                class="text-xs font-semibold"
                :class="claseEstadoRevision"
              >
                {{ ETIQUETAS_ESTADO_REVISION[estadoRevisionActual] || 'En edición' }}
              </span>
              <span class="text-xs text-stone-500">
                {{ materiasCount }} materias · {{ aniosCount }} años
              </span>
              <span
                v-if="faltantesCount > 0"
                class="text-xs text-amber-700"
                :title="`${faltantesCount} materia(s) sin nombre o sin cursada`"
              >
                ⚠ {{ faltantesCount }} incompleta(s)
              </span>
              <span
                v-if="comentariosAbiertos > 0"
                class="text-xs text-stone-600"
                :title="`${comentariosAbiertos} comentario(s) sin resolver`"
              >
                💬 {{ comentariosAbiertos }} abierto(s)
              </span>
            </div>

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

          <details class="mt-3">
            <summary class="text-xs font-medium text-stone-600 cursor-pointer select-none">
              Editar datos del plan
            </summary>
            <div class="mt-3 pt-3 border-t border-stone-200">
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label
                    class="form-label text-xs"
                    for="plan-codigo"
                  >Código del plan</label>
                  <input
                    id="plan-codigo"
                    v-model="planCodigo"
                    type="text"
                    class="form-input font-mono font-semibold text-sm w-full"
                    placeholder="Ej. 663"
                  >
                </div>
                <div class="md:col-span-2">
                  <label
                    class="form-label text-xs"
                    for="plan-nombre"
                  >Nombre del plan</label>
                  <input
                    id="plan-nombre"
                    v-model="planNombre"
                    type="text"
                    class="form-input text-sm w-full"
                    placeholder="Ej. 663 Profesorado de Música"
                  >
                </div>
              </div>

              <div class="flex items-center gap-2 bg-stone-100 p-2.5 rounded border border-stone-200 mt-3">
                <input
                  id="plan-disponible"
                  v-model="disponible"
                  type="checkbox"
                  class="rounded text-primary focus:ring-primary h-4 w-4"
                >
                <label
                  for="plan-disponible"
                  class="text-xs font-semibold text-stone-700 cursor-pointer"
                >
                  Disponible para alta de usuarios
                </label>
              </div>

              <p
                v-if="planCodigoOrigen && planCodigo !== planCodigoOrigen"
                class="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1"
              >
                ⚠ El JSON importado declara el plan <strong>{{ planCodigoOrigen }}</strong>.
                Al exportar se guardará como <strong>{{ planCodigo || '(sin código)' }}</strong>.
              </p>
            </div>
          </details>
        </section>

        <!-- ==================== 2. LISTA DE MATERIAS + DETALLE ==================== -->
        <section
          v-if="materiasCount > 0"
          class="mb-4"
        >
          <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div class="flex items-center gap-3">
              <h2 class="card-header mb-0">
                Materias ({{ materiasCount }})
              </h2>
              <span
                v-if="hayPregrado"
                class="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded"
              >
                Tiene año 0 (pregrado)
              </span>
            </div>

            <div class="flex items-center gap-2">
              <button
                class="btn btn-secondary text-xs"
                @click="agregarMateriaEn('0')"
              >
                + Materia (Año 0)
              </button>
              <button
                class="btn btn-secondary text-xs"
                @click="agregarMateriaEn('1')"
              >
                + Materia (Año 1)
              </button>
            </div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-[18rem_minmax(0,1fr)] gap-4 items-start">
            <!-- Lista navegable -->
            <aside
              class="card p-0 overflow-hidden h-[60vh] lg:h-[70vh] lg:sticky lg:top-4"
              :class="vistaMobile === 'detalle' ? 'hidden lg:block' : ''"
            >
              <ListaMaterias
                :materias="materiasOrdenadas"
                :seleccionado="codigoSeleccionado"
                :comentarios="comentarios"
                @seleccionar="onSeleccionarMateria"
              />
            </aside>

            <!-- Detalle de una sola materia -->
            <div
              class="min-w-0"
              :class="vistaMobile === 'lista' ? 'hidden lg:block' : ''"
            >
              <button
                type="button"
                class="btn btn-secondary text-xs mb-2 lg:hidden"
                @click="volverAListaMobile"
              >
                ← Materias
              </button>
              <EditorMateria
                v-if="materiaSeleccionada"
                :materia="materiaSeleccionada"
                :materias-disponibles="materiasLista"
                :comentarios="comentarios"
                :cargando-comentarios="cargandoComentarios"
                :error-comentarios="errorComentarios"
                @actualizar-campo="onActualizarCampo"
                @actualizar-condicion="onActualizarCondicion"
                @eliminar="onEliminarMateria"
                @agregar-comentario="onAgregarComentario"
                @resolver-comentario="onResolverComentario"
                @reabrir-comentario="onReabrirComentario"
                @eliminar-comentario="onEliminarComentario"
              />
              <div
                v-else
                class="card text-center py-10 text-sm text-stone-500"
              >
                Elegí una materia de la lista para editarla.
              </div>
            </div>
          </div>
        </section>

        <!-- ==================== 3. VALIDACIÓN ==================== -->
        <details
          v-if="materiasCount > 0"
          :open="errores.length > 0"
          class="card mb-4"
        >
          <summary class="card-header cursor-pointer select-none">
            Validación del plan
            <span
              v-if="errores.length > 0"
              class="text-red-600"
            >· ❌ {{ errores.length }}</span>
            <span
              v-else-if="valido"
              class="text-green-700"
            >· ✅</span>
            <span
              v-if="advertencias.length > 0"
              class="text-amber-700"
            >· ⚠ {{ advertencias.length }}</span>
          </summary>
          <div class="flex justify-end mt-3">
            <button
              class="btn btn-secondary text-xs"
              @click="ejecutarValidacion"
            >
              Re-validar
            </button>
          </div>

          <div
            v-if="valido"
            class="alert bg-green-50 border-green-200 text-green-800 text-sm"
          >
            ✅ Plan estructurado correctamente. Listo para exportar o publicar.
          </div>

          <div
            v-else-if="errores.length > 0"
            class="alert alert-danger text-sm"
          >
            <strong>❌ {{ errores.length }} error(es) detectado(s):</strong>
            <ul class="list-disc list-inside mt-1 text-xs space-y-1">
              <li
                v-for="(e, i) in errores"
                :key="i"
              >
                {{ e }}
              </li>
            </ul>
          </div>

          <!-- Advertencias: no bloquean la publicación -->
          <div
            v-if="advertencias.length > 0"
            class="alert bg-amber-50 border-amber-200 text-amber-800 text-sm mt-3"
          >
            <strong>⚠ {{ advertencias.length }} advertencia(s):</strong>
            <ul class="list-disc list-inside mt-1 text-xs space-y-1">
              <li
                v-for="(a, i) in advertencias"
                :key="i"
              >
                {{ a }}
              </li>
            </ul>
          </div>
        </details>

        <!-- ==================== 4. EXPORTACIÓN ==================== -->
        <details
          v-if="materiasCount > 0"
          class="card mb-4"
        >
          <summary class="card-header text-sm cursor-pointer select-none">
            Exportar archivos JSON
          </summary>
          <div class="mt-3">
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

            <div
              v-if="mensajeExport"
              class="mt-3 alert alert-info text-xs"
            >
              {{ mensajeExport }}
            </div>

            <p class="text-xs text-stone-500 mt-3">
              Para publicar, commiteá juntos <code>{{ planCodigo || '{codigo}' }}.json</code> y
              <code>planes.json</code>. Un push a <code>main</code> despliega hosting y reglas.
            </p>
          </div>
        </details>

        <!-- ==================== 5. COMENTARIOS GENERALES ==================== -->
        <details
          v-if="materiasCount > 0"
          class="card mb-4"
        >
          <summary class="card-header cursor-pointer select-none">
            Comentarios generales del plan
          </summary>
          <div class="mt-3">
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
          </div>
        </details>
      </template>
    </div>
  </div>
</template>

<script setup>
import { useEditorPlanesVista } from '@/composables/academico/useEditorPlanesVista.js'
import { ETIQUETAS_ESTADO_REVISION } from '@/composables/academico/usePlanesPendientes.js'
import { formatearFechaHora } from '@/utils/fechas.js'
import ListaMaterias from '@/components/ui/ListaMaterias.vue'
import EditorMateria from '@/components/ui/EditorMateria.vue'
import PanelComentarios from '@/components/ui/PanelComentarios.vue'

const {
  // Selector y borradores
  planesGuardados,
  cargandoLista,
  refrescarLista,
  onSeleccionarPlan,
  eliminarPlanAbierto,

  // Datos del plan
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
  materiasCount,
  aniosCount,
  faltantesCount,
  comentariosAbiertos,
  claseEstadoRevision,
  esCoordinacion,

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
  copiarDetalle
} = useEditorPlanesVista()
</script>
