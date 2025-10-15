// src/router/routerInstance.js

// Este archivo actúa como un intermediario para evitar dependencias circulares.
// Exporta un objeto contenedor cuya propiedad 'router' será poblada por `src/router/index.js`.
export const routerInstance = {
  router: null,
};
