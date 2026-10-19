/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import { fileURLToPath, URL } from 'node:url'

// Config separada para los tests de integración (emuladores de Firebase).
// `vitest.config.js` incluye solo tests/unit, así que con una sola config
// `vitest run tests/integration` no encontraba ningún archivo.
// Se corre con: npm run test:integration
export default defineConfig({
  test: {
    environment: 'node', // sin jsdom: acá no hay componentes Vue
    globals: true,
    include: ['tests/integration/**/*.spec.js'],
    // Los dos archivos comparten UN solo emulador: si corren en paralelo, el
    // clearFirestore() de uno borra los datos que el otro está usando.
    fileParallelism: false,
    // Los emuladores tardan en levantar y limpiar
    testTimeout: 20000,
    hookTimeout: 30000,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
