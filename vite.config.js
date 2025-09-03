import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'   // ← necesario para el alias

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  base: '/',  // ← para el dominio raiz de vercel - antes nombre del repositorio '/rac/'
  build: {
    outDir: 'dist' // Directorio de salida para los archivos construidos
    },
  resolve: {
     alias: {
      '@': resolve(__dirname, 'src'), // ← crea el alias "@"
    },
  },
})