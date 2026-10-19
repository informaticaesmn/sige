# CONTEXTO TÉCNICO DEL PROYECTO

Referencia técnica para SIGE. Para reglas de código, ver `AGENTS.md`. Para notas de diseño, roadmap y plan de trabajo, ver `notas.md`.

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

Más detalle en [modelo-datos.md](modelo-datos.md)

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
- Colecciones dinámicas (`inscripciones${ciclo}` → `inscripciones20261`): wildcard de **segmento completo** + `matches()`
  (`match /usuarios/{userId}/{subcoleccion}/{materiaId}` con `subcoleccion.matches('^inscripciones[0-9]+$')`). Las reglas no
  soportan comodines parciales dentro de un segmento. Ver `AGENTS.md` §4.

---

## ⏳ Problemas identificados (pendientes)

> Estado verificado el 19/10/2026: `npm run test:unit` → 39/39 ✅ y `npm run build` → ✅.
> Los tests de integración (reglas) no se pudieron correr localmente: falta Java 17 (ver `testing-setup.md`); el CI los corre.

### 🔴 Críticos

| # | Archivo | Problema |
|---|---------|----------|
| 2 | `src/views/DashboardE.vue` | **Dead code** con imports rotos: importa `useAuth` desde ruta inexistente. No referenciado en el router. |
| 3 | `firestore.rules` | ✅ **Arreglado en el repo** (19/10/2026): wildcard de segmento `{subcoleccion}` + `matches('^inscripciones[0-9]+$')` y `create`/`update` separados (el estudiante no puede tocar `estado`). ⚠️ **Falta deployarlo** (`firebase deploy --only firestore:rules`): mientras tanto producción sigue denegando las inscripciones. |
| 20 | `ofertaAcademica` (nombre y forma) | **Tres nombres distintos para la misma colección**: `scripts/importar-oferta.js` escribe en `ofertaAcademica_prueba2025` (documento por materia + subcolección `secuencias`), la app lee `ofertaAcademica/{ciclo}` (`useOfertaAcademica.js`) y `modelo-datos.md`/`importar-oferta.md` describen `ofertaAcademica_YYYY`. La vista de inscripciones nunca encuentra la oferta importada. |

**Detalle del #3** (bloqueó el flujo principal en producción):

- **Nombre que no coincidía**: la regla declaraba `inscripciones2026` (hardcodeado) y `useInscripciones.js` arma
  `inscripciones${ciclo.replace('-','')}` → `inscripciones20261`: toda alta/lectura daba `permission denied`. Se resolvió con un
  wildcard de **segmento completo** + `matches()` (las reglas no soportan comodines parciales tipo `inscripciones{ciclo}`).
- **Auto-confirmación**: en Firestore los `allow` se combinan con **OR**, así que `allow create, update: if request.auth.uid == userId`
  dejaba al estudiante escribir cualquier campo, incluido `estado`, anulando la restricción de "solo bedel/admin". Ahora
  `create` exige `estado == 'pendiente'` y en el `update` el estudiante no puede cambiar `estado` (bedel/admin sí, y solo ese campo).
  Hay test de regresión en `tests/integration/firestore-rules.spec.js`.
- **Costo**: `esAdmin()` y `esBedel()` hacen un `get()` por evaluación → 1-2 lecturas facturadas extra por request que las usa.
  Con ~800 estudiantes conviene mover el rol a custom claims (`request.auth.token.rol`).
- **Validación y deploy**: `npm run test:integration` (requiere Java 17) y después `firebase deploy --only firestore:rules`.

### 🟡 Moderados

| # | Archivo | Problema |
|---|---------|----------|
| 6 | `src/views/auth/ResetPassword.vue` | Importa `getAuth`/`sendPasswordResetEmail` directamente. Debería usar `useAuth.js`. Usa `alert()`. |
| 7 | `src/components/TerminosContenido.vue` vs `legal/` | **Dos copias duplicadas**. Confusión de imports. |
| 8 | `src/views/auth/Register.vue` | Importa `FormCheckbox.vue` pero no lo usa. Redirección hardcodeada a `/estudiante`. |
| 9 | `src/components/BarraApp.vue` (línea 63) | `alert('Función no implementada')` — viola AGENTS.md §5. |
| 11 | `src/composables/useLayout.js` (línea 42) | `setLayout('acceso')` al nivel del módulo causa flash de tema antes del router guard. |
| 16 | `src/composables/auth/useAuth.js` | No hace `unsubscribe` de `onAuthStateChanged`; en SPA no molesta, pero con HMR/montajes repetidos se acumulan listeners. |
| 17 | Convención de error | `useInscripciones` **lanza** en "usuario no autenticado" mientras AGENTS §5 pide `{ exito, datos, error }`. Definir una sola convención. |

### 🟢 Sugerencias

| # | Área | Sugerencia |
|---|------|------------|
| 13 | Lint | No hay ESLint configurado: cosas como un identificador suelto o un import no-`lite` no las detecta nadie hasta que rompen en runtime. |
| 14 | Error boundaries | `App.vue` no tiene manejador global de errores. |
| 15 | Features | Tableros de Bedel/Docente/Admin son placeholders. |

### 🔧 Infra / CI-CD

| # | Archivo | Problema |
|---|---------|----------|
| 19 | `.github/workflows/test-and-validate.yml` | Corre `build` + `test:unit` + `test:integration` en push a `dev`/`main`, pero el deploy a Firebase no depende de él. ✅ (19/10/2026): sacado el paso que levantaba los emuladores con `&` + `sleep 10` (chocaba con el que ya levanta `emulators:exec`), agregado `vitest.integration.config.js` (sin él `vitest run tests/integration` no encontraba archivos) y el deploy de `main` ahora apunta a `sige-esmn` (decía `prueba1-esmn`). Falta: que el deploy dependa del job de tests. ✅ (19/10/2026) El deploy de `main` ahora usa `.github/scripts/deploy-firebase.sh` (la CLI local, sin la acción `FirebaseExtended/action-hosting-deploy@v0`, que fallaba con `npx ... exit code 2` al chocar con el `firebase-tools` del repo): publica **hosting** y también **`firestore.rules`** (este último primero y con `continue-on-error: true`, para que un fallo de reglas no deje sin publicar la app). Los errores del CLI quedan como anotación `::error` en el run. ⚠️ Pendiente: confirmar que la cuenta de servicio del secreto `FIREBASE_SERVICE_ACCOUNT_KEY` tenga rol para deployar reglas (`Firebase Rules Admin`); el run de `b503ea3` falló ahí. |
| 21 | Datos personales en repo público | `usuarios.csv` (DNI, nombre, email, roles) e `Inscripciones Terciario - Mat.csv` (docentes, aulas, horarios) estaban versionados en un repo **público** (Ley 25.326). Ahora viven en `data/` (ignorado, ver `data/README.md`) y los scripts apuntan ahí, pero **siguen en el historial de git**: si molesta, hay que reescribirlo (`git filter-repo`) o pasar el repo a privado. |

---

## Documentación relacionada

- Reglas de estilo y convenciones: [`AGENTS.md`](../AGENTS.md)
- Notas de diseño, ideas y roadmap: [`notas.md`](notas.md)
- Modelo de datos y diagrama: [`modelo-datos.md`](modelo-datos.md)
- Importaciones: [`importar-usuarios.md`](importar-usuarios.md), [`importar-oferta.md`](importar-oferta.md)