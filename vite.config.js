import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'   // ← necesario para el alias
import { execSync } from 'child_process'
import pkg from './package.json'

// tomar hash corto del último commit
const commitHash = execSync('git rev-parse --short HEAD').toString().trim();

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
  define: {
    __APP_COMMIT__: JSON.stringify(commitHash), // Define la variable global del Commit
    __APP_VERSION__: JSON.stringify(pkg.version) // Define la variable global de la versión del package.json
  },

})