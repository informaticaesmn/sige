<!-- src/components/ui/EditorRequisitos.vue -->
<!--
  Editor de requisitos del plan: define qué espacios son obligatorios,
  conmutables u optativos y entre qué materias se elige.

  Es un componente "tonto": recibe los requisitos y las materias por props y
  emite los cambios; la vista los aplica sobre `useEditorPlanes`.
-->
<template>
  <section class="border border-stone-200 rounded-lg bg-white">
    <!-- Cabecera con ayuda contextual -->
    <header
      class="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-stone-200 bg-stone-50 rounded-t-lg"
    >
      <div class="flex items-center gap-2">
        <h3 class="text-sm font-semibold text-stone-700">
          <i class="fas fa-share-alt fa-fw mr-1 text-primary" />
          Espacios del plan
        </h3>
        <span
          class="cursor-help text-stone-500"
          title="Cada requisito agrupa materias que ocupan un mismo espacio. Obligatorio: una única materia. Conmutable: varias materias, se acredita con una. Optativo: se exige un mínimo N de un conjunto mayor de materias."
        >
          <i class="fas fa-info-circle fa-fw" />
        </span>
      </div>

      <div class="flex items-center gap-2">
        <label
          for="nuevo-requisito-anio"
          class="text-xs text-stone-600"
        >Año:</label>
        <select
          id="nuevo-requisito-anio"
          v-model="anioNuevo"
          class="form-input text-xs bg-white w-32"
        >
          <option :value="null">
            Transversal
          </option>
          <option
            v-for="anio in anios"
            :key="anio"
            :value="anio"
          >
            Año {{ anio }}
          </option>
        </select>
        <button
          type="button"
          class="btn btn-primary text-xs px-2 py-1"
          :disabled="!planDefinido"
          title="Agregar un requisito"
          @click="emit('agregar', anioNuevo)"
        >
          <i class="fas fa-plus fa-fw mr-1" />
          Agregar
        </button>
      </div>
    </header>

    <div class="p-3 space-y-3">
      <p
        v-if="!planDefinido"
        class="text-xs text-stone-500 italic"
      >
        Definí el código del plan y agregá materias para poder crear requisitos.
      </p>

      <p
        v-else-if="requisitos.length === 0"
        class="text-xs text-stone-500 italic"
      >
        El plan no tiene requisitos declarados. Agregá uno para indicar qué
        espacios son obligatorios, conmutables u optativos.
      </p>

      <!-- Tarjeta por requisito -->
      <article
        v-for="(requisito, indice) in requisitos"
        :key="requisito.id || indice"
        class="border border-stone-200 rounded-lg p-3 bg-stone-50/50"
      >
        <div class="flex flex-wrap items-center gap-2 mb-2">
          <input
            :value="requisito.id"
            type="text"
            class="form-input font-mono text-xs w-28 bg-white"
            placeholder="R-0-01"
            aria-label="Id del requisito"
            @input="emit('actualizar', indice, 'id', $event.target.value)"
          >
          <input
            :value="requisito.etiqueta || ''"
            type="text"
            class="form-input text-sm flex-1 min-w-40 bg-white"
            placeholder="Etiqueta (ej. Lenguaje musical)"
            aria-label="Etiqueta del requisito"
            @input="emit('actualizar', indice, 'etiqueta', $event.target.value)"
          >

          <select
            :value="requisito.tipo"
            class="form-input text-xs bg-white w-36"
            aria-label="Tipo de requisito"
            @change="emit('actualizar', indice, 'tipo', $event.target.value)"
          >
            <option value="obligatorio">
              Obligatorio
            </option>
            <option value="conmutable">
              Conmutable
            </option>
            <option value="optativo">
              Optativo
            </option>
          </select>

          <select
            :value="requisito.anio ?? ''"
            class="form-input text-xs bg-white w-32"
            aria-label="Año del requisito"
            @change="emitirAnio(indice, $event.target.value)"
          >
            <option value="">
              Transversal
            </option>
            <option
              v-for="anio in anios"
              :key="anio"
              :value="anio"
            >
              Año {{ anio }}
            </option>
          </select>

          <label
            v-if="requisito.tipo === 'optativo'"
            class="flex items-center gap-1 text-xs text-stone-600"
          >
            Mínimo:
            <input
              :value="requisito.minimo"
              type="number"
              min="1"
              :max="Math.max(1, (requisito.candidatos || []).length - 1)"
              class="form-input text-xs w-16 bg-white"
              aria-label="Mínimo de materias"
              @input="emit('actualizar', indice, 'minimo', Number($event.target.value))"
            >
          </label>

          <button
            type="button"
            class="ml-auto text-xs text-red-600 hover:text-red-800 font-medium px-2 py-1"
            title="Eliminar requisito"
            @click="emit('eliminar', indice)"
          >
            Eliminar
          </button>
        </div>

        <p class="text-2xs text-stone-500 mb-2">
          {{ ayudaTipo(requisito) }}
        </p>

        <!-- Candidatos disponibles, agrupados por año -->
        <div
          v-for="grupo in materiasDeRequisito(requisito)"
          :key="grupo.anio"
          class="mb-2"
        >
          <p class="text-2xs font-semibold text-stone-500 uppercase tracking-wide mb-1">
            {{ grupo.anio === null ? 'Sin año' : `Año ${grupo.anio}` }}
          </p>
          <div class="flex flex-wrap gap-x-4 gap-y-1">
            <label
              v-for="materia in grupo.materias"
              :key="materia.codigo"
              class="flex items-center gap-1.5 text-xs"
              :class="
                estaEnOtroRequisito(indice, materia.codigo)
                  ? 'text-stone-400'
                  : 'text-stone-700'
              "
            >
              <input
                type="checkbox"
                class="rounded text-primary focus:ring-primary h-3.5 w-3.5"
                :checked="(requisito.candidatos || []).includes(materia.codigo)"
                :disabled="estaEnOtroRequisito(indice, materia.codigo)"
                @change="emit('alternar-candidato', indice, materia.codigo)"
              >
              <span class="font-mono text-2xs text-stone-500">{{ materia.codigo }}</span>
              <span>{{ materia.nombre }}</span>
              <span
                v-if="estaEnOtroRequisito(indice, materia.codigo)"
                class="text-2xs italic"
              >(en otro requisito)</span>
            </label>
          </div>
        </div>

        <p
          v-if="(requisito.candidatos || []).length === 0"
          class="text-2xs text-amber-700"
        >
          Sin candidatos: elegí al menos una materia.
        </p>
      </article>

      <!-- Diagnóstico de materias sin requisito -->
      <p
        v-if="materiasSinRequisito.length > 0"
        class="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1"
      >
        <i class="fas fa-exclamation-triangle fa-fw mr-1" />
        {{ materiasSinRequisito.length }} materia(s) sin requisito:
        <span class="font-mono text-2xs">
          {{ materiasSinRequisito.map((materia) => materia.codigo).join(', ') }}
        </span>
      </p>
    </div>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  /** Requisitos del plan: `{ id, anio, tipo, minimo, candidatos, etiqueta }`. */
  requisitos: {
    type: Array,
    default: () => []
  },
  /** Materias del plan: `{ codigo, nombre, anio }`. */
  materias: {
    type: Array,
    default: () => []
  },
  /** Años presentes en el plan, ordenados. */
  anios: {
    type: Array,
    default: () => []
  },
  /** Materias que todavía no pertenecen a ningún requisito. */
  materiasSinRequisito: {
    type: Array,
    default: () => []
  },
  /** `false` mientras no haya un plan abierto con materias. */
  planDefinido: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['agregar', 'actualizar', 'alternar-candidato', 'eliminar'])

/** Año seleccionado para el próximo requisito a crear. */
const anioNuevo = ref(null)

/**
 * Agrupa las materias candidatas de un requisito por año.
 *
 * Si el requisito es transversal (`anio: null`) se muestran todas las
 * materias; si tiene año, solo las de ese año (la validación del modelo exige
 * que los candidatos compartan el año del requisito).
 *
 * @param {Object} requisito
 * @returns {{ anio: number|null, materias: Object[] }[]}
 */
function materiasDeRequisito(requisito) {
  const disponibles = props.materias.filter(
    (materia) =>
      requisito.anio === null ||
      requisito.anio === undefined ||
      materia.anio === requisito.anio
  )

  const grupos = new Map()
  for (const materia of disponibles) {
    const anio = Number.isInteger(materia.anio) ? materia.anio : null
    if (!grupos.has(anio)) grupos.set(anio, [])
    grupos.get(anio).push(materia)
  }

  return [...grupos.entries()]
    .sort(([a], [b]) => (a ?? -1) - (b ?? -1))
    .map(([anio, materias]) => ({ anio, materias }))
}

/**
 * Indica si una materia ya pertenece a otro requisito.
 * @param {number} indice índice del requisito actual
 * @param {string} codigo código de materia
 * @returns {boolean}
 */
function estaEnOtroRequisito(indice, codigo) {
  return props.requisitos.some(
    (requisito, i) => i !== indice && (requisito.candidatos || []).includes(codigo)
  )
}

/**
 * Emite el cambio de año, traduciendo el string vacío a `null` (transversal).
 * @param {number} indice
 * @param {string} valor
 */
function emitirAnio(indice, valor) {
  emit('actualizar', indice, 'anio', valor === '' ? null : Number(valor))
}

/**
 * Texto de ayuda según el tipo de requisito.
 * @param {Object} requisito
 * @returns {string}
 */
function ayudaTipo(requisito) {
  if (requisito.tipo === 'obligatorio') {
    return 'Obligatorio: una sola materia ocupa este espacio.'
  }
  if (requisito.tipo === 'conmutable') {
    return 'Conmutable: cualquiera de las materias marcadas ocupa este espacio.'
  }
  if (requisito.tipo === 'optativo') {
    const candidatos = (requisito.candidatos || []).length
    return `Optativo: se acredita con ${requisito.minimo} de ${candidatos} materias.`
  }
  return ''
}

/** Años disponibles para el selector de creación. */
const anios = computed(() => props.anios)
</script>
