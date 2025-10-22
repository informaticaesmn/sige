<!-- src/views/bedel/ConfirmarInscripciones.vue -->
<template>
  <div class="p-6">
    <h2 class="mb-6">Confirmar Inscripciones - Ciclo 2026-1</h2>
    <div v-for="comision in comisionesAgrupadas" :key="comision.id" class="card mb-6">
      <h4>{{ comision.materia }} - Comisión {{ comision.id }}</h4>
      <div v-for="insc in comision.inscripciones" :key="insc.uid" class="card-item mt-2">
        <p>{{ insc.estudiante }} ({{ insc.email }})</p>
        <button @click="confirmar(insc)" class="btn btn-primary mt-2">✅ Confirmar</button>
      </div>
    </div>
  </div>
</template>