<template>
  <div class="min-h-screen flex flex-col">
    <!-- Header común (logo, título, logout) -->
    <AuthHeader />

    <!-- Menú lateral (más adelante) -->
   <nav class="bg-teal-700 text-white p-4">
        <ul class="space-y-2">
            <li>
            <router-link to="/estudiante" class="block hover:bg-teal-600 rounded px-3 py-2">
                Tablero
            </router-link>
            </li>
            <li>
            <router-link to="/estudiante/inscripciones" class="block hover:bg-teal-600 rounded px-3 py-2">
                Inscripciones
            </router-link>
            </li>
        </ul>
    </nav>

    <!-- Contenido de la vista hija -->
    <main class="flex-1 p-6">
      <router-view />
    </main>
  </div>
</template>