<template>
  <ul class="space-y-1">
    <template v-for="(item, index) in items" :key="index">
      <li v-if="item.tipo === 'materia'">
        <span class="mr-2">•</span>
        <span>{{ item.nombre }}</span>
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
            <ul v-if="item.items && item.items.length" class="ml-4 mt-1 space-y-1">
              <template v-for="(subitem, subindex) in item.items" :key="subindex">
                <li v-if="subitem.tipo === 'materia'">
                  <span class="mr-2">◦</span>
                  <span>{{ subitem.nombre }}</span>
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
                      <ul v-if="subitem.items && subitem.items.length" class="ml-4 mt-1 space-y-1">
                        <li v-for="(subsubitem, subsubindex) in subitem.items" :key="subsubindex">
                          <span v-if="subsubitem.tipo === 'materia'">
                            <span class="mr-2">▪</span>
                            <span>{{ subsubitem.nombre }}</span>
                          </span>
                          
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
defineProps({
  items: {
    type: Array,
    required: true
  }
})
</script>

<style scoped>
/* Estilos adicionales si es necesario */
</style>