# Notas propias

> Notas de diseño, ideas y roadmap. Para el estado técnico y los problemas abiertos, ver [contexto.md](contexto.md).

## Cosas e ideas a implementar

- trabajar con dos branch:
    - ___main___ vinculado al hosting de Firebase ***Listo***
    - ___dev___ vinculado a un proyecto Vercel    ***Listo***
    - tendria que crear un tercer branch para la publicacion de paginas estaticas, via Github Pages?
- armar una vista para los nuevos inscriptos. Pregrado * (formulario de carga de preinscripcion) `descartado para 2026`

## cosas a tener en cuenta
- cambiar `todos los usuarios a DNI` ver de implementarlo Diciembre 2025 o Febrero 2026
- seguir trabajando en las `inscripciones a instrumento`.

## ideotas
 Tengo problemas para definir la estructura de la base de datos. con respecto a los planes de estudio y materias por varias razones:
 La escuela tiene muchos planes, casi todos basados en uno que es troncal que el 662 - Profesorado de Musica:
 Lista de Planes:
  - 662 -  Profesorado de Música
  - 662/letra (las letras vas desde la A hasta la Q) cada letra es un plan con orientacion en algun Instrumento (por ejemplo 662/J es el profesorado de Música con orientacion Piano)
  - 663 - Profesorado de Música con orientación en Direccion Coral
  - 664 - Profesorado de Música con orientación en Canto Lirico
  - 665 - Profesorado de Música con orientación en Direccion Orquestal
  - 666 - Profesorado de Música con orientación en Composición
  Despues vienen las carreras no docentes:
  - 389 - Cantante
  - 390 - Compositor
  - 391 - Director Coral
  - 392 - Director Orquestal
  - 393 - Instrumentista
  - 708 - Tecnico Superior en Sonido (esta es la unica que no comparte el tronco central de las materias del 662)

Esto hace que tenga que tener en cuenta previamente una lista de equivalencias entre materias para poder simplificar las inscripciones y que permita a estudiantes de diferentes planes acceder a las secuencias de los espacios comunes. (no se si soy claro).
- Creo que conviene desnormalizar el listado de matarias o inscripciones porque hay un consumo muy distinto desde la vista estudiante y la vista bedel.
- cargar el plan completo en en materias aprobadas (subcoleccion de usuarios [uid]) y usar para visibilizar las aprobadas y poder tener marcadas las habilitadas a cursar (o rendir) en base a las ya aprobadas. (esto lo tengo que charlar con la IA).
- que la subcoleccion materias aprobadas tengo codigo, nombre, fecha_cursado, fecha_aprobado, disponible(boolean) cargado en con alguna Function de Firebase. 
- La otra opcion es crear otra subcollecion de de materias disponibles a cursar o a rendir. (para inscripciones a cursados y a mesas).

- ir pensando que la vista Docente sea para ver sus secuencias y llevar la asistencia ( y la carga de notas?)

**Decisión Final sobre Estructura de Oferta (Oct 2025)**: Se optó por un modelo híbrido. Los planes de estudio viven en archivos JSON estáticos. La oferta académica de cada año se carga a una colección `ofertaAcademica_YYYY`, que contiene documentos por `materia` con una subcolección de `secuencias`. Se usa una colección `periodosInscripcion` para gestionar las fechas de apertura y cierre, vinculada a cada secuencia mediante un `periodoId`. Esto evita duplicar datos y facilita la gestión.

> ⚠️ **Superado (Oct 2026):** la oferta ya no se modela como documento por materia en `ofertaAcademica_YYYY`. El modelo vigente es un **documento único por ciclo** en `ofertaAcademica/{ciclo}` (`etapas → materias → comisiones`), cargado desde la app por el rol `coordinacion` (`useCargaOferta.js`). Ver [contexto.md](contexto.md) e [importar-oferta.md](importar-oferta.md).



## Revisión de código — pendientes (Oct 2026)

> El detalle de cada problema (con impacto, archivos y líneas) está en [contexto.md](contexto.md#-problemas-identificados-pendientes).
> Acá queda solo lo que bloquea el flujo principal.

### 🔴 Bloqueantes de producción

- ✅ **`firestore.rules`** (arreglado y **deployado** el 19/10/2026): la regla de inscripciones estaba hardcodeada (`inscripciones2026`) y no matcheaba el nombre dinámico que arma el código (`inscripciones20261`) → inscripciones denegadas por permisos. Además, los dos `allow update` se combinaban con OR, así que un estudiante podía cambiarse el `estado` a `confirmada` solo. Ya no se deploya a mano: el workflow de `main` publica las reglas en cada release (ver el punto siguiente).
- Deploy de `main`: **resuelto el 19/10/2026**. El workflow corría entero pero fallaba al publicar porque el secreto `FIREBASE_SERVICE_ACCOUNT_KEY` guardaba una clave del proyecto **viejo** (`firebase-adminsdk-9p782@prueba1-esmn`), que solo tenía permisos ahí (de ahí que los releases publicaran en `prueba1-esmn`). Errores exactos al publicar en `sige-esmn`: hosting → `Failed to get Firebase project ...`; reglas → `Request to https://firebaserules.googleapis.com/...:test had HTTP Error: 403, The caller does not have permission`. Se reemplazó el secreto por una clave nueva de `firebase-adminsdk-fbsvc@sige-esmn` + los roles `Firebase Hosting Admin` y `Firebase Rules Admin`. Run verde: [39207423186](https://github.com/informaticaesmn/sige/actions/runs/39207423186) (hosting + reglas).
- **`useOfertaAcademica.js`** (corregido el 18/10/2026): el `u//` de la primera línea era un `ReferenceError` al importar el módulo, por lo que `InscripcionesE.vue` se rompía al navegar; además importaba del SDK completo de Firestore en lugar de `/lite`. El chunk de esa vista pasó de 488 kB a 5,6 kB.

### 🟡 Para revisar

- `useLayout.js` resetea el layout en cada llamada (parpadeo de tema).
- `useAuth.js` no hace `unsubscribe` de `onAuthStateChanged`.
- `alert()` en `BarraApp.vue`, `ResetPassword.vue` y `SeleccionarRol.vue` (viola AGENTS §5).
- Convención de error sin definir: `useInscripciones` lanza en "usuario no autenticado" en lugar de devolver `{ exito:false, error }` (viola AGENTS §5).
- `.env` local escribe `VITE_FIREBASE_STORAGE_BUCKET="sige-esmn.firebasestore.app"` (le falta la `a`): el valor correcto es `sige-esmn.firebasestorage.app`, que es el que tiene el secreto del CI. Como la app no usa Firebase Storage, hoy no rompe nada, pero es una bomba de tiempo.
- ✅ (19/10/2026) Los CSV con datos personales se sacaron del repo (ahora en `data/`, ignorado por git) y el workflow de deploy a Firebase Hosting ya apunta a `sige-esmn` (antes `prueba1-esmn`).


---

## OldAgents

> Contenido archivado desde `Agents.md` durante la reestructuración de documentación (Oct 2026).
> Estas secciones fueron removidas de Agents.md porque no son reglas universales aplicables a cada tarea.

### Firestore Lite vs Firestore (ex §7.2)

El archivo `src/config/firebase.js` inicializa Firestore con `getFirestore` desde `'firebase/firestore/lite'`. **Todos** los composables deben importar funciones desde `'firebase/firestore/lite'` para mantener consistencia y evitar incluir código de listeners en tiempo real innecesarios.

> Nota: Esta regla fue comprimida en una línea dentro de Agents.md §4 (Firebase).

### Testing (ex §10)

- **Framework propuesto**: Vitest + Vue Test Utils (instalable como devDependency, compatible con Vite)
- **Estrategia**: Testear los composables (con mock de Firebase), la guardia de navegación (con mock de router y auth state), y los componentes UI críticos (formularios, cards)
- **CI**: GitHub Actions que ejecuta tests en cada push a `dev`/`main`. Actualmente no existe infraestructura de testing — es un item pendiente crítico.

### Regla duplicada removida (ex §11 L123)

La línea "Evita usar `alert()` o `console.log()` genéricos en componentes — usa el patrón `{ exito, error }` de los composables y muestra feedback en la UI" era un duplicado exacto de §5 (Manejo de Errores). Se eliminó la copia.

---

## OldContext

> Contenido archivado desde `context.md` durante la reestructuración de documentación (Oct 2026).
> Estas secciones fueron removidas porque no aportan reglas accionables para el agente de código.

### Objetivo Principal

Generar una aplicación web de bajo costo y alta eficiencia que centralice y simplifique la Gestión Académica para la comunidad de la Escuela Superior de Música de Neuquén. La plataforma debe servir como una fuente única de verdad para los datos de estudiantes, oferta académica y trayectorias, accesible para los distintos roles dentro de la institución.

### Stakeholders

*   **Desarrollador Principal**: Genaro Villar (`InformaticaESMN`).
*   **Equipo de Pruebas (Testers)**:
    *   **Coordinadores Académicos**: Ramón Sarallegui, Facundo Gomez Saibene, Victoria Maclean.
    *   **Bedeles**: Adriana Falcón, Diego Price, Ana San Martin.
    *   **Estudiantes**: Majo Ortega (y otros a sumar).
*   **Usuarios Finales**:
    *   **Estudiantes**: (~800 activos) para consulta de datos, inscripciones, etc.
    *   **Bedeles**: Para la gestión diaria de la información estudiantil.
    *   **Administrativos/Secretaría**: Para gestión de equivalencias y títulos.
    *   **Coordinadores/Administradores**: Para la configuración de la oferta académica.
    *   **Docentes (a futuro)**: Para funciones como toma de asistencia o carga de notas.

### Decisiones Técnicas Tomadas

#### Stack elegido:

*   **Frontend**: Vue 3 (con Composition API y `<script setup>`), Vite, TailwindCSS.
*   **Backend & Base de Datos (BaaS)**: Firebase (Authentication y Firestore).
*   **Hosting**: Vercel para la rama `dev` (staging) y Firebase Hosting para `main` (producción).
*   **Control de Versiones**: Git, alojado en GitHub. manejado por dos script:
      - .update.dev.ps1 para la rama `dev`
      - .update.main.ps1 para la rama `main`
*   **Fuente de Datos Inicial**: Google Sheets, con exportación a JSON mediante Apps Script. o CSV con script de Node.js

#### Arquitectura:

La aplicación sigue una arquitectura moderna basada en componentes y servicios desacoplados (BaaS - Backend as a Service).

1.  **Arquitectura Frontend (Vue 3)**:
    *   **Basada en Componentes**: La UI se construye con componentes reutilizables (`.vue`). Las vistas principales se encuentran en `src/views` y los componentes de UI reusables en `src/components`.
    *   **Lógica Desacoplada (Composables)**: Toda la lógica de negocio y la interacción con el backend se aísla en funciones "composables" (`src/composables`). Por ejemplo, `useAuth.js` maneja la autenticación y `useUsuarios.js` gestiona los datos de usuarios en Firestore.
    *   **Enrutamiento y Layouts**: Se utiliza `vue-router` para la navegación. La arquitectura de rutas define layouts dinámicos (`AdminLayout`, `EstudianteLayout`, etc.) que envuelven a las vistas hijas, permitiendo interfaces distintas con themes especificos (colores distintos) según el rol del usuario.
    *   **Gestión de Estado**: Se utiliza un enfoque de estado reactivo y descentralizado a través de los `composables`. Por ejemplo, `useAuth` expone un estado reactivo global para el usuario autenticado, evitando la necesidad de una librería de estado más compleja como Pinia por el momento.

2.  **Arquitectura Backend (Firebase)**:
    *   **Serverless**: No hay un servidor propio. La aplicación se comunica directamente desde el cliente a los servicios de Firebase.
    *   **Autenticación**: Firebase Authentication gestiona la identidad de los usuarios (login, registro, reseteo de contraseña).
    *   **Base de Datos (Firestore)**:
        *   **Modelo de Datos**: Es una base de datos NoSQL orientada a documentos. La colección principal es `usuarios`.
        *   **Identificadores**: Se sigue una estrategia de doble identificador:
            1.  **Pre-registro**: Los perfiles de los estudiantes se precargan en documentos cuyo ID es el `email` del estudiante.
            2.  **Registro Completo**: Cuando un usuario se registra, se crea un nuevo documento cuyo ID es el `uid` de Firebase Auth, se copian los datos del documento de pre-registro y este último se elimina. Esto se hace de forma atómica usando un `writeBatch` para garantizar la integridad.
        *   **Acceso a Datos**: Todas las lecturas y escrituras a Firestore están centralizadas en los `composables`, nunca directamente desde los componentes.
        mas detalle de la estructura de datos en [modelo-datos.md](modelo-datos.md)

### Visión General del Proyecto

#### Misión

Generar una aplicación web de bajo costo y alta eficiencia que centralice y simplifique la Gestión Académica para la comunidad de la Escuela Superior de Música de Neuquén (ESMN). La plataforma sirve como fuente única de verdad para datos de estudiantes, oferta académica y trayectorias, accesible según el rol de cada usuario.

#### Arquitectura de Alto Nivel

```
┌─────────────────────────────────────────────────────┐
│  Browser / SPA (Vue 3 + Vite + TailwindCSS)          │
└──────┬─────────────────────────────────────┬───────┘
       │                                     │
       ▼                                     ▼
┌──────────────┐                   ┌─────────────────┐
│  Firebase Auth │                   │  Firestore Lite  │
│  (login,       │◄─── HTTPS ───────►│  (usuarios,     │
│   registro,    │     Callable      │   ofertaAcad.,  │
│   reset)       │                   │   inscripciones)│
└──────────────┘                   └─────────────────┘
       ▲                                     ▲
       │  HTTPS Callable                        │ Firestore Lite SDK
       ▼                                     ▼
┌─────────────────┐              ┌────────────────────┐
│  Cloud Function │              │  Static Assets     │
│  (registrarUsuario)│              │  (/public/planes/)│
│                  │              │  (JSON)            │
└─────────────────┘              └────────────────────┘
```

#### Stack Tecnológico Detallado

| Capa | Tecnología | Versión | Comentario |
|------|-----------|---------|------------|
| Framework | Vue | ^3.4.27 | Composition API, `<script setup>` |
| Bundler | Vite | ^5.3.1 (5.4.21 instalado) | Build y dev server |
| CSS | TailwindCSS | ^3.4.3 | Theming con variables CSS |
| Routing | vue-router | ^4.4.0 | Guardia global `beforeEach` |
| Iconos | Heroicons | ^2.2.0 | Vue 24/outline y 16/solid |
| Utilidades | @vueuse/components | ^13.9.0 | `v-on-click-outside` |
| Auth | Firebase Auth | ^12.2.1 | Login, registro, reset |
| DB | Firestore (Lite) | via firebase ^12.2.1 | Lectura eficiente sin listeners |
| Functions | Firebase Functions v2 | ^6.6.0 | `registrarUsuario` callable |
| Hosting (prod) | Firebase Hosting | — | Rama `main` |
| Hosting (staging) | Vercel | — | Rama `dev` |
| Node.js | — | v24.20.0 | Runtime local y builds |

#### Estructura de Directorios

```
sige/
├── public/                     # Assets estáticos + datos JSON
│   ├── planes/                 # Planes de estudio (662.json, 662G.json, 708.json, planes.json)
│   ├── index.html              # (placeholder Firebase — no es el entry de la app)
│   ├── _redirects              # SPA fallback
│   └── avatar.png
├── src/
│   ├── App.vue                 # Entry: <AppLoading/> + <router-view/> + <FooterApp/>
│   ├── main.js                 # createApp + router, style.css importado primero
│   ├── style.css               # Tailwind + themes + componentes genéricos
│   ├── components/
│   │   ├── BarraApp.vue        # Nav dinámica por rol + dropdown usuario + términos modal
│   │   ├── FooterApp.vue       # Footer con versión, layout actual
│   │   ├── AppLoading.vue      # Spinner overlay durante init de auth
│   │   ├── TerminosContenido.vue    # ⚠️ Duplicado de legal/TerminosContenido.vue
│   │   ├── legal/TerminosContenido.vue  # ⚠️ Importado por BarraApp
│   │   ├── ui/                 # FormInput.vue, FormCheckbox.vue
│   │   └── estudiante/         # PerfilCard, InscripcionesVigentesCard, MateriasAprobadasCard,
│   │                           #   PlanesEstudioCard, TablaPlanEstudio, DetalleMateria,
│   │                           #   BuscadorMaterias, CorrelativasList
│   ├── composables/
│   │   ├── useLayout.js        # Theme + layout singleton (body class switching)
│   │   ├── auth/useAuth.js     # Auth singleton: login, logout, register, reset, checkAuthState
│   │   ├── usuarios/useUsuarios.js  # CRUD usuarios + migración email→uid + normalización roles
│   │   ├── usuarios/useImportarUsuarios.js  # Carga masiva de usuarios desde CSV (rol coordinacion)
│   │   ├── inscripciones/
│   │   │   ├── useOfertaAcademica.js  # Carga ofertaAcademica/{ciclo}
│   │   │   ├── useCargaOferta.js      # Carga masiva de oferta desde CSV (rol coordinacion)
│   │   │   └── useInscripciones.js    # Crea/lee inscripciones subcolección
│   │   └── academico/usePlanesEstudio.js  # Carga JSON local + procesa correlativas
│   ├── config/firebase.js      # Inicializa Auth, Firestore Lite, Functions, Analytics
│   ├── router/
│   │   ├── index.js            # Rutas + guardia beforeEach + routerInstance assignment
│   │   └── routerInstance.js   # Singleton para evitar circular deps
│   ├── layouts/                # AccesoLayout, EstudianteLayout, AdminLayout, BedelLayout, DocenteLayout, CoordinacionLayout
│   └── views/
│       ├── auth/               # Login, Register, ResetPassword, SeleccionarRol, Terminos, PlanesEstudioPublico
│       ├── estudiante/         # TableroE, InscripcionesE, HAcademico, OtrasFunciones, PlanesEstudioView
│       ├── admin/              # TableroA
│       ├── bedel/              # TableroB, ConfirmarInscripciones
│       ├── docente/            # TableroD
│       └── coordinacion/       # TableroC, CargaMasiva
├── codebase-functions/         # Cloud Functions v2 (registrarUsuario)
├── firebase.json, firestore.rules, firestore.indexes.json
├── vite.config.js, tailwind.config.js, postcss.config.js
├── update-dev.ps1, update-main.ps1  # Scripts de versionado + deploy
└── package.json (v0.7.26)
```

### Guía de Testing Manual

#### Cómo probar la app:
1.  **Acceder al Entorno de Pruebas**: Navegar a la URL de Vercel (rama `dev`): https://sige-esmn.vercel.app/
2.  **Casos de Prueba Sugeridos**:
    *   **Registro Exitoso**: Intentar registrarse con un email que SÍ esté en la lista de pre-aprobados. El sistema debería permitir el registro y redirigir al tablero correspondiente.
    *   **Registro Fallido (No Aprobado)**: Intentar registrarse con un email que NO esté en la lista. Se debe mostrar un mensaje de error claro indicando que debe contactar a Bedelía.
    *   **Login/Logout**: Iniciar sesión con una cuenta ya creada y luego cerrar sesión.
    *   **Protección de Rutas**: Intentar acceder a una ruta protegida (ej. `/estudiante`) sin haber iniciado sesión. El sistema debe redirigir a la página de login.
3.  **Reporte de Bugs**:
    *   Capturar la pantalla si es un error visual.
    *   Abrir la consola del navegador (F12), ir a la pestaña "Consola" y copiar cualquier mensaje de error en rojo.
    *   Enviar la información

### Resumen de Estado (snapshot Oct 2026)

| Categoría | Estado |
|-----------|--------|
| Compilación (`vite build`) | ✅ Funcional |
| Tests | ✅ Funcional |
| Lint | ❌ No configurado |
| CI/CD | ⚠️ Deploys automáticos (`main` → Firebase Hosting + reglas); el workflow corre tests, pero el deploy aún no depende de ellos |
| Seguridad Firestore | ✅ Wildcard dinámico + reglas de roles desplegadas (19/10/2026) |
| Componentes UI críticos | ✅ Completados |
| Auth flow | ✅ Funcional (login, registro, reset, selección de rol) |
| Theming/Layout | ✅ Integrado con router guard |

---

## PlanDeTrabajo

> Contenido archivado desde `context.md` durante la reestructuración de documentación (Oct 2026).

### Estado Actual

#### ✅ COMPLETADO:
*   Definición del stack tecnológico y la arquitectura base.
*   Estructura de layouts y theming con TailwindCSS para diferentes roles.
*   Mecanismo de importación de datos iniciales desde Google Sheets a Firestore.
*   Lógica de autenticación (Login/Logout) y estado de usuario reactivo.
*   Flujo de registro de usuarios con pre-aprobación y migración de datos.
*   Implementación de la vista "Seleccionar Rol" para usuarios con múltiples perfiles.

#### 🚧 EN DESARROLLO:
*   Probar en un grupo mas amplio de la experiencia de usuario en los formularios de autenticación. Revisar la seguridad y todos los pasos que tienen que ver con el acceso y autenticación.
*   Construcción de los tableros principales para cada rol (Estudiante, Bedel, Admin).

#### 📋 PENDIENTE:
*   **Funcionalidad Core**:
    *   Terminar de definir estructura de datos para los planes contemplando las correlativas.
    *   Módulo de inscripción a cursadas para estudiantes y confirmacion por partes del chequeo de correlativas de Bedelia.
    *   Visualización de trayectoria académica (materias aprobadas, estado).
    *   Carga de la trayectoria académica con todas los posibles procesos que llevan a la nota final:
      - cursar y aprobar sin promocionar (nota menor a 7) -> presentarse a mesas con cararcter de "regular" por haber aprobado el cursado y desaprobar o aprobar.
      - cursar y promocionar (con eso ya tiene una nota final y materia aprobada)
      - presentarse a una mesa de examen en caracter de libre
      - obtener la materia aprobada por equivalencia: tener estudios previos en nuestra institucion, en otro plan o estudios previos en otras instituciones y presenta la documentacion.
*   **Administración**:
    *   Panel de administración para la gestión de usuarios y roles.
    *   Herramienta para configurar la oferta académica de cada ciclo lectivo.
*   **Mejoras y Refinamiento**:
    *   Implementación de un sistema de notificaciones en la UI.
    *   Optimización de consultas a Firestore y reglas de seguridad.

### Dudas/Preguntas Abiertas

*   **Escalabilidad de Firestore**: ¿Será necesario optimizar las consultas o cambiar el modelo de datos cuando se agreguen las inscripciones y las trayectorias académicas? ¿Cómo impactará en los costos?
*   **Gestión de Estado Compleja**: Si la aplicación crece, ¿será el enfoque actual con `composables` suficiente o se deberá migrar a una solución como Pinia para gestionar estados más complejos (ej. datos de inscripciones, oferta académica filtrada, etc.)?
*   **Seguridad**: ¿Las reglas de seguridad de Firestore actuales son suficientemente robustas? Necesitarán una revisión exhaustiva antes de pasar a producción.

### Fases del Plan

#### Fase 1: Corrección de errores críticos 🔴

1. ✅ **Unificar `InscripcionesE.vue`** — Reemplazar con un único `<template>` usando la lógica del segundo bloque (composables `useOfertaAcademica` + `useInscripciones`), eliminando código muerto.
2. ✅ **Eliminar `DashboardE.vue`** — hecho (Oct 2026): dead code no referenciado, eliminado.
3. ✅ **Normalizar imports Firestore** — Cambiar `'firebase/firestore'` → `'firebase/firestore/lite'` en `useOfertaAcademica.js` e `useInscripciones.js`.
4. ✅ **Corregir `firestore.rules`** — Reemplazar `inscripciones2026` con wildcard `{inscripcionesCollectionId}`. Resolver conflicto de `allow update`.

#### Fase 2: Mejoras de calidad de código 🟡

5. **Refactorizar `ResetPassword.vue`** — Usar `resetPassword` de `useAuth.js`. Reemplazar `alert()` con UI feedback.
6. **Consolidar `TerminosContenido.vue`** — Unificar las dos copias en `src/components/legal/`.
7. **Limpiar `Register.vue`** — Remover import no usado. Arreglar redirección hardcodeada.
8. **Limpiar `BarraApp.vue`** — Reemplazar `alert()` en "Solicitar Baja".
9. **Refactorizar `useLayout.js`** — Mover `setLayout('acceso')` de módulo a `App.vue`/`main.js`.

#### Fase 3: Testing 🧪

10. **Instalar Vitest + Vue Test Utils + happy-dom**.
11. **Escribir `vitest.config.js`** con alias `@` → `src/`.
12. **Tests para `useLayout`**: `setLayout('estudiante')` → verifica `currentLayout.value` y clase body.
13. **Tests para `useAuth`**: mock de Firebase Auth + Firestore, test de `loginFirebase`, `registrarUsuario`, `logoutFirebase`.
14. **Tests para guardia de navegación**: mock de router + auth state, verifica redirects por rol.
15. **Tests para componentes UI**: `FormInput`, `FormCheckbox`.
16. **CI con GitHub Actions**: workflow que corre `npx vitest run` en cada push.

#### Fase 4: Features pendientes 📋

17. Implementar `HAcademico.vue` (historial académico).
18. Completar tableros de Bedel/Docente/Admin.
19. Sistema de notificaciones UI.


