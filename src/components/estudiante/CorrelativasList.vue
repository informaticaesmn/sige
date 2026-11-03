<template>
  <ul class="space-y-1">
    <template
      v-for="(item, index) in items"
      :key="index"
    >
      <li v-if="item.tipo === 'materia'">
        <button
          v-if="esNavegable(item)"
          type="button"
          class="text-left text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
          :aria-label="`Ir a la materia ${item.nombre}`"
          @click="seleccionar(item.codigo)"
        >
          <span class="mr-2">•</span>
          <span>{{ item.nombre }}</span>
        </button>

        <template v-else>
          <span class="mr-2">•</span>
          <span>{{ item.nombre }}</span>
        </template>
      </li>

      <li v-else-if="item.tipo === 'anio_completo'">
        <span class="mr-2">•</span>
        <span>{{ item.texto }}</span>
      </li>

      <li v-else-if="item.tipo === 'grupo'">
        <div class="flex items-start">
          <span class="mr-2">•</span>
          <div class="flex-1">
            <div>{{ item.texto }}</div>
            <ul
              v-if="item.items && item.items.length"
              class="ml-4 mt-1 space-y-1"
            >
              <template
                v-for="(subitem, subindex) in item.items"
                :key="subindex"
              >
                <li v-if="subitem.tipo === 'materia'">
                  <button
                    v-if="esNavegable(subitem)"
                    type="button"
                    class="text-left text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                    :aria-label="`Ir a la materia ${subitem.nombre}`"
                    @click="seleccionar(subitem.codigo)"
                  >
                    <span class="mr-2">◦</span>
                    <span>{{ subitem.nombre }}</span>
                  </button>

                  <template v-else>
                    <span class="mr-2">◦</span>
                    <span>{{ subitem.nombre }}</span>
                  </template>
                </li>

                <li v-else-if="subitem.tipo === 'anio_completo'">
                  <span class="mr-2">◦</span>
                  <span>{{ subitem.texto }}</span>
                </li>

                <li v-else-if="subitem.tipo === 'grupo'">
                  <div class="flex items-start">
                    <span class="mr-2">◦</span>
                    <div class="flex-1">
                      <div>{{ subitem.texto }}</div>
                      <ul
                        v-if="subitem.items && subitem.items.length"
                        class="ml-4 mt-1 space-y-1"
                      >
                        <li
                          v-for="(subsubitem, subsubindex) in subitem.items"
                          :key="subsubindex"
                        >
                          <template v-if="subsubitem.tipo === 'materia'">
                            <button
                              v-if="esNavegable(subsubitem)"
                              type="button"
                              class="text-left text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                              :aria-label="`Ir a la materia ${subsubitem.nombre}`"
                              @click="seleccionar(subsubitem.codigo)"
                            >
                              <span class="mr-2">▪</span>
                              <span>{{ subsubitem.nombre }}</span>
                            </button>

                            <span v-else>
                              <span class="mr-2">▪</span>
                              <span>{{ subsubitem.nombre }}</span>
                            </span>
                          </template>

                          <span v-else-if="subsubitem.tipo === 'anio_completo'">
                            <span class="mr-2">▪</span>
                            <span>{{ subsubitem.texto }}</span>
                          </span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </li>
              </template>
            </ul>
          </div>
        </div>
      </li>
    </template>
  </ul>
</template>

<script setup>
const props = defineProps({
  items: {
    type: Array,
    required: true
  },
  /**
   * Cuando es `true`, las materias se renderizan como botones que emiten
   * `seleccionar` con su código (para navegar entre correlativas).
   */
  seleccionable: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['seleccionar'])

/**
 * Indica si un nodo de materia se puede navegar.
 * @param {Object} item
 * @returns {boolean}
 */
function esNavegable(item) {
  return props.seleccionable && item?.tipo === 'materia' && Boolean(item.codigo)
}

/**
 * Emite el código de la materia elegida.
 * @param {string} codigo
 */
function seleccionar(codigo) {
  if (codigo) emit('seleccionar', codigo)
}
</script>

<style scoped>
/* Estilos adicionales si es necesario */
</style>
