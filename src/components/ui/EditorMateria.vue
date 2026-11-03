<!-- src/components/ui/EditorMateria.vue -->
<!--
  Detalle editable de una sola materia del plan (panel derecho del editor
  compacto). Es un componente "tonto": recibe la materia y los comentarios por
  props y emite los cambios; la vista los aplica sobre `useEditorPlanes`.
-->
<template>
  <article class="border border-stone-200 rounded-lg p-3 bg-stone-50/50">
    <!-- Cabecera: código, acciones y campos básicos -->
    <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
      <div class="flex items-center gap-2 flex-1">
        <span
          class="font-mono text-xs font-bold text-stone-700 bg-white border border-stone-300 px-2 py-1 rounded"
        >
          {{ materia.codigo }}
        </span>
        <input
          :value="materia.nombre || ''"
          type="text"
          class="form-input text-sm font-medium flex-1 bg-white"
          placeholder="Nombre completo de la materia"
          aria-label="Nombre completo"
          @input="emitirCampo('nombre', $event.target.value)"
        >
        <input
          :value="materia.nombre_c || ''"
          type="text"
          class="form-input text-xs w-36 bg-white"
          placeholder="Nombre corto"
          aria-label="Nombre corto"
          @input="emitirCampo('nombre_c', $event.target.value)"
        >
      </div>

      <div class="flex items-center gap-2">
        <select
          :value="materia.cursada || ''"
          class="form-input text-xs bg-white w-24"
          aria-label="Cursada"
          @change="emitirCursada($event.target.value)"
        >
          <option value="">
            — Cursada —
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

        <button
          type="button"
          class="text-xs text-red-600 hover:text-red-800 font-medium px-2 py-1"
          title="Eliminar materia"
          @click="emit('eliminar', materia.codigo)"
        >
          Eliminar
        </button>
      </div>
    </div>

    <!-- Correlatividades con resumen textual -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-stone-200/60">
      <div>
        <label class="block text-xs font-semibold text-stone-600 mb-1">
          Correlativas para CURSAR:
        </label>
        <p
          class="text-xs text-stone-500 italic mb-1"
          data-resumen="cursar"
        >
          {{ resumenCursar }}
        </p>
        <EditorCondicion
          :model-value="materia.correlativas?.cursar ?? null"
          :materias-disponibles="materiasDisponibles"
          @update:model-value="emit('actualizar-condicion', 'cursar', $event)"
        />
      </div>

      <div>
        <label class="block text-xs font-semibold text-stone-600 mb-1">
          Correlativas para APROBAR:
        </label>
        <p
          class="text-xs text-stone-500 italic mb-1"
          data-resumen="aprobar"
        >
          {{ resumenAprobar }}
        </p>
        <EditorCondicion
          :model-value="materia.correlativas?.aprobar ?? null"
          :materias-disponibles="materiasDisponibles"
          @update:model-value="emit('actualizar-condicion', 'aprobar', $event)"
        />
      </div>
    </div>

    <!-- Equivalencias con otros planes (plan madre) -->
    <div class="mt-3 pt-2 border-t border-stone-200/60">
      <label
        :for="`equivale-${materia.codigo}`"
        class="block text-xs font-semibold text-stone-600 mb-1"
      >
        Equivale a (códigos separados por coma):
      </label>
      <input
        :id="`equivale-${materia.codigo}`"
        :value="(materia.equivale_a || []).join(', ')"
        type="text"
        class="form-input text-xs bg-white"
        placeholder="Ej. 662-0.1, 662-0.2"
        aria-label="Equivalencias"
        @change="emitirEquivalencias($event.target.value)"
      >
    </div>

    <!-- Comentarios de la materia (siempre visibles en el detalle) -->
    <div class="mt-3 pt-2 border-t border-stone-200/60">
      <PanelComentarios
        :comentarios="comentarios"
        :materia-id="materia.codigo"
        :titulo="`Comentarios de ${materia.codigo}`"
        :cargando="cargandoComentarios"
        :error="errorComentarios"
        @agregar="emit('agregar-comentario', $event)"
        @resolver="emit('resolver-comentario', $event)"
        @reabrir="emit('reabrir-comentario', $event)"
        @eliminar="emit('eliminar-comentario', $event)"
      />
    </div>
  </article>
</template>

<script setup>
import { computed } from 'vue'
import EditorCondicion from '@/components/ui/EditorCondicion.vue'
import PanelComentarios from '@/components/ui/PanelComentarios.vue'
import { condicionATexto } from '@/utils/condiciones.js'

const props = defineProps({
  /** Materia completa: `{ codigo, nombre, nombre_c, cursada, correlativas, equivale_a }`. */
  materia: {
    type: Object,
    required: true
  },
  /** Materias para los selectores de correlativas (`{ codigo, nombre }`). */
  materiasDisponibles: {
    type: Array,
    default: () => []
  },
  /** Comentarios del plan; el panel filtra los de esta materia. */
  comentarios: {
    type: Array,
    default: () => []
  },
  cargandoComentarios: {
    type: Boolean,
    default: false
  },
  errorComentarios: {
    type: String,
    default: ''
  }
})

const emit = defineEmits([
  'actualizar-campo',
  'actualizar-condicion',
  'eliminar',
  'agregar-comentario',
  'resolver-comentario',
  'reabrir-comentario',
  'eliminar-comentario'
])

/** Mapa código → nombre para los resúmenes de correlativas. */
const nombresMaterias = computed(() =>
  Object.fromEntries(
    props.materiasDisponibles.map((materia) => [materia.codigo, materia.nombre || materia.codigo])
  )
)

/** Resumen legible de las correlativas para cursar. */
const resumenCursar = computed(() =>
  condicionATexto(props.materia.correlativas?.cursar ?? null, {
    nombres: nombresMaterias.value,
    usarNombres: true
  })
)

/** Resumen legible de las correlativas para aprobar. */
const resumenAprobar = computed(() =>
  condicionATexto(props.materia.correlativas?.aprobar ?? null, {
    nombres: nombresMaterias.value,
    usarNombres: true
  })
)

/**
 * Emite el cambio de un campo de texto de la materia.
 * @param {string} campo
 * @param {string} valor
 */
function emitirCampo(campo, valor) {
  emit('actualizar-campo', campo, valor)
}

/**
 * Emite el cambio de cursada; el valor vacío se normaliza a `null`.
 * @param {string} valor
 */
function emitirCursada(valor) {
  emit('actualizar-campo', 'cursada', valor || null)
}

/**
 * Convierte el texto libre de equivalencias al array canónico y lo emite.
 * @param {string} valor
 */
function emitirEquivalencias(valor) {
  const equivale_a = String(valor || '')
    .split(',')
    .map((equivalencia) => equivalencia.trim())
    .filter(Boolean)
  emit('actualizar-campo', 'equivale_a', equivale_a)
}
</script>
