<!-- src/components/ui/EditorCondicion.vue -->
<!--
  Editor recursivo de condiciones de correlatividad (árbol AND / OR / materia / año).
  Permite a los coordinadores visualizar y modificar condiciones complejas sin
  perder la estructura de operadores lógicos.
-->
<template>
  <div class="editor-condicion border border-stone-200 rounded-md p-3 bg-white space-y-2 text-sm">
    <!-- Caso 1: Nulo / Vacío -> Botones para inicializar la condición -->
    <template v-if="!modelValue">
      <div class="flex flex-wrap items-center gap-2 text-stone-500 text-xs">
        <span>Sin condición</span>
        <div class="flex items-center gap-1 ml-auto">
          <button
            v-if="permite('materia')"
            type="button"
            class="px-2 py-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium"
            @click="emitir({ tipo: 'materia', codigo: '' })"
          >
            + Materia
          </button>
          <button
            v-if="permite('and')"
            type="button"
            class="px-2 py-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium"
            @click="emitir({ tipo: 'and', hijos: [] })"
          >
            + Grupo Y (AND)
          </button>
          <button
            v-if="permite('or')"
            type="button"
            class="px-2 py-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium"
            @click="emitir({ tipo: 'or', hijos: [] })"
          >
            + Grupo O (OR)
          </button>
          <button
            v-if="permite('anio')"
            type="button"
            class="px-2 py-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium"
            @click="emitir({ tipo: 'anio', anio: 1 })"
          >
            + Año completo
          </button>
        </div>
      </div>
    </template>

    <!-- Caso 2: Nodo Materia -->
    <template v-else-if="modelValue.tipo === 'materia'">
      <div class="flex items-center gap-2">
        <select
          :value="modelValue.codigo"
          class="form-input text-xs py-1 flex-1 font-mono"
          @change="actualizarMateriaCodigo($event.target.value)"
        >
          <option value="">
            — Seleccionar materia —
          </option>
          <option
            v-for="mat in materiasDisponibles"
            :key="mat.codigo"
            :value="mat.codigo"
          >
            {{ mat.codigo }} — {{ mat.nombre }}
          </option>
        </select>
        <button
          v-if="puedeAgrupar"
          type="button"
          class="text-xs text-stone-500 hover:text-stone-800 border border-stone-200 rounded px-1.5 py-0.5"
          title="Convertir esta condición en un grupo"
          @click="convertirEnGrupo"
        >
          Agrupar
        </button>
        <button
          type="button"
          class="text-stone-400 hover:text-red-600 font-bold px-1.5 py-0.5 rounded"
          title="Eliminar condición"
          @click="emitir(null)"
        >
          ×
        </button>
      </div>
    </template>

    <!-- Caso 3: Nodo Año Completo -->
    <template v-else-if="modelValue.tipo === 'anio'">
      <div class="flex items-center gap-2">
        <span class="text-xs font-medium text-stone-600 bg-stone-100 px-2 py-1 rounded">
          Año completo:
        </span>
        <select
          :value="modelValue.anio"
          class="form-input text-xs py-1 w-24"
          @change="actualizarAnioValor(Number($event.target.value))"
        >
          <option
            v-for="a in [0, 1, 2, 3, 4]"
            :key="a"
            :value="a"
          >
            Año {{ a }}
          </option>
        </select>
        <button
          v-if="puedeAgrupar"
          type="button"
          class="text-xs text-stone-500 hover:text-stone-800 border border-stone-200 rounded px-1.5 py-0.5 ml-auto"
          title="Convertir esta condición en un grupo"
          @click="convertirEnGrupo"
        >
          Agrupar
        </button>
        <button
          type="button"
          class="text-stone-400 hover:text-red-600 font-bold px-1.5 py-0.5 rounded"
          title="Eliminar condición"
          @click="emitir(null)"
        >
          ×
        </button>
      </div>
    </template>

    <!-- Caso 4: Nodo Grupo (AND / OR) -->
    <template v-else-if="modelValue.tipo === 'and' || modelValue.tipo === 'or'">
      <div class="space-y-2 border-l-2 pl-3" :class="modelValue.tipo === 'and' ? 'border-primary/40' : 'border-amber-400/60'">
        <div class="flex items-center justify-between text-xs">
          <span class="font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded" :class="modelValue.tipo === 'and' ? 'bg-primary/10 text-primary' : 'bg-amber-100 text-amber-800'">
            {{ modelValue.tipo === 'and' ? 'Y (Todas las condiciones)' : 'O (Al menos una condición)' }}
          </span>
          <div class="flex items-center gap-1">
            <button
              v-if="permite('materia')"
              type="button"
              class="text-xs text-stone-600 hover:text-stone-900 bg-stone-50 hover:bg-stone-100 border border-stone-200 px-1.5 py-0.5 rounded"
              @click="agregarHijo('materia')"
            >
              + Materia
            </button>
            <button
              v-if="permite('and') && puedeAnidarGrupo"
              type="button"
              class="text-xs text-stone-600 hover:text-stone-900 bg-stone-50 hover:bg-stone-100 border border-stone-200 px-1.5 py-0.5 rounded"
              @click="agregarHijo('and')"
            >
              + Y
            </button>
            <button
              v-if="permite('or') && puedeAnidarGrupo"
              type="button"
              class="text-xs text-stone-600 hover:text-stone-900 bg-stone-50 hover:bg-stone-100 border border-stone-200 px-1.5 py-0.5 rounded"
              @click="agregarHijo('or')"
            >
              + O
            </button>
            <button
              v-if="permite('anio')"
              type="button"
              class="text-xs text-stone-600 hover:text-stone-900 bg-stone-50 hover:bg-stone-100 border border-stone-200 px-1.5 py-0.5 rounded"
              @click="agregarHijo('anio')"
            >
              + Año
            </button>
            <button
              type="button"
              class="text-red-500 hover:text-red-700 font-bold px-1.5 py-0.5 rounded ml-2"
              title="Eliminar grupo completo"
              @click="emitir(null)"
            >
              ×
            </button>
          </div>
        </div>

        <!-- Lista de hijos -->
        <div class="space-y-2 mt-2">
          <div
            v-if="!modelValue.hijos || modelValue.hijos.length === 0"
            class="text-xs italic text-stone-400 p-2 bg-stone-50 rounded border border-dashed border-stone-200"
          >
            Grupo vacío (requiere al menos una condición).
          </div>
          <div
            v-for="(hijo, index) in modelValue.hijos"
            :key="index"
            class="relative pl-2"
          >
            <EditorCondicion
              :model-value="hijo"
              :materias-disponibles="materiasDisponibles"
              :tipos-permitidos="tiposPermitidos"
              :profundidad="profundidad + 1"
              @update:model-value="actualizarHijo(index, $event)"
            />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: Object,
    default: null
  },
  materiasDisponibles: {
    type: Array,
    default: () => []
  },
  /** Tipos de nodo que se pueden crear en este nivel. */
  tiposPermitidos: {
    type: Array,
    default: () => ['materia', 'and', 'or', 'anio']
  },
  /** Profundidad del árbol (0 = raíz). Límite visual: 4 niveles. */
  profundidad: {
    type: Number,
    default: 0
  }
})

/** Límite de anidamiento de grupos para que el árbol siga siendo legible. */
const MAX_PROFUNDIDAD = 4

const emit = defineEmits(['update:modelValue'])

/** Indica si el tipo de nodo está permitido en este editor. */
function permite(tipo) {
  return props.tiposPermitidos.includes(tipo)
}

/** Solo se pueden anidar grupos por debajo del límite. */
const puedeAgrupar = computed(
  () => permite('and') && props.profundidad < MAX_PROFUNDIDAD
)

const puedeAnidarGrupo = computed(() => props.profundidad + 1 < MAX_PROFUNDIDAD)

function emitir(nuevoValor) {
  emit('update:modelValue', nuevoValor)
}

/** Envuelve la hoja actual en un grupo AND para poder anidar condiciones. */
function convertirEnGrupo() {
  emitir({ tipo: 'and', hijos: [props.modelValue] })
}

function actualizarMateriaCodigo(codigo) {
  emitir({ tipo: 'materia', codigo })
}

function actualizarAnioValor(anio) {
  emitir({ tipo: 'anio', anio })
}

function agregarHijo(tipo) {
  const hijosActuales = Array.isArray(props.modelValue?.hijos) ? [...props.modelValue.hijos] : []
  let nuevoHijo = null
  if (tipo === 'materia') nuevoHijo = { tipo: 'materia', codigo: '' }
  else if (tipo === 'and') nuevoHijo = { tipo: 'and', hijos: [] }
  else if (tipo === 'or') nuevoHijo = { tipo: 'or', hijos: [] }
  else if (tipo === 'anio') nuevoHijo = { tipo: 'anio', anio: 1 }

  emitir({
    ...props.modelValue,
    hijos: [...hijosActuales, nuevoHijo]
  })
}

function actualizarHijo(index, valorHijo) {
  const hijosActuales = [...props.modelValue.hijos]
  if (valorHijo === null) {
    hijosActuales.splice(index, 1)
  } else {
    hijosActuales[index] = valorHijo
  }
  emitir({
    ...props.modelValue,
    hijos: hijosActuales
  })
}
</script>
