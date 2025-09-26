import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'   // ← necesario para el alias
import { execSync } from 'child_process'
import pkg from './package.json'

// tomar hash corto del último commit
//const commitHash = execSync('git rev-parse --short HEAD').toString().trim();

//otra opcion para versiones sin git
const version = process.env.npm_package_version || '0.0.0';
const commit = process.env.VERCEL_GIT_COMMIT_SHA || 'dev-' + version;

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
    __APP_COMMIT__: JSON.stringify(commit), // Define la variable global del Commit
    __APP_VERSION__: JSON.stringify(version) // Define la variable global de la versión del package.json
  }

})