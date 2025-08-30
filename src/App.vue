<template>
  <div class="min-h-screen bg-stone-100">
    <nav class="bg-blue-600 text-white p-4 flex gap-4">
      <router-link to="/">Login</router-link>
      <router-link to="/dashboard">Dashboard</router-link>
      <router-link to="/inscripciones">Inscripciones</router-link>
    </nav>
    <router-view />
  </div>
</template>