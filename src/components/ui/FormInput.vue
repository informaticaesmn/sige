<template>
  <div>
    <!-- Label -->
    <label
      v-if="label"
      :for="id"
      class="form-label"
    >
      {{ label }}
    </label>

    <!-- Input -->
    <input
      :id="id"
      :name="name"
      :type="type"
      :value="modelValue"
      @input="$emit('update:modelValue', $event.target.value)"
      class="form-input"
      :class="{'form-input--danger': error }"
    />

    <!-- Mensaje de error -->
    <p v-if="error" class="form-error">
      {{ error }}
    </p>
  </div>
</template>

<script setup>
const props = defineProps({
  id: { type: String, required: true },
  label: { type: String, default: '' },
  name: { type: String, default: '' },
  type: { type: String, default: 'text' },
  modelValue: { type: [String, Number], default: '' },
  error: { type: String, default: '' },
})

defineEmits(['update:modelValue'])

</script>
