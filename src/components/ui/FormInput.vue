<!-- src/components/FormInput.vue -->
<template>
  <div class="form-control">
    <label :for="id" class="form-label">{{ label }}</label>
    
    <input
      :id="id"
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :autocomplete="autocomplete"
      :class="{ 
        'form-input': true, 
        'form-input--danger': error,
        'form-input--info': info
      }"
      @input="$emit('update:modelValue', $event.target.value)"
      v-bind="$attrs" 
    />

    <!-- 2. MENSAJES DE AYUDA Y ERROR -->
    <!-- Mostramos el error si existe -->
    <p v-if="error" class="alert alert-danger">
      {{ error }}
    </p>
    <!-- Mostramos un texto de ayuda si se proporciona y no hay error -->
    <p v-else-if="info" class="alert alert-info">
      {{ info }}
    </p>

  </div>
</template>

<script setup>
defineProps({
  label: { type: String, required: true },
  modelValue: { type: [String, Number], default: '' },
  id: { type: String, required: true },
  type: { type: String, default: 'text' },
  placeholder: { type: String, default: '' },
  autocomplete: { type: String, default: 'off' },
  error: { type: String, default: '' },
  info: { type: String, default: '' }
})

defineEmits(['update:modelValue'])
</script>
