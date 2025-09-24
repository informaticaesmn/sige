<!-- src/components/auth/AuthFooter.vue -->
<template>
  <div class="text-xs text-center text-gray-500 flex items-center justify-center gap-2 mt-4">
    <button
      v-if="!isRegisterMode"
      type="button"
      @click="$emit('reset')"
      @keydown.space.prevent="$emit('reset')"
      class="text-gray-500 hover:text-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500 rounded px-2 py-1"
    >
      ¿Olvidaste tu contraseña?
    </button>

    <span v-if="!isRegisterMode">|</span>

    <button
      type="button"
      @click="$emit('toggle')"
      @keydown.space.prevent="$emit('toggle')"
      class="text-gray-500 hover:text-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500 rounded px-2 py-1"
    >
      {{ isRegisterMode ? '¿Ya tenés cuenta? Ingresar' : '¿No tenés cuenta? Registrate' }}
    </button>
  </div>
</template>

<script setup>
defineProps({ isRegisterMode: Boolean })
defineEmits(['reset', 'toggle'])
</script>