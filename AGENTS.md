# AGENTS.md — Guía de estilo y convenciones para SIGE

Este documento define las reglas y convenciones que aplican a **toda** tarea de desarrollo en SIGE.
Para contexto técnico (modelo de datos, layouts, composables, cloud functions, problemas pendientes), ver `docs/contexto.md`.
Para notas de diseño, roadmap y plan de trabajo, ver `docs/notas.md`.

## 1. Filosofía

- Claridad y consistencia por encima de astucia. Comenta cada función: el código se retoma meses después.

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

### Firestore

- **Acceso a Datos**: Centraliza todas las interacciones con Firestore en `composables` específicos. Los componentes no deben importar `firebase/firestore` directamente.
- **Firestore Lite**: Importa siempre desde `'firebase/firestore/lite'`, nunca desde `'firebase/firestore'`.
- **Lecturas**: Prefiere `getDoc` por ID. Usa `query`/`getDocs` solo cuando necesites filtrar. Indexa los campos filtrados.
- **Escrituras**: Usa `writeBatch` para operaciones atómicas multi-documento. Usa `setDoc` para crear/sobrescribir y `updateDoc` para modificar campos.
- **IDs de Documento**: Estrategia `email` → `uid` para pre-aprobación y registro.
- **Firestore Rules**: Para colecciones con nombres dinámicos (ej. `inscripciones${ciclo}` → `inscripciones20261`) usá un wildcard de **segmento completo** + `matches()`: `match /usuarios/{userId}/{subcoleccion}/{materiaId}` con `subcoleccion.matches('^inscripciones[0-9]+$')`. Nunca hardcodees el nombre del ciclo.

### Autenticación

- Toda la lógica (login, logout, registro, reset) centralizada en `useAuth.js`.
- Estado de auth vía `onAuthStateChanged`. El objeto `user` reactivo es la única fuente de verdad, enriquecido con datos de Firestore.

## 5. Manejo de Errores

- **Composables**: Usa `try/catch` y devuelve `{ exito: boolean, datos: any, error: any }`.
- **Componentes**: Usa ese objeto para mostrar feedback en la UI. No uses `alert()` ni `console.log()` genéricos.

## 6. Versionado y Commits (Git)

- **Branches**: `main` (producción, solo merge desde `dev`), `dev` (desarrollo activo).
- **Mensajes de Commit**: Commits Convencionales: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`.
- **Versionado**: `update-dev.ps1` (solo en rama `dev`) y `update-main.ps1` hacen pull → `test:unit` + `build` (abortan si fallan) → `npm version` → push. Push a `main` activa GitHub Action para deploy a Firebase.

## 7. Patrón de Composables

- Patrón `useXxx.js` en subdirectorios temáticos bajo `src/composables/`.
- **Singleton**: Los composables con estado global (`useAuth`, `useLayout`) definen `ref()` y `computed()` a nivel de módulo, no dentro de la función factory.

## 8. Tests Unitarios (Vitest)

- Antes de tocar `tests/` o correr la suite, cargar la skill **`testing`** (trampas de mocks, aliases y orden de `vi.resetModules`).
