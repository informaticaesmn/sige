// vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url' // Importamos los helpers de URL de Node

// tomar hash corto del último commit
//const commitHash = execSync('git rev-parse --short HEAD').toString().trim();

//otra opcion para versiones sin git
const version = process.env.npm_package_version || '0.0.0';
const commit = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'local' + version;
const branch = process.env.VERCEL_GIT_COMMIT_REF || 'local'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  css: {
    postcss: './postcss.config.js',
  },
  base: '/',  // ← para el dominio raiz de vercel - antes nombre del repositorio '/rac/'
  build: {
    outDir: 'dist' // Directorio de salida para los archivos construidos
    },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)) // La forma correcta en ES Modules
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(version), // Define la variable global de la versión del package.json
    __APP_BRANCH__: JSON.stringify(branch), // Define la variable global de la Branch
    __APP_COMMIT__: JSON.stringify(commit) // Define la variable global del Commit
  }

})