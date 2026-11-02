<!-- src/components/ui/SelectMateria.vue -->
<!--
  Autocomplete para seleccionar una materia mostrando "código - nombre".
  Emite `select` con el código elegido. Pensado para cargar correlativas
  sin que el usuario tenga que tipear códigos a mano.
-->
<template>
  <div class="relative">
    <MagnifyingGlassIcon
      class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
    />

    <input
      v-model="busqueda"
      type="text"
      class="form-input w-full pl-9"
      :placeholder="placeholder"
      autocomplete="off"
      @focus="abrir"
      @blur="cerrar"
      @keydown.enter.prevent="seleccionarResaltado"
      @keydown.down.prevent="moverResaltado(1)"
      @keydown.up.prevent="moverResaltado(-1)"
      @keydown.esc="cerrar"
    >

    <!-- Resultados del autocomplete -->
    <ul
      v-if="abierto && filtradas.length > 0"
      class="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-stone-300 bg-white py-1 shadow-lg"
    >
      <li
        v-for="(m, idx) in filtradas"
        :key="m.codigo"
        :class="[
          'flex cursor-pointer items-center gap-2 px-3 py-2 text-sm',
          resaltado === idx ? 'bg-primary text-white' : 'text-stone-800 hover:bg-stone-100'
        ]"
        @mousemove="resaltado = idx"
        @mousedown.prevent="seleccionar(m)"
      >
        <span class="shrink-0 font-mono text-xs opacity-70">{{ m.codigo }}</span>
        <span class="truncate">{{ m.nombre }}</span>
      </li>
    </ul>

    <p
      v-else-if="abierto && busqueda.trim() !== ''"
      class="absolute z-50 mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-xs text-stone-500 shadow-lg"
    >
      Sin resultados
    </p>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { MagnifyingGlassIcon } from '@heroicons/vue/24/outline'

const props = defineProps({
  /** Materias candidatas: [{ codigo, nombre }] */
  materiasDisponibles: {
    type: Array,
    default: () => []
  },
  /** Códigos ya seleccionados que no deben volver a ofrecerse */
  excluir: {
    type: Array,
    default: () => []
  },
  /** Texto del campo cuando está vacío */
  placeholder: {
    type: String,
    default: 'Buscar materia por código o nombre...'
  }
})

const emit = defineEmits(['select'])

const busqueda = ref('')
const abierto = ref(false)
const resaltado = ref(0)

/** Filtrar candidatas por texto y quitar las ya seleccionadas. */
const filtradas = computed(() => {
  const excluidos = new Set(props.excluir)
  const termino = busqueda.value.toLowerCase().trim()
  const base = props.materiasDisponibles.filter((m) => !excluidos.has(m.codigo))

  if (!termino) return base.slice(0, 20)

  return base
    .filter(
      (m) =>
        m.codigo.toLowerCase().includes(termino) ||
        (m.nombre || '').toLowerCase().includes(termino)
    )
    .slice(0, 50)
})

/** Abre el desplegable al enfocar. */
function abrir() {
  abierto.value = true
  resaltado.value = 0
}

/** Cierra el desplegable y limpia la búsqueda. */
function cerrar() {
  abierto.value = false
  busqueda.value = ''
}

/** Emite el código seleccionado y limpia el campo. */
function seleccionar(materia) {
  emit('select', materia.codigo)
  busqueda.value = ''
  abierto.value = false
  resaltado.value = 0
}

/** Selecciona la opción resaltada con Enter. */
function seleccionarResaltado() {
  const materia = filtradas.value[resaltado.value]
  if (materia) seleccionar(materia)
}

/** Mueve el resaltado con las flechas, sin salir de los límites. */
function moverResaltado(direccion) {
  const nuevo = resaltado.value + direccion
  if (nuevo >= 0 && nuevo < filtradas.value.length) {
    resaltado.value = nuevo
  }
}
</script>
