<template>
  <div class="min-h-screen flex flex-col">
    <!-- Header común (logo, título, logout) -->
    <AuthHeader />

    <!-- Menú lateral (más adelante) -->
    <nav class="bg-teal-700 text-white p-4">
      <!-- links por rol -->
    </nav>

    <!-- Contenido de la vista hija -->
    <main class="flex-1 p-6">
      <router-view />
    </main>
  </div>
</template>