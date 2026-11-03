/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.js'],
    clearMocks: true,
    restoreMocks: true,
    // IMPORTANTE: no poner `isolate: false`.
    // Varios specs llaman `vi.resetModules()` (setup global y beforeEach propios para
    // resetear los singletons useAuth/useLayout). Compartir el registro de módulos
    // entre archivos hacía que un spec dejara el grafo parcialmente reseteado y el
    // siguiente montara componentes con copias mezcladas de Vue (render vacío, fallos
    // intermitentes según el orden/seed). La suite es chica: aislar cuesta pocos segundos.
    isolate: true,
    // AGREGADO: Solo correr tests unitarios con este comando
    include: ['tests/unit/**/*.spec.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'src/main.js',
        'src/router/',
        'src/App.vue',
        'src/style.css',
        'tests/',
        '**/*.config.js',
      ],
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})