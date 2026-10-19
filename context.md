# CONTEXTO TÉCNICO DEL PROYECTO

Referencia técnica bajo demanda para SIGE. Para reglas de código, ver `Agents.md`. Para roadmap, plan de trabajo, stakeholders y contenido archivado, ver `NOTAS.md`.

---

## Modelo de Datos (Firestore)

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

Más detalle en [diagrama_v2.md](diagrama_v2.md)

---

## Flujo de Autenticación

1. App inicia → `useAuth.checkAuthState()` registra `onAuthStateChanged`
2. Router guard espera a `checkAuthState()` (promesa singleton)
3. Si usuario logueado → carga perfil desde Firestore → enriquece `user` con roles, nombre, etc.
4. Guardia valida `meta.requiresAuth` y `meta.role`
5. Si múltiples roles → redirige a `SeleccionarRol` → usuario elige → `localStorage.rolActivo`
6. Guardia llama `setLayout(role)` → cambia theme CSS y layout

---

## Composables

Los composables siguen el patrón `useXxx.js` en subdirectorios temáticos bajo `src/composables/`:

- **`auth/useAuth.js`**: Autenticación (login, logout, registro, reset). Único composable de Firebase Auth. Singleton global.
- **`usuarios/useUsuarios.js`**: CRUD `usuarios`. Migración `email→uid`. Normalización de roles.
- **`inscripciones/useOfertaAcademica.js`**: Lectura de `ofertaAcademica/{ciclo}`.
- **`inscripciones/useInscripciones.js`**: Creación y lectura de inscripciones (subcolección de `usuarios`).
- **`academico/usePlanesEstudio.js`**: Carga JSON local + procesamiento de correlativas.
- **`useLayout.js`**: Theme + layout singleton (body class switching).

---

## Layouts y Theming

### Layouts dinámicos
5 layouts, uno por rol:
- `AccesoLayout.vue` — Login, registro, reset, términos
- `EstudianteLayout.vue`, `AdminLayout.vue`, `BedelLayout.vue`, `DocenteLayout.vue` — Envuelven `BarraApp` + `<router-view>` + `FooterApp`

### Temas por rol
- Clases CSS en `style.css`: `.theme-estudiante` (teal), `.theme-docente` (blue), `.theme-bedel` (purple), `.theme-admin` (rose)
- `useLayout.js` mantiene `currentTheme` y `currentLayout` como refs singleton, aplica clases en `document.body` vía `watchEffect`
- El router guard (`src/router/index.js`) llama `setLayout(requiredRole)` para cambiar layout

### Roles múltiples
1. Tras login, si `userRoles.length > 1` → redirige a `SeleccionarRol.vue`
2. `SeleccionarRol.vue` guarda rol en `localStorage.setItem('rolActivo', rol)`
3. `BarraApp.vue` lee `localStorage.rolActivo` y filtra menú (fallback al primer rol)
4. Guardia de navegación valida acceso con `meta.role`

---

## Cloud Functions (v2)

- Definidas en `codebase-functions/index.js`
- Región: `southamerica-east1`
- **`registrarUsuario` (Callable)**: Verifica pre-aprobación, crea usuario en Auth, migra doc `email→uid` con `writeBatch`, devuelve perfil
- Configuración: maxInstances 10, Node 22
- Cliente llama con `httpsCallable(functions, 'nombreFuncion')` desde `@/config/firebase.js`

---

## Firestore Rules

- `firestore.rules` usa funciones helper (`esAdmin()`, `esBedel()`) que hacen una lectura extra a Firestore por solicitud
- Colecciones dinámicas (`inscripciones${ciclo}`) deben usar wildcards `{coleccionId}`, no nombres estáticos

---

## ⏳ Problemas Identificados (todos PENDIENTES)

### 🔴 Críticos

| # | Archivo | Problema |
|---|---------|----------|
| 2 | `src/views/DashboardE.vue` | **Dead code** con imports rotos: importa `useAuth` desde ruta inexistente. No referenciado en el router. |
| 3 | `firestore.rules` (líneas 31-39) | Regla hardcodeada `inscripciones2026` pero el código usa `inscripciones20261` → **inscripciones denegadas por permisos**. Además los dos `allow update` se combinan con OR: L33 deja al estudiante escribir `estado` y **auto-confirmarse**, anulando la restricción de L37. |

### 🟡 Moderados

| # | Archivo | Problema |
|---|---------|----------|
| 6 | `src/views/auth/ResetPassword.vue` | Importa `getAuth`/`sendPasswordResetEmail` directamente. Debería usar `useAuth.js`. Usa `alert()`. |
| 7 | `src/components/TerminosContenido.vue` vs `legal/` | **Dos copias duplicadas**. Confusión de imports. |
| 8 | `src/views/auth/Register.vue` | Importa `FormCheckbox.vue` pero no lo usa. Redirección hardcodeada a `/estudiante`. |
| 9 | `src/components/BarraApp.vue` (línea 63) | `alert('Función no implementada')` — viola Agents.md §5. |
| 11 | `src/composables/useLayout.js` (línea 42) | `setLayout('acceso')` al nivel del módulo causa flash de tema antes del router guard. |
| 16 | `src/composables/auth/useAuth.js` | No hace `unsubscribe` de `onAuthStateChanged`; en SPA no molesta, pero con HMR/montajes repetidos se acumulan listeners. |
| 17 | Convención de error | `useInscripciones` **lanza** en "usuario no autenticado" mientras AGENTS §5 pide `{ exito, datos, error }`. Definir una sola convención. |

### 🟢 Sugerencias

| # | Área | Sugerencia |
|---|------|------------|
| 13 | CI/CD | Añadir GitHub Actions para lint + tests en PRs a `dev`. |
| 14 | Error boundaries | `App.vue` no tiene manejador global de errores. |
| 15 | Features | Tableros de Bedel/Docente/Admin son placeholders. |