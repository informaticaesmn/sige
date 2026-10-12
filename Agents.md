# Agents.md - Guía de Estilo y Convenciones para SIGE

Este documento define las reglas, patrones y convenciones a seguir en el desarrollo de la aplicación SIGE. El objetivo es mantener un código consistente, legible y mantenible.

## 1. Filosofía General

- **Claridad sobre Astucia**: Escribe código que sea fácil de entender.
- **Consistencia**: Sigue los patrones y estilos ya establecidos en el proyecto.
- **Eficiencia**: Utiliza las herramientas y APIs de forma correcta para optimizar el rendimiento y los costos (especialmente en Firebase).
- **Claridad para retomar el código**: que todas las funciones esten debidamente comentadas.

## 2. Estructura de Archivos y Nomenclatura

- **Componentes**: `PascalCase.vue` (ej. `FormInput.vue`, `UserAvatar.vue`).
  - **Vistas (Componentes de Ruta)**: `PascalCase.vue` ubicados en `src/views/`. Deben tener un sufijo que indique su contexto si es necesario (ej. `TableroE.vue` para Estudiante).
- **Composables**: `camelCase.js` con el prefijo `use` (ej. `useAuth.js`, `useUsuarios.js`).
- **Layouts**: `PascalCaseLayout.vue` (ej. `EstudianteLayout.vue`).
- **Rutas**: El archivo principal es `src/router/index.js`. Las rutas nombradas deben usar `PascalCase` (ej. `EstudianteTablero`).

## 3. Vue.js y Composition API

- **`<script setup>`**: Utilízalo siempre para los componentes. Es más conciso y eficiente.
- **Reutilización de Lógica**: Encapsula la lógica de negocio, llamadas a API y manejo de estado complejo en `composables`. Los componentes deben ser lo más "tontos" posible, consumiendo la lógica de los composables.
- **Reactividad**: Usa `ref` para tipos primitivos y `reactive` para objetos. Sé consistente.
- **Props y Emits**: Define `defineProps` y `defineEmits` con tipos para mayor seguridad y claridad.

## 4. Firebase (Firestore y Auth)

### 4.1. Firestore

- **Acceso a Datos**: Centraliza todas las interacciones con Firestore en `composables` específicos (ej. `useUsuarios.js`). Los componentes no deben importar `firebase/firestore` directamente.
- **Lecturas**:
  - Prefiere lecturas directas por ID (`getDoc`) siempre que sea posible. Son las más rápidas y económicas.
  - Usa queries (`query`, `where`, `getDocs`) cuando necesites buscar o filtrar, pero sé consciente de su costo. Indexa los campos por los que filtras.
- **Escrituras**:
  - Para operaciones atómicas que involucran múltiples documentos (crear/eliminar, transferir datos), utiliza siempre `writeBatch`. Esto garantiza la integridad de los datos.
  - Usa `setDoc` para crear o sobrescribir un documento completo y `updateDoc` para modificar campos existentes sin tocar el resto.
- **IDs de Documento**: La estrategia de usar el `email` como ID temporal para perfiles pre-aprobados y luego migrar a un documento con el `uid` del usuario como ID es el patrón a seguir para el registro.

### 4.2. Autenticación

- **Lógica de Auth**: Toda la lógica (login, logout, registro, reset) debe estar centralizada en `useAuth.js`.
- **Estado del Usuario**: El estado de autenticación se maneja con `onAuthStateChanged`. El objeto `user` reactivo en `useAuth` es la única fuente de verdad sobre el usuario logueado y debe ser enriquecido con datos de Firestore (roles, nombre, etc.).

## 5. Manejo de Errores

- **Composables**: Las funciones en los composables que pueden fallar (ej. llamadas a Firebase) deben usar `try/catch` y devolver un objeto con una estructura predecible, como `{ exito: boolean, datos: any, error: any }`.
- **Componentes**: Los componentes deben usar este objeto de respuesta para mostrar mensajes de error claros al usuario en la UI, en lugar de `alert()` o `console.log()` genéricos.

## 6. Versionado y Commits (Git)

- **Branches**:
  - `main`: Refleja la versión en producción. Solo se fusiona desde `dev`.
  - `dev`: Rama principal de desarrollo. Todos los nuevos features y fixes se integran aquí.
- **Mensajes de Commit**: Sigue la convención de Commits Convencionales.
  - `feat:`: Nueva funcionalidad.
  - `fix:`: Corrección de un bug.
  - `chore:`: Tareas de mantenimiento, build, configuración, etc. (ej. `chore(release): version 1.2.3`).
  - `refactor:`: Cambios en el código que no alteran la funcionalidad.
  - `docs:`: Cambios en la documentación.
- **Versionado**:
  - Usa `npm version <patch|minor|major>` para incrementar la versión.
  - El script `update-dev` manejo el incremental de versiones de la rama dev y `update-main` maneja el merge de main con la rama dev y actualización de la versión en main, al subir activa la GitHub Action `firebase-hosting-main.yml` que se encarga del deploy a Firebase.

## 7. Estructura de Composables

Los composables siguen el patrón `useXxx.js` y están organizados en subdirectorios temáticos bajo `src/composables/`:

- **`auth/useAuth.js`**: Autenticación (login, logout, registro, reset). Es el **único** composable que debe manejar la lógica de Firebase Auth. Expone un estado reactivo global `user` (singleton a nivel de módulo).
- **`usuarios/useUsuarios.js`**: Operaciones CRUD sobre la colección `usuarios` en Firestore. Maneja la migración de documentos `email → uid` y la normalización de roles.
- **`inscripciones/useOfertaAcademica.js`**: Lectura de la oferta académica (colección `ofertaAcademica`).
- **`inscripciones/useInscripciones.js`**: Creación y lectura de inscripciones (subcolección de `usuarios`).
- **`academico/usePlanesEstudio.js`**: Carga y procesamiento de planes de estudio desde archivos JSON estáticos en `/public/planes/`.

### 7.1. Estado Singleton en Composables

Los composables que manejan estado global (`useAuth`, `useLayout`) definen sus `ref()` y `computed()` a nivel de módulo, no dentro de la función factory. Esto garantiza que todas las instancias compartidas del composable usen el **mismo estado reactivo**. Al llamar `checkAuthState()` al nivel del módulo, el estado de auth se inicializa una sola vez.

### 7.2. Firestore Lite vs Firestore

El archivo `src/config/firebase.js` inicializa Firestore con `getFirestore` desde `'firebase/firestore/lite'`. **Todos** los composables deben importar funciones desde `'firebase/firestore/lite'` para mantener consistencia y evitar incluir código de listeners en tiempo real innecesarios.

## 8. Sistema de Theming y Layouts

### 8.1. Layouts dinámicos

La aplicación usa 5 layouts diferentes, uno por rol:
- `AccesoLayout.vue` — Login, registro, reset, términos
- `EstudianteLayout.vue`, `AdminLayout.vue`, `BedelLayout.vue`, `DocenteLayout.vue` — Cada uno envuelve `BarraApp` + `<router-view>` + `FooterApp`

### 8.2. Temas por rol

El theming se maneja con clases CSS en `style.css`:
- `.theme-estudiante` (teal), `.theme-docente` (blue), `.theme-bedel` (purple), `.theme-admin` (rose)
- El composable `useLayout.js` mantiene `currentTheme` y `currentLayout` como refs a nivel de módulo y aplica quita/añade clases en `document.body` mediante `watchEffect`.
- El **router guard** (`src/router/index.js`, línea 118) llama `setLayout(requiredRole)` para cambiar el layout según la ruta navegada.

### 8.3. Roles múltiples

Un usuario puede tener múltiples roles (ej. "estudiante" + "bedel"). El flujo es:
1. Tras login, si `userRoles.length > 1`, se redirige a `SeleccionarRol.vue`
2. `SeleccionarRol.vue` guarda el rol activo en `localStorage.setItem('rolActivo', rol)`
3. `BarraApp.vue` lee `localStorage.rolActivo` y filtra el menú según ese rol (con fallback al primer rol)
4. La guardia de navegación usa `meta.role` para validar el acceso a rutas específicas

## 9. Firebase Functions (Cloud Functions v2)

- Las funciones se definen en `codebase-functions/index.js` (Codebase: `codebase-functions`)
- Región: `southamerica-east1`
- Función principal: `registrarUsuario` (HTTPS Callable) — verifica pre-aprobación, crea usuario en Auth, migra documento Firestore `email → uid` usando `writeBatch`, devuelve el perfil completo
- El cliente llama funciones con `httpsCallable(functions, 'nombreFuncion')` desde `@/config/firebase.js`

## 10. Testing

- **Framework propuesto**: Vitest + Vue Test Utils (instalable como devDependency, compatible con Vite)
- **Estrategia**: Testear los composables (con mock de Firebase), la guardia de navegación (con mock de router y auth state), y los componentes UI críticos (formularios, cards)
- **CI**: GitHub Actions que ejecuta tests en cada push a `dev`/`main`. Actualmente no existe infraestructura de testing — es un item pendiente crítico.

## 11. Reglas de Firestore

- Las reglas en `firestore.rules` usan funciones helper (`esAdmin()`, `esBedel()`) que realizan una lectura extra a Firestore por solicitud
- **Importante**: Las colecciones que usan nombres dinámicos (ej. `inscripciones${ciclo}`) deben usar wildcards `{coleccionId}` en las reglas, no names estáticos
- **Importante**: Evita usar `alert()` o `console.log()` genéricos en componentes — usa el patrón `{ exito, error }` de los composables y muestra feedback en la UI


---
*Este documento es una guía viva. Si se introduce un nuevo patrón o se mejora uno existente, debe ser actualizado.*

```

Sigue así, el proyecto tiene una base muy profesional. ¡Excelente trabajo!

<!--
[PROMPT_SUGGESTION]¿Cómo puedo mejorar la guardia de navegación en `src/router/index.js` para que maneje la carga inicial del estado de autenticación y también verifique los roles de usuario para proteger las rutas?[/PROMPT_SUGGESTION]
[PROMPT_SUGGESTION]Basado en el `useLayout.js`, ¿podrías mostrarme cómo integrar el cambio de layout y tema con el router de Vue para que cambie automáticamente según la ruta a la que se navega?[/PROMPT_SUGGESTION]
