<template>
  <div class="min-h-screen flex flex-col">
    <!-- Header común (logo, título, logout) -->
    <AuthHeader />

    <!-- Menú lateral (más adelante) -->
      <nav class="bg-gray-800 text-white p-4">
        <ul class="space-y-2">
          <li>
            <router-link to="/admin" class="block hover:bg-gray-600 rounded px-3 py-2">
              Tablero
            </router-link>
          </li>
        </ul>
      </nav>
      <!-- links por rol -->
   
    <!-- Contenido de la vista hija -->
    <main class="flex-1 p-6">
      <router-view />
    </main>
  </div>
</template>