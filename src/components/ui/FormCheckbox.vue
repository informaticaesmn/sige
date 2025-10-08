<template>
  <div class="form-control">
    <label class="form-checkbox-label">
      <input
        :id="id"
        type="checkbox"
        :checked="modelValue"
        :disabled="disabled"
        :class="{ 
          'form-checkbox': true, 
          'form-checkbox--error': error,
          'form-checkbox--disabled': disabled
        }"
        @change="$emit('update:modelValue', $event.target.checked)"
        v-bind="$attrs"
      />
      <span class="form-checkbox-text">{{ label }}</span>
      <span v-if="required" class="form-checkbox-required">*</span>
    </label>

    <!-- Mensajes de ayuda y error -->
    <p v-if="error" class="alert alert-danger mt-1">
      {{ error }}
    </p>
    <p v-else-if="info" class="alert alert-info mt-1">
      {{ info }}
    </p>
  </div>
</template>

<script setup>
defineProps({
  label: { type: String, required: true },
  modelValue: { type: Boolean, default: false },
  id: { type: String, required: true },
  error: { type: String, default: '' },
  info: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  required: { type: Boolean, default: false }
})

defineEmits(['update:modelValue'])
</script>

<style scoped>
/* Estilos adicionales específicos del checkbox */
.form-checkbox-label {
  @apply flex items-center cursor-pointer select-none;
}

.form-checkbox-text {
  @apply ml-2 text-xs 
}

.form-checkbox-required {
  @apply ml-1 text-red-500 text-xs;
}

.form-checkbox--disabled + .form-checkbox-text {
  @apply text-stone-400 cursor-not-allowed;
}
</style>