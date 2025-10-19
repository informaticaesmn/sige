// src/main.js
import './style.css' // ¡Importar el CSS PRIMERO es la clave!
import { createApp } from 'vue'
import App from './App.vue' // Asegúrate de que App.vue no tenga lógica de layout compleja
import router from './router' // El router ahora contiene toda la lógica de guardias

const app = createApp(App)

app.use(router)
app.mount('#app')
