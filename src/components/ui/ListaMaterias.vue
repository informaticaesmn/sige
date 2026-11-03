<!-- src/components/ui/ListaMaterias.vue -->
<!--
  Lista navegable de materias del plan (columna izquierda del editor compacto).
  Es un componente "tonto": recibe la lista plana y los comentarios, y solo
  emite `seleccionar` con el código elegido. No conoce Firestore ni composables.
-->
<template>
  <div
    ref="raiz"
    class="lista-materias flex flex-col h-full"
    @keydown="onKeydown"
  >
    <!-- Buscador -->
    <div class="p-2 border-b border-stone-200">
      <input
        ref="buscadorRef"
        v-model="busqueda"
        type="search"
        class="form-input text-xs w-full"
        placeholder="Buscar código o nombre… (/)"
        aria-label="Buscar materias"
      >
    </div>

    <!-- Estados vacíos -->
    <p
      v-if="!materias.length"
      class="p-4 text-xs text-stone-500 text-center"
    >
      No hay materias cargadas.
    </p>
    <p
      v-else-if="!gruposFiltrados.length"
      class="p-4 text-xs text-stone-500 text-center"
    >
      Ninguna materia coincide con la búsqueda.
    </p>

    <!-- Lista agrupada por año -->
    <nav
      v-else
      class="overflow-y-auto flex-1"
      aria-label="Materias del plan"
    >
      <section
        v-for="grupo in gruposFiltrados"
        :key="grupo.anio"
      >
        <button
          type="button"
          class="w-full flex items-center gap-2 px-3 py-2 bg-stone-100 hover:bg-stone-200 text-left text-xs font-semibold text-stone-700 border-b border-stone-200"
          :aria-expanded="estaAbierto(grupo)"
          @click="alternarAnio(grupo.anio)"
        >
          <span>{{ etiquetaAnio(grupo.anio) }}</span>
          <span class="font-normal text-stone-500">({{ grupo.materias.length }})</span>
          <span
            class="ml-auto text-stone-500"
            aria-hidden="true"
          >
            {{ estaAbierto(grupo) ? '▾' : '▸' }}
          </span>
        </button>

        <ul
          v-show="estaAbierto(grupo)"
          class="divide-y divide-stone-100"
        >
          <li
            v-for="m in grupo.materias"
            :key="m.codigo"
          >
            <button
              type="button"
              class="w-full flex items-center gap-2 px-3 py-2 min-h-[40px] text-left text-xs border-l-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
              :class="
                esSeleccionada(m.codigo)
                  ? 'bg-primary/10 text-primary border-primary font-medium'
                  : 'border-transparent text-stone-700 hover:bg-stone-50'
              "
              :data-codigo="m.codigo"
              :aria-label="etiquetaFila(m)"
              :aria-current="esSeleccionada(m.codigo) ? 'true' : undefined"
              @click="seleccionar(m.codigo)"
            >
              <span class="font-mono text-[11px] font-semibold text-stone-600">
                {{ m.codigo }}
              </span>
              <span class="flex-1 truncate">{{ nombreVisible(m) }}</span>
              <span class="text-[10px] px-1 rounded bg-stone-100 text-stone-600">
                {{ cursadaVisible(m) }}
              </span>
              <span
                v-if="mostrarAvisos && incompleta(m)"
                class="text-amber-600"
                title="Falta nombre o cursada"
                aria-label="Datos incompletos"
              >
                ⚠
              </span>
              <span
                v-if="mostrarAvisos && conteoComentarios[m.codigo]"
                class="text-stone-500"
                :title="`${conteoComentarios[m.codigo]} comentario(s)`"
              >
                💬{{ conteoComentarios[m.codigo] }}
              </span>
            </button>
          </li>
        </ul>
      </section>
    </nav>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'

const props = defineProps({
  /** Materias planas del plan (`{ codigo, nombre, nombre_c, cursada, anio, ... }`). */
  materias: {
    type: Array,
    default: () => []
  },
  /** Código de la materia seleccionada. */
  seleccionado: {
    type: String,
    default: ''
  },
  /** Comentarios del plan; se usa `materiaId` para el contador de cada fila. */
  comentarios: {
    type: Array,
    default: () => []
  },
  /**
   * Muestra los avisos propios del editor (datos incompletos y comentarios).
   * La vista pública lo desactiva para dejar sólo la información académica.
   */
  mostrarAvisos: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['seleccionar'])

const raiz = ref(null)
const buscadorRef = ref(null)
const busqueda = ref('')
const aniosCerrados = ref(new Set())

/**
 * Normaliza texto para buscar sin distinguir mayúsculas ni acentos.
 * @param {*} texto
 * @returns {string}
 */
function normalizar(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

/**
 * Nombre a mostrar en la fila: nombre corto, luego nombre completo.
 * @param {Object} materia
 * @returns {string}
 */
function nombreVisible(materia) {
  const corto = String(materia.nombre_c ?? '').trim()
  const largo = String(materia.nombre ?? '').trim()
  return corto || largo || '(sin nombre)'
}

/**
 * Texto del badge de cursada.
 * @param {Object} materia
 * @returns {string}
 */
function cursadaVisible(materia) {
  if (!materia.cursada) return '—'
  return materia.cursada === 'anual' ? 'Anual' : materia.cursada
}

/**
 * Indica si a la materia le falta algún dato mínimo para revisarla.
 * @param {Object} materia
 * @returns {boolean}
 */
function incompleta(materia) {
  return !String(materia.nombre ?? '').trim() || !materia.cursada
}

/**
 * Etiqueta del encabezado de año.
 * @param {number} anio
 * @returns {string}
 */
function etiquetaAnio(anio) {
  if (Number(anio) === -1) return 'Año sin código'
  return Number(anio) === 0 ? 'Año 0 (Pregrado)' : `Año ${anio}`
}

/**
 * Etiqueta accesible de una fila.
 * @param {Object} materia
 * @returns {string}
 */
function etiquetaFila(materia) {
  const aviso = props.mostrarAvisos && incompleta(materia) ? ', datos incompletos' : ''
  return `${materia.codigo} ${nombreVisible(materia)}${aviso}`
}

/** Cantidad de comentarios por materia. */
const conteoComentarios = computed(() => {
  const mapa = {}
  for (const comentario of props.comentarios) {
    const materiaId = comentario?.materiaId
    if (!materiaId) continue
    mapa[materiaId] = (mapa[materiaId] || 0) + 1
  }
  return mapa
})

/** Materias agrupadas por año y ordenadas por código. */
const grupos = computed(() => {
  const mapa = new Map()

  for (const materia of props.materias) {
    const anio = Number.isFinite(Number(materia.anio)) ? Number(materia.anio) : -1
    if (!mapa.has(anio)) mapa.set(anio, [])
    mapa.get(anio).push(materia)
  }

  return [...mapa.entries()]
    .sort(([a], [b]) => a - b)
    .map(([anio, materias]) => ({
      anio,
      materias: [...materias].sort((a, b) =>
        String(a.codigo).localeCompare(String(b.codigo), 'es', {
          numeric: true,
          sensitivity: 'base'
        })
      )
    }))
})

/** Grupos visibles según el buscador. */
const gruposFiltrados = computed(() => {
  const consulta = normalizar(busqueda.value)
  if (!consulta) return grupos.value

  return grupos.value
    .map((grupo) => ({
      ...grupo,
      materias: grupo.materias.filter((materia) =>
        normalizar(`${materia.codigo} ${materia.nombre} ${materia.nombre_c}`).includes(consulta)
      )
    }))
    .filter((grupo) => grupo.materias.length > 0)
})

/** Materias visibles en orden, para la navegación con teclado. */
const visibles = computed(() =>
  gruposFiltrados.value.flatMap((grupo) =>
    estaAbierto(grupo) ? grupo.materias.map((materia) => materia.codigo) : []
  )
)

/**
 * Un grupo se muestra abierto si no está colapsado o si hay una búsqueda activa.
 * @param {{ anio: number }} grupo
 * @returns {boolean}
 */
function estaAbierto(grupo) {
  return busqueda.value.trim() !== '' || !aniosCerrados.value.has(grupo.anio)
}

/**
 * Abre/cierra un grupo de año.
 * @param {number} anio
 */
function alternarAnio(anio) {
  const siguiente = new Set(aniosCerrados.value)
  if (siguiente.has(anio)) siguiente.delete(anio)
  else siguiente.add(anio)
  aniosCerrados.value = siguiente
}

/**
 * Indica si una materia es la seleccionada.
 * @param {string} codigo
 * @returns {boolean}
 */
function esSeleccionada(codigo) {
  return codigo === props.seleccionado
}

/**
 * Emite la selección de una materia.
 * @param {string} codigo
 */
function seleccionar(codigo) {
  if (!codigo) return
  emit('seleccionar', codigo)
}

/**
 * Busca el botón de una fila por código.
 * @param {string} codigo
 * @returns {HTMLElement|null}
 */
function filaDe(codigo) {
  const filas = raiz.value?.querySelectorAll?.('[data-codigo]') || []
  return [...filas].find((fila) => fila.dataset.codigo === codigo) || null
}

/**
 * Maneja `/` para enfocar el buscador y las flechas para recorrer las filas.
 * @param {KeyboardEvent} event
 */
function onKeydown(event) {
  const objetivo = event.target
  const enCampo =
    objetivo?.tagName === 'INPUT' ||
    objetivo?.tagName === 'TEXTAREA' ||
    objetivo?.tagName === 'SELECT'

  if (event.key === '/' && !enCampo) {
    event.preventDefault()
    buscadorRef.value?.focus()
    return
  }

  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return

  // Desde el buscador, la flecha abajo entra a la primera fila.
  if (!objetivo?.closest?.('[data-codigo]')) {
    if (event.key === 'ArrowDown' && objetivo === buscadorRef.value && visibles.value.length) {
      event.preventDefault()
      nextTick(() => filaDe(visibles.value[0])?.focus())
    }
    return
  }

  const actual = visibles.value.indexOf(objetivo.dataset.codigo)
  if (actual === -1) return

  event.preventDefault()
  const destino =
    event.key === 'ArrowDown'
      ? Math.min(actual + 1, visibles.value.length - 1)
      : Math.max(actual - 1, 0)

  if (destino === actual) return
  nextTick(() => filaDe(visibles.value[destino])?.focus())
}

/** Lleva la fila seleccionada a la vista. */
function scrollASeleccionado() {
  if (!props.seleccionado) return
  const fila = filaDe(props.seleccionado)
  fila?.scrollIntoView?.({ block: 'nearest' })
}

/**
 * Abre el año de la materia seleccionada si estaba colapsado, para que la fila
 * quede visible (por ejemplo, al saltar a una correlativa de otro año).
 * @param {string} codigo
 */
function abrirAnioDe(codigo) {
  if (!codigo) return
  const materia = props.materias.find((m) => m.codigo === codigo)
  if (!materia) return

  const anio = Number.isFinite(Number(materia.anio)) ? Number(materia.anio) : -1
  if (!aniosCerrados.value.has(anio)) return

  const siguiente = new Set(aniosCerrados.value)
  siguiente.delete(anio)
  aniosCerrados.value = siguiente
}

watch(
  () => props.seleccionado,
  async (codigo) => {
    abrirAnioDe(codigo)
    await nextTick()
    scrollASeleccionado()
  }
)

onMounted(() => {
  abrirAnioDe(props.seleccionado)
  scrollASeleccionado()
})
</script>
