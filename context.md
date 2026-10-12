# CONTEXTO DEL PROYECTO

## 🎯 OBJETIVO PRINCIPAL
Generar una aplicación web de bajo costo y alta eficiencia que centralice y simplifique la Gestión Académica para la comunidad de la Escuela Superior de Música de Neuquén. La plataforma debe servir como una fuente única de verdad para los datos de estudiantes, oferta académica y trayectorias, accesible para los distintos roles dentro de la institución.

## 👥 STAKEHOLDERS (personas involucradas)
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

## 🛠️ DECISIONES TÉCNICAS TOMADAS
### Stack elegido:
 
*   **Frontend**: Vue 3 (con Composition API y `<script setup>`), Vite, TailwindCSS.
*   **Backend & Base de Datos (BaaS)**: Firebase (Authentication y Firestore).
*   **Hosting**: Vercel para la rama `dev` (staging) y Firebase Hosting para `main` (producción).
*   **Control de Versiones**: Git, alojado en GitHub. manejado por dos script:
      - .update.dev.ps1 para la rama `dev`
      - .update.main.ps1 para la rama `main`
*   **Fuente de Datos Inicial**: Google Sheets, con exportación a JSON mediante Apps Script. o CSV con script de Node.js

### Arquitectura:
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
        mas detalle de la estructura de datos en [diagrama_v2.md](diagrama_v2.md)


## 🚀 ESTADO ACTUAL
### ✅ COMPLETADO:
*   Definición del stack tecnológico y la arquitectura base.
*   Estructura de layouts y theming con TailwindCSS para diferentes roles.
*   Mecanismo de importación de datos iniciales desde Google Sheets a Firestore.
*   Lógica de autenticación (Login/Logout) y estado de usuario reactivo.
*   Flujo de registro de usuarios con pre-aprobación y migración de datos.
*   Implementación de la vista "Seleccionar Rol" para usuarios con múltiples perfiles.

### 🚧 EN DESARROLLO:
*   Probar en un grupo mas amplio de la experiencia de usuario en los formularios de autenticación. Revisar la seguridad y todos los pasos que tienen que ver con el acceso y autenticación.
*   Construcción de los tableros principales para cada rol (Estudiante, Bedel, Admin).

### 📋 PENDIENTE:
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

## 🧪 GUÍA DE TESTING
### Cómo probar la app:
1.  **Acceder al Entorno de Pruebas**: Navegar a la URL de Vercel (rama `dev`): https://sige-esmn-git-dev-informaticaesmns-projects.vercel.app
2.  **Casos de Prueba Sugeridos**:
    *   **Registro Exitoso**: Intentar registrarse con un email que SÍ esté en la lista de pre-aprobados. El sistema debería permitir el registro y redirigir al tablero correspondiente.
    *   **Registro Fallido (No Aprobado)**: Intentar registrarse con un email que NO esté en la lista. Se debe mostrar un mensaje de error claro indicando que debe contactar a Bedelía.
    *   **Login/Logout**: Iniciar sesión con una cuenta ya creada y luego cerrar sesión.
    *   **Protección de Rutas**: Intentar acceder a una ruta protegida (ej. `/estudiante`) sin haber iniciado sesión. El sistema debe redirigir a la página de login.
3.  **Reporte de Bugs**:
    *   Capturar la pantalla si es un error visual.
    *   Abrir la consola del navegador (F12), ir a la pestaña "Consola" y copiar cualquier mensaje de error en rojo.
    *   Enviar la información 
    
## ❓ DUDAS/PREGUNTAS ABIERTAS
*   **Escalabilidad de Firestore**: ¿Será necesario optimizar las consultas o cambiar el modelo de datos cuando se agreguen las inscripciones y las trayectorias académicas? ¿Cómo impactará en los costos?
*   **Gestión de Estado Compleja**: Si la aplicación crece, ¿será el enfoque actual con `composables` suficiente o se deberá migrar a una solución como Pinia para gestionar estados más complejos (ej. datos de inscripciones, oferta académica filtrada, etc.)?
*   **Seguridad**: ¿Las reglas de seguridad de Firestore actuales son suficientemente robustas? Necesitarán una revisión exhaustiva antes de pasar a producción.

---

## 📊 VISIÓN GENERAL DEL PROYECTO (Actualización)

### 🎯 Misión
Generar una aplicación web de bajo costo y alta eficiencia que centralice y simplifique la Gestión Académica para la comunidad de la Escuela Superior de Música de Neuquén (ESMN). La plataforma sirve como fuente única de verdad para datos de estudiantes, oferta académica y trayectorias, accesible según el rol de cada usuario.

### 🏗️ Arquitectura de Alto Nivel

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

### 🛠️ Stack Tecnológico Detallado

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

### 📁 Estructura de Directorios

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
│   │   ├── inscripciones/
│   │   │   ├── useOfertaAcademica.js  # Carga ofertaAcademica/{ciclo}
│   │   │   └── useInscripciones.js    # Crea/lee inscripciones subcolección
│   │   └── academico/usePlanesEstudio.js  # Carga JSON local + procesa correlativas
│   ├── config/firebase.js      # Inicializa Auth, Firestore Lite, Functions, Analytics
│   ├── router/
│   │   ├── index.js            # Rutas + guardia beforeEach + routerInstance assignment
│   │   └── routerInstance.js   # Singleton para evitar circular deps
│   ├── layouts/                # AccesoLayout, EstudianteLayout, AdminLayout, BedelLayout, DocenteLayout
│   └── views/
│       ├── auth/               # Login, Register, ResetPassword, SeleccionarRol, Terminos, PlanesEstudioPublico
│       ├── estudiante/         # TableroE, InscripcionesE, HAcademico, OtrasFunciones, PlanesEstudioView
│       ├── admin/              # TableroA
│       ├── bedel/              # TableroB, ConfirmarInscripciones
│       ├── docente/            # TableroD
│       └── DashboardE.vue      # ⚠️ DEAD CODE — imports rotos
├── codebase-functions/         # Cloud Functions v2 (registrarUsuario)
├── firebase.json, firestore.rules, firestore.indexes.json
├── vite.config.js, tailwind.config.js, postcss.config.js
├── update-dev.ps1, update-main.ps1  # Scripts de versionado + deploy
└── package.json (v0.7.16)
```

### 🔐 Modelo de Datos (Firestore)

**Colección principal: `usuarios`**
- **Pre-registro**: documento con ID = `email` (lowercase). Campos: `nombre`, `apellido`, `carrera`, `dni`, `legajo`, `estado`, `roles` (array), `plan`
- **Post-registro**: documento con ID = `uid` de Firebase Auth. Mismo contenido + `uid` + `actualizadoEn`. El documento `email` se elimina (writeBatch atómico).
- **Roles**: array de strings lowercase (`['estudiante']`, `['estudiante', 'bedel']`). Normalizados por `obtenerUsuario()`.

**Colección: `ofertaAcademica`**
- Documento por ciclo (ej: `2026-1`)
- Campos dinámicos según configuración de bedel

**Subcolección: `usuarios/{uid}/inscripciones{ciclo}`**
- Ej: `usuarios/{uid}/inscripciones20261/{materiaId}`
- Campos: `materiaId`, `comisionId`, `estado` ('pendiente'|'confirmada'), `fechaInscripcion`, `ciclo`

**Datos estáticos: `/public/planes/{planId}.json`**
- Planes de estudio con materias y correlativas (estructura `and`/`or`/`anio_completo`)

### 🔁 Flujo de Autenticación

1. App inicia → `useAuth.checkAuthState()` registra `onAuthStateChanged`
2. Router guard espera a `checkAuthState()` (promesa singleton)
3. Si usuario logueado → carga perfil desde Firestore → enriquece `user` con roles, nombre, etc.
4. Guardia valida `meta.requiresAuth` y `meta.role`
5. Si múltiples roles → redirige a `SeleccionarRol` → usuario elige → `localStorage.rolActivo`
6. Guardia llama `setLayout(role)` → cambia theme CSS y layout

### ☁️ Cloud Functions

- **`registrarUsuario` (Callable)**: Verifica pre-aprobación (doc con ID=email sin uid), crea usuario en Auth, migra doc a uid con writeBatch, devuelve perfil.
- Configuración: región `southamerica-east1`, maxInstances: 10, Node 22

---

## 🐛 PROBLEMAS IDENTIFICADOS

### 🔴 Críticos (bloquean compilación o funcionalidad)

| # | Archivo | Problema |
|---|---------|----------|
| 1 | `src/views/estudiante/InscripcionesE.vue` | **Dos bloques `<template>` completos** (líneas 1-44 y 46-110) separados por un comentario fuera de tags. **Rompe la compilación**. El segundo template usa los composables correctos; el primero es código muerto. |
| 2 | `src/views/DashboardE.vue` | **Dead code** con imports rotos: importa `useAuth` desde `@/composables/useAuth` (ruta inexistente). Usa `signOut` directamente de Firebase. No referenciado en el router. |
| 3 | `firestore.rules` (líneas 31-39) | Regla hardcodeada `inscripciones2026` pero el código usa `inscripciones20261`. **Las inscripciones fallarán por permisos denegados**. Además hay un `allow update` duplicado/conflicto. |
| 4 | `src/composables/inscripciones/useOfertaAcademica.js` | Importa desde `'firebase/firestore'` en lugar de `'firebase/firestore/lite'`. |
| 5 | `src/composables/inscripciones/useInscripciones.js` | Importa desde `'firebase/firestore'` en lugar de `'firebase/firestore/lite'`. |

### 🟡 Moderados (deuda técnica / malas prácticas)

| # | Archivo | Problema |
|---|---------|----------|
| 6 | `src/views/auth/ResetPassword.vue` | Importa `getAuth`/`sendPasswordResetEmail` directamente. Debería usar `resetPassword` de `useAuth.js`. Usa `alert()`. |
| 7 | `src/components/TerminosContenido.vue` vs `legal/` | **Dos copias duplicadas** con contenido similar. Confusión de imports. |
| 8 | `src/views/auth/Register.vue` | Importa `FormCheckbox.vue` pero **no lo usa**. Redirección hardcodeada a `/estudiante` post-registro. |
| 9 | `src/components/BarraApp.vue` (línea 63) | `alert('Función no implementada')` — viola Agents.md §5. |
| 10 | `src/composables/inscripciones/useOfertaAcademica.js` (línea 1) | Typo: `u//` al inicio del comentario. |
| 11 | `src/composables/useLayout.js` (línea 42) | `setLayout('acceso')` al nivel del módulo causa flash de tema antes del router guard. |

### 🟢 Sugerencias de Mejora

| # | Área | Sugerencia |
|---|------|-----------|
| 12 | Testing | Instalar Vitest + Vue Test Utils — no existe infraestructura de testing. |
| 13 | CI/CD | Añadir GitHub Actions para lint + tests en PRs a `dev`. |
| 14 | Error boundaries | `App.vue` no tiene manejador global de errores de componentes. |
| 15 | Features | Tableros de Bedel/Docente/Admin son placeholders sin datos reales. |

---

## 📋 PLAN DE TRABAJO

### Fase 1: Corrección de errores críticos 🔴

1. **Unificar `InscripcionesE.vue`** — Reemplazar con un único `<template>` usando la lógica del segundo bloque (composables `useOfertaAcademica` + `useInscripciones`), eliminando código muerto.
2. **Eliminar `DashboardE.vue`** — Dead code no referenciado. Migrar login/logout a `useAuth.js` si se reutiliza.
3. **Normalizar imports Firestore** — Cambiar `'firebase/firestore'` → `'firebase/firestore/lite'` en `useOfertaAcademica.js` e `useInscripciones.js`.
4. **Corregir `firestore.rules`** — Reemplazar `inscripciones2026` con wildcard `{inscripcionesCollectionId}`. Resolver conflicto de `allow update`.

### Fase 2: Mejoras de calidad de código 🟡

5. **Refactorizar `ResetPassword.vue`** — Usar `resetPassword` de `useAuth.js`. Reemplazar `alert()` con UI feedback.
6. **Consolidar `TerminosContenido.vue`** — Unificar las dos copias en `src/components/legal/`.
7. **Limpiar `Register.vue`** — Remover import no usado. Arreglar redirección hardcodeada.
8. **Limpiar `BarraApp.vue`** — Reemplazar `alert()` en "Solicitar Baja".
9. **Refactorizar `useLayout.js`** — Mover `setLayout('acceso')` de módulo a `App.vue`/`main.js`.

### Fase 3: Testing 🧪

10. **Instalar Vitest + Vue Test Utils + happy-dom**.
11. **Escribir `vitest.config.js`** con alias `@` → `src/`.
12. **Tests para `useLayout`**: `setLayout('estudiante')` → verifica `currentLayout.value` y clase body.
13. **Tests para `useAuth`**: mock de Firebase Auth + Firestore, test de `loginFirebase`, `registrarUsuario`, `logoutFirebase`.
14. **Tests para guardia de navegación**: mock de router + auth state, verifica redirects por rol.
15. **Tests para componentes UI**: `FormInput`, `FormCheckbox`.
16. **CI con GitHub Actions**: workflow que corre `npx vitest run` en cada push.

### Fase 4: Features pendientes 📋

17. Implementar `HAcademico.vue` (historial académico).
18. Completar tableros de Bedel/Docente/Admin.
19. Sistema de notificaciones UI.

---

## 📊 Resumen de Estado

| Categoría | Estado |
|-----------|--------|
| Compilación (`vite build`) | ⚠️ Posiblemente rota por `InscripcionesE.vue` |
| Tests | ❌ No existe infraestructura |
| Lint | ❌ No configurado |
| CI/CD | ⚠️ Deploys automáticos, pero sin tests |
| Seguridad Firestore | ⚠️ Reglas hardcodeadas (colisión con nombres dinámicos) |
| Componentes UI críticos | ✅ Completados |
| Auth flow | ✅ Funcional (login, registro, reset, selección de rol) |
| Theming/Layout | ✅ Integrado con router guard |