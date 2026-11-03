// src/main.js
import './style.css' // ¡Importar el CSS PRIMERO es la clave!
import { createApp } from 'vue'
import App from './App.vue' // Asegúrate de que App.vue no tenga lógica de layout compleja
import router from './router' // El router ahora contiene toda la lógica de guardias
import { asegurarCatalogo } from './composables/academico/useCatalogoPlanes.js'

// Calentamiento del catálogo de planes: no bloquea el montaje. Si falla, el
// gate de altas reporta el error por su cuenta y `planesDisponibles()` queda vacío.
asegurarCatalogo()

const app = createApp(App)

app.use(router)
app.mount('#app')
