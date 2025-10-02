<!-- src/components/auth/AuthFooter.vue (VERSIÓN FINAL Y CORRECTA) -->
<template>
  <div class="text-xs text-center text-stone-600 flex items-center justify-center gap-4">
    <button
      type="button"
      @click="$emit('reset')"
      class="btn-link"
    >
      ¿Olvidaste tu contraseña?
    </button>
    
    <button
      type="button"
      @click="$emit('register')"
      class="btn-link"
    >
      ¿No tenés cuenta? Registrate
    </button>
    
  </div>
</template>

<script setup>
defineEmits(['reset', 'register'])
</script>