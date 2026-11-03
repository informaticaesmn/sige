<template>
  <div class="min-h-screen bg-stone-50 py-6">
    <div class="container mx-auto px-4">
      <!-- Encabezado -->
      <div class="flex flex-wrap justify-between items-center gap-3 mb-6">
        <div>
          <h1 class="text-2xl font-medium text-stone-800">
            Planes de Estudio
          </h1>
          <p class="text-sm text-stone-500">
            Consultá la estructura, correlatividades y equivalencias de los planes vigentes.
          </p>
        </div>
        <button
          class="btn btn-primary px-4"
          type="button"
          :aria-label="esAutenticado ? 'Volver a la app' : 'Volver al inicio'"
          @click="volver"
        >
          {{ esAutenticado ? 'Volver a la app' : 'Volver al inicio' }}
        </button>
      </div>

      <!-- Carga inicial -->
      <div
        v-if="cargando && !planSeleccionado"
        class="flex justify-center items-center py-12"
      >
        <div
          class="animate-spin rounded-full h-12 w-12 border-b-2 border-stone-700"
          role="status"
          aria-label="Cargando"
        />
      </div>

      <div v-else>
        <!-- Selector de plan (sticky) -->
        <section class="card mb-4 sticky top-0 z-20">
          <label
            for="plan-select"
            class="form-label text-xs"
          >
            Seleccionar plan de estudio
          </label>
          <select
            id="plan-select"
            v-model="planId"
            class="form-input text-sm w-full"
            aria-label="Seleccionar plan de estudio"
            @change="cambiarPlan"
          >
            <option
              v-for="plan in planesDisponibles"
              :key="plan.codigo"
              :value="plan.codigo"
            >
              {{ plan.nombre }}
            </option>
          </select>
        </section>

        <template v-if="planSeleccionado">
          <!-- Resumen del plan -->
          <section class="card mb-4">
            <div class="flex flex-wrap items-center gap-2 min-w-0">
              <span class="font-mono text-sm font-bold bg-white border border-stone-300 px-2 py-1 rounded">
                {{ planCodigo }}
              </span>
              <span class="text-sm font-semibold text-stone-800 truncate max-w-[28rem]">
                {{ nombrePlan }}
              </span>
              <span class="text-xs text-stone-500">
                {{ materiasCount }} materias · {{ aniosCount }} años
              </span>
              <span
                v-if="hayPregrado"
                class="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded"
              >
                Tiene año 0 (pregrado)
              </span>
            </div>
          </section>

          <!-- Layout lista + detalle -->
          <div class="grid grid-cols-1 lg:grid-cols-[18rem_minmax(0,1fr)] gap-4 items-start">
            <!-- Lista navegable -->
            <aside
              class="card p-0 overflow-hidden h-[60vh] lg:h-[70vh] lg:sticky lg:top-24"
              :class="vistaMobile === 'detalle' ? 'hidden lg:block' : ''"
            >
              <ListaMaterias
                :materias="materiasOrdenadas"
                :seleccionado="codigoSeleccionado"
                :mostrar-avisos="false"
                @seleccionar="seleccionarMateria"
              />
            </aside>

            <!-- Detalle de solo lectura -->
            <div
              class="min-w-0"
              :class="vistaMobile === 'lista' ? 'hidden lg:block' : ''"
            >
              <button
                type="button"
                class="btn btn-secondary text-xs mb-2 lg:hidden"
                @click="volverALista"
              >
                ← Materias
              </button>

              <DetalleMateria
                v-if="materiaSeleccionada"
                :materia="materiaSeleccionada"
                :plan="planSeleccionado"
                embebido
                correlativas-navegables
                @seleccionar-materia="seleccionarMateria"
              />
              <div
                v-else
                class="card text-center py-10 text-sm text-stone-500"
              >
                Elegí una materia de la lista para ver su detalle.
              </div>
            </div>
          </div>
        </template>

        <div
          v-else-if="error"
          class="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center"
          role="alert"
        >
          <h3 class="text-lg font-medium text-yellow-800 mb-2">
            Plan aún en proceso de carga
          </h3>
          <p class="text-yellow-700">
            El plan de estudios seleccionado aún no está disponible. Por favor, inténtelo más tarde.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { usePlanesPublicos } from '@/composables/academico/usePlanesPublicos.js'
import ListaMaterias from '@/components/ui/ListaMaterias.vue'
import DetalleMateria from '@/components/estudiante/DetalleMateria.vue'

const {
  planesDisponibles,
  planSeleccionado,
  planId,
  codigoSeleccionado,
  vistaMobile,
  cargando,
  error,
  esAutenticado,
  planCodigo,
  nombrePlan,
  materiasOrdenadas,
  materiaSeleccionada,
  materiasCount,
  aniosCount,
  hayPregrado,
  inicializar,
  cambiarPlan,
  seleccionarMateria,
  volverALista,
  volver
} = usePlanesPublicos()

onMounted(inicializar)
</script>

<style scoped>
/* Estilos específicos si es necesario */
</style>
