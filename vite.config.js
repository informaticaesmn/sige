import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'   // ← necesario para el alias

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  base: '/rac/',  // ← nombre del repositorio
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'), // ← crea el alias "@"
    },
  },
})