<!-- src/components/ui/PanelComentarios.vue -->
<!--
  Panel de comentarios de revisión de un plan.
  Es un componente "tonto": recibe los comentarios y emite las acciones; la
  vista los conecta con `useComentariosPlanes`.

  Si `materiaId` es `null`, muestra los comentarios generales del plan; si trae
  un código, muestra solo los de esa materia.
-->
<template>
  <div class="border border-stone-200 rounded-lg bg-white p-3">
    <div class="flex items-center justify-between mb-2">
      <h4 class="text-xs font-semibold text-stone-700">{{ titulo }}</h4>
      <span class="text-xs text-stone-500">
        {{ pendientesCount }} pendiente(s) de {{ comentariosFiltrados.length }}
      </span>
    </div>

    <p v-if="cargando" class="text-xs text-stone-500 italic">Cargando comentarios...</p>
    <p v-else-if="error" class="text-xs text-red-600">{{ error }}</p>
    <p v-else-if="comentariosFiltrados.length === 0" class="text-xs text-stone-500 italic">
      Sin comentarios todavía.
    </p>

    <ul v-else class="space-y-2 mb-3">
      <li
        v-for="comentario in comentariosFiltrados"
        :key="comentario.id"
        class="text-xs border border-stone-200 rounded p-2"
        :class="comentario.resuelto ? 'bg-stone-50 opacity-75' : 'bg-amber-50/50'"
      >
        <div class="flex items-center justify-between gap-2 mb-1">
          <span class="font-semibold" :class="claseTipo(comentario.tipo)">
            {{ etiquetaTipo(comentario.tipo) }}
          </span>
          <span class="text-stone-400">{{ formatearFechaHora(comentario.creadoEn) }}</span>
        </div>

        <p
          class="text-stone-700 whitespace-pre-wrap"
          :class="comentario.resuelto ? 'line-through' : ''"
        >
          {{ comentario.texto }}
        </p>

        <div class="flex items-center justify-between gap-2 mt-1">
          <span class="text-stone-400">{{ comentario.autorEmail || comentario.autor || '—' }}</span>
          <div class="flex items-center gap-2">
            <button
              v-if="!comentario.resuelto"
              type="button"
              class="btn-link"
              @click="emit('resolver', comentario.id)"
            >
              Resolver
            </button>
            <button
              v-else
              type="button"
              class="btn-link"
              @click="emit('reabrir', comentario.id)"
            >
              Reabrir
            </button>
            <button
              type="button"
              class="btn-link text-red-600"
              title="Eliminar comentario"
              @click="emit('eliminar', comentario.id)"
            >
              ×
            </button>
          </div>
        </div>
      </li>
    </ul>

    <div class="space-y-2">
      <select v-model="tipoNuevo" class="form-input text-xs w-full sm:w-44">
        <option value="nota">Nota</option>
        <option value="actualizacion">Actualización</option>
        <option value="chequear">A chequear</option>
        <option value="listo">Listo</option>
      </select>
      <textarea
        v-model="textoNuevo"
        class="form-input text-xs w-full"
        rows="2"
        placeholder="Escribí un comentario..."
      ></textarea>
      <div class="flex justify-end">
        <button
          type="button"
          class="btn btn-secondary text-xs"
          :disabled="!textoNuevo.trim()"
          @click="enviar"
        >
          Agregar comentario
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { formatearFechaHora } from '@/utils/fechas.js'

const props = defineProps({
  /** Comentarios del plan (se filtran por `materiaId`). */
  comentarios: { type: Array, default: () => [] },
  /** Materia a la que se anclan los comentarios (`null` = general). */
  materiaId: { type: String, default: null },
  /** Título del panel. */
  titulo: { type: String, default: 'Comentarios' },
  cargando: { type: Boolean, default: false },
  error: { type: String, default: '' }
})

const emit = defineEmits(['agregar', 'resolver', 'reabrir', 'eliminar'])

const textoNuevo = ref('')
const tipoNuevo = ref('nota')

/** Etiqueta legible de cada tipo de comentario. */
const ETIQUETAS_TIPO = {
  nota: 'Nota',
  actualizacion: 'Actualización',
  chequear: 'A chequear',
  listo: 'Listo'
}

/** Colores por tipo (presentación). */
const CLASES_TIPO = {
  nota: 'text-stone-700',
  actualizacion: 'text-blue-700',
  chequear: 'text-amber-700',
  listo: 'text-green-700'
}

const comentariosFiltrados = computed(() =>
  props.comentarios.filter((c) => (c.materiaId || null) === (props.materiaId || null))
)

const pendientesCount = computed(
  () => comentariosFiltrados.value.filter((c) => !c.resuelto).length
)

function etiquetaTipo(tipo) {
  return ETIQUETAS_TIPO[tipo] || 'Nota'
}

function claseTipo(tipo) {
  return CLASES_TIPO[tipo] || CLASES_TIPO.nota
}

/** Emite el comentario nuevo y limpia el formulario. */
function enviar() {
  const texto = textoNuevo.value.trim()
  if (!texto) return

  emit('agregar', {
    texto,
    tipo: tipoNuevo.value,
    materiaId: props.materiaId || null
  })
  textoNuevo.value = ''
}
</script>
