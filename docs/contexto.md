# CONTEXTO TÉCNICO DEL PROYECTO

Referencia técnica para SIGE. Para reglas de código, ver `AGENTS.md`. Para notas de diseño, roadmap y plan de trabajo, ver `notas.md`.

---

## Modelo de Datos (Firestore)

**Colección principal: `usuarios`**
- **Pre-registro**: documento con ID = `email` (lowercase). Campos: `nombre`, `apellido`, `carrera`, `dni`, `legajo`, `estado`, `roles` (array), `plan`
- **Post-registro**: documento con ID = `uid` de Firebase Auth. Mismo contenido + `uid` + `actualizadoEn`. El documento `email` se elimina (writeBatch atómico).
- **Roles**: array de strings lowercase (`['estudiante']`, `['estudiante', 'bedel']`). Valores posibles: `estudiante`, `docente`, `bedel`, `coordinacion`, `admin`. Normalizados por `obtenerUsuario()`.

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
- **`usuarios/useImportarUsuarios.js`**: Carga masiva de usuarios desde CSV (rol `coordinacion`). Validación temprana + `writeBatch` en lotes de ≤500.
- **`inscripciones/useOfertaAcademica.js`**: Lectura de `ofertaAcademica/{ciclo}`.
- **`inscripciones/useCargaOferta.js`**: Carga masiva de oferta desde CSV (`coordinacion`). Reemplaza el documento del ciclo en un `writeBatch`.
- **`inscripciones/useInscripciones.js`**: Creación y lectura de inscripciones (subcolección de `usuarios`).
- **`academico/usePlanesEstudio.js`**: Carga JSON local + procesamiento de correlativas.
- **`useLayout.js`**: Theme + layout singleton (body class switching).

---

## Layouts y Theming

### Layouts dinámicos
6 layouts, uno por rol:
- `AccesoLayout.vue` — Login, registro, reset, términos
- `EstudianteLayout.vue`, `AdminLayout.vue`, `BedelLayout.vue`, `DocenteLayout.vue`, `CoordinacionLayout.vue` — Envuelven `BarraApp` + `<router-view>` + `FooterApp`

### Temas por rol
- Clases CSS en `style.css`: `.theme-estudiante` (teal), `.theme-docente` (blue), `.theme-bedel` (purple), `.theme-coordinacion` (indigo), `.theme-admin` (rose)
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
- Configuración: maxInstances 10, Node 24
- Cliente llama con `httpsCallable(functions, 'nombreFuncion')` desde `@/config/firebase.js`

---

## Firestore Rules

- `firestore.rules` usa funciones helper (`esAdmin()`, `esBedel()`, `esCoordinacion()`) que hacen una lectura extra a Firestore por solicitud
- `usuarios`: `create` lo permite admin y `coordinacion` (esta última sin poder otorgar `admin`/`coordinacion`); el array `roles` solo lo puede modificar admin en el `update`. `ofertaAcademica`: `write` (create/update/**delete**) para `coordinacion` y admin
- Colecciones dinámicas (`inscripciones${ciclo}` → `inscripciones20261`): wildcard de **segmento completo** + `matches()`
  (`match /usuarios/{userId}/{subcoleccion}/{materiaId}` con `subcoleccion.matches('^inscripciones[0-9]+$')`). Las reglas no
  soportan comodines parciales dentro de un segmento. Ver `AGENTS.md` §4.

---

## ⏳ Problemas identificados (pendientes)

> Estado verificado el 19/10/2026: `npm run test:unit` → 59/59 ✅ y `npm run build` → ✅.
> Los tests de integración (reglas) no se pudieron correr localmente: falta Java 17 (ver `testing-setup.md`); el CI los corre.

### 🔴 Críticos

| # | Archivo | Problema |
|---|---------|----------|
| 3 | `firestore.rules` | ✅ **Arreglado y deployado** (19/10/2026): wildcard de segmento `{subcoleccion}` + `matches('^inscripciones[0-9]+$')` y `create`/`update` separados (el estudiante no puede tocar `estado`). Ya está publicado en producción y el workflow de `main` lo publica en cada release (`.github/scripts/deploy-firebase.sh`). |

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
- **Validación y deploy**: `npm run test:integration` (requiere Java 17) valida contra los emuladores; el deploy lo hace el workflow de `main` en cada release (o a mano: `firebase deploy --only firestore:rules`).

### 📋 Backlog FASE 2 (arquitectura de roles `coordinacion`)

> Decidido el 19/10/2026 junto con la matriz de responsabilidades del 5to rol (`coordinacion`).
> **Importante, no urgente** — no bloquea la FASE 1 (reglas de `usuarios`/`ofertaAcademica`, flujo de ingestión
> y UI del rol). Cada punto es una mejora autónoma.

| # | Área | Problema / Limitación | Solución prevista |
|---|------|------------------------|-------------------|
| F2-2 | Ingestión de usuarios (`usuarios/{email}`) | La carga masiva escribe docs pre-registro con ID = email. Si el usuario ya se registró, su doc migró a `usuarios/{uid}` y el doc `email` ya no existe: re-importar crearía un **doc huérfano**, y detectarlo requeriría `where('email','==',...)` (query que las reglas de lectura no habilitan y que facturaría lecturas por fila). | Respetar que la carga masiva es **operación de inicio de ciclo**, nunca de remediación puntual. Si algún día se necesita corregir usuarios ya registrados, hacerlo con un flujo admin dedicado (query con permisos acotados o script con service account que bypasea reglas). |
| F2-3 | `firestore.rules` (costo, relacionado con #3) | `esAdmin()`, `esBedel()` y `esCoordinacion()` hacen un `get()` por evaluación → 1-3 lecturas facturadas extra por request que las use. Con ~800 estudiantes y el 5to rol el costo crece. | Migrar los roles a **custom claims** (`request.auth.token.roles.hasAny([...])`): las helper pasan a leer el token con **cero lecturas extra**. Requiere que la CF `registrarUsuario` (o una nueva callable admin) actualice los claims vía Admin SDK cuando cambien los roles. |

### 🟡 Moderados

> Sin problemas moderados pendientes. Todos los problemas de esta categoría ya fueron resueltos (ver historial en `docs/notas.md` → "Historial de problemas resueltos").

### 🟢 Sugerencias

| # | Área | Sugerencia |
|---|------|------------|
| 13 | Lint | No hay ESLint configurado: cosas como un identificador suelto o un import no-`lite` no las detecta nadie hasta que rompen en runtime. |
| 15 | Features | Tableros de Bedel/Docente/Admin son placeholders. |

### 🔧 Infra / CI-CD

| # | Archivo | Problema |
|---|---------|----------|
| 21 | Datos personales en repo público | `usuarios.csv` (DNI, nombre, email, roles) e `Inscripciones Terciario - Mat.csv` (docentes, aulas, horarios) estaban versionados en un repo **público** (Ley 25.326). Ahora viven en `data/` (ignorado, ver `data/README.md`) y los scripts apuntan ahí, pero **siguen en el historial de git**: si molesta, hay que reescribirlo (`git filter-repo`) o pasar el repo a privado. |

---

## Documentación relacionada

- Reglas de estilo y convenciones: [`AGENTS.md`](../AGENTS.md)
- Notas de diseño, ideas y roadmap: [`notas.md`](notas.md)
- Modelo de datos y diagrama: [`modelo-datos.md`](modelo-datos.md)
- Importaciones: [`importar-usuarios.md`](importar-usuarios.md), [`importar-oferta.md`](importar-oferta.md)