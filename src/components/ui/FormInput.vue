<template>
  <div>
    <label
      v-if="label"
      :for="id"
      class="block text-sm font-medium text-stone-600"
    >
      {{ label }}
    </label>

    <input
      :id="id"
      :name="name"
      :type="type"
      :value="modelValue"
      @input="$emit('update:modelValue', $event.target.value)"
      class="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
    />

    <p v-if="error" class="mt-1 text-sm text-red-600">{{ error }}</p>
  </div>
</template>

<script setup>
defineProps({
  id: String,       // identificador único → conecta label e input
  name: String,     // nombre del campo → útil para autocompletar / forms
  label: String,    // texto visible del label
  type: String,     // tipo de input: text, password, email, etc
  error: String,    // mensaje de error
  modelValue: String // valor que viene del padre con v-model
})

defineEmits(['update:modelValue'])
</script>
