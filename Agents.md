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
  - El script `update-version.ps1` y el workflow de GitHub (`update-readme-v2.yml`) son las herramientas preferidas para automatizar el proceso de versionado y actualización del `README.md`.

---
*Este documento es una guía viva. Si se introduce un nuevo patrón o se mejora uno existente, debe ser actualizado.*

```

Sigue así, el proyecto tiene una base muy profesional. ¡Excelente trabajo!

<!--
[PROMPT_SUGGESTION]¿Cómo puedo mejorar la guardia de navegación en `src/router/index.js` para que maneje la carga inicial del estado de autenticación y también verifique los roles de usuario para proteger las rutas?[/PROMPT_SUGGESTION]
[PROMPT_SUGGESTION]Basado en el `useLayout.js`, ¿podrías mostrarme cómo integrar el cambio de layout y tema con el router de Vue para que cambie automáticamente según la ruta a la que se navega?[/PROMPT_SUGGESTION]
