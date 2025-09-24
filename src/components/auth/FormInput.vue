<!-- src/components/auth/FormInput.vue -->
<template>
  <div class="mb-4">
    <label :for="id" class="block text-sm font-medium text-gray-700 mb-1">
      {{ label }}
    </label>
    <input
      :id="id"
      :type="type"
      :value="modelValue"
      @input="$emit('update:modelValue', $event.target.value)"
      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
      :aria-invalid="!!error"
      :aria-describedby="error ? `${id}-error` : null"
    />
    <p v-if="error" :id="`${id}-error`" class="text-xs text-red-600 mt-1">
      {{ error }}
    </p>
  </div>
</template>

<script setup>
defineProps({
  id: String,
  label: String,
  type: { type: String, default: 'text' },
  modelValue: String,
  error: String
})
defineEmits(['update:modelValue'])
</script>