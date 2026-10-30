# CONTEXTO TÉCNICO DEL PROYECTO

Referencia técnica para SIGE. Para reglas de código, ver `AGENTS.md`. Para notas de diseño, roadmap y plan de trabajo, ver `notas.md`.

---

## Modelo de Datos (Firestore)

> **Modelo v2 aprobado (30/10/2026, etapa E0).** El detalle completo, los diagramas y la
> migración están en [modelo-datos.md](modelo-datos.md). Acá va la foto operativa.
>
> **Datos actuales:** Firestore solo contiene los **9 usuarios de prueba** de
> `data/usuarios.csv`. No hay datos reales.

**Colección principal: `usuarios`**
- **Pre-registro**: documento con ID = `email` (lowercase).
- **Post-registro**: documento con ID = `uid` de Firebase Auth. El documento `email` se elimina
  en un `writeBatch` atómico.
- **Shape v2** (objetivo; hoy la base tiene shape v1 y E3 la migra):
  - identidad: `personaId` (UUID estable), `dni`, `nombre`, `apellido`, `email`;
  - acceso: `roles[]`, `estadoRegistro` (`pendiente_registro` | `registrado`), `uid`,
    `estadoUsuario` (`activo` | `inactivo`), `estadoUsuarioActualizadoEn`, `motivoEstado`;
  - académico: `planes` como **mapa por código** (`planes["662"] = { id, nombre, estado,
    fechaInscripcion, vigente, origen, ... }`);
  - legajo: `numeroLegajo` (denormalizado), `creadoEl`, `actualizadoEn`.
- **Roles**: array de strings lowercase (`['estudiante']`, `['estudiante', 'bedel']`). Valores
  posibles: `estudiante`, `docente`, `bedel`, `coordinacion`, `admin`. Normalizados por
  `obtenerUsuario()`.
- **Estados por plan**: `ingresante`, `activo`, `por_vencer`, `vencido`, `graduado`,
  `condicional`. `por_vencer` y `vencido` se calculan (fuera de alcance); `ingresante` solo
  existe en planes con pregrado (materias de año `0`).

**Colección: `legajos` (nueva, “Legajo digital”)**
- ID = `personaId`. Un legajo por persona, no por plan.
- Datos administrativos: `numeroLegajo`, `fechaNacimiento`, `domicilios[]`, `telefonos[]`,
  `datosAdministrativos{}`, `documentacion[]` (previsto).
- Se crea en el mismo batch que el pre-registro. El vínculo es `usuarios.personaId`; no
  depende del email ni del uid.

**Colecciones de soporte (nuevas)**
- `importaciones/{id}`: auditoría de cargas masivas (hash, usuario, totales, errores).
- `contadores/legajos`: secuencia transaccional para `numeroLegajo` (formato previsto `AAAA-NNNN`, a confirmar en E5).

**Colección: `ofertaAcademica`**
- Documento por ciclo (ej: `2026-1`).
- Campos dinámicos según configuración de bedel.

**Subcolección: `usuarios/{uid}/inscripciones{ciclo}`**
- Ej: `usuarios/{uid}/inscripciones20261/{materiaId}`.
- Campos: `materiaId`, `comisionId`, `estado` (`pendiente` | `confirmada`),
  `fechaInscripcion`, `ciclo`.

**Datos estáticos: `/public/planes/{planId}.json`**
- `planes.json` es la única fuente de códigos y nombres; cada `{planId}.json` tiene materias,
  años y correlatividades.
- Solo se puede dar de alta un plan con JSON disponible y normalizable. Hoy: `662` y `708`.
  `662G` está bloqueado hasta revisión; faltan 34 JSON.

## Estado de implementación (30/10/2026)

| Etapa | Alcance | Estado |
|---|---|---|
| E0 | Contrato de datos y documentación | ✅ **Aprobada** (este commit) |
| E1 | Utilidades de planes y detección de pregrado (`src/utils/planes.js`) | ⏳ Pendiente |
| E2 | Validación compartida v2 + CSV v2 | ⏳ Pendiente |
| E3 | Migración de shape y compatibilidad de lectores | ⏳ Pendiente |
| E4 | Rules y tests de integración | ⏳ Pendiente |
| E5 | Carga masiva de ingresantes in-app | ⏳ Pendiente |
| E6 | Base del alta individual (composable + formulario) | ⏳ Pendiente |
| E7 | Alta individual de estudiante (Bedel) | ⏳ Pendiente |
| E8 | Alta individual de docente (Coordinación) | ⏳ Pendiente |
| E9 | Legajo digital: actualización por Bedel | ⏳ Pendiente |
| E10 | Script de importación v2 | ⏳ Pendiente |
| E11 | Cierre y verificación integral | ⏳ Pendiente |

> Hasta E3/E4, la app sigue leyendo el shape v1 y `firestore.rules` sigue con las reglas
> actuales. La carga masiva in-app actual todavía acepta roles y no valida JSON de planes:
> eso cambia en E5.

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
- **`usuarios/useUsuarios.js`**: CRUD `usuarios`. Migración `email→uid`. Normalización de roles. En E3 suma normalización de `estadoRegistro` y `planes` (compatibilidad v1) y búsqueda por email/DNI.
- **`usuarios/useImportarUsuarios.js`**: Carga masiva de usuarios desde CSV. Hoy implementa el flujo v1 (roles, `planes` array, solo valida formato). En E5 pasa a CSV v2: solo estudiantes, planes con JSON, duplicados en memoria/Firestore, `legajos`, auditoría y aborto total.
- **`usuarios/useAltaUsuario.js`** *(nuevo, E6)*: Motor del alta individual. Valida, chequea duplicados (email/DNI), genera `personaId` y legajo, y escribe `usuarios` + `legajos` en un batch.
- **`usuarios/useLegajo.js`** *(nuevo, E9)*: `obtenerLegajo(personaId)` y `actualizarLegajo(personaId, datos)`.
- **`inscripciones/useOfertaAcademica.js`**: Lectura de `ofertaAcademica/{ciclo}`.
- **`inscripciones/useCargaOferta.js`**: Carga masiva de oferta desde CSV (`coordinacion`). Reemplaza el documento del ciclo en un `writeBatch`.
- **`inscripciones/useInscripciones.js`**: Creación y lectura de inscripciones (subcolección de `usuarios`).
- **`academico/usePlanesEstudio.js`**: Carga JSON local + procesamiento de correlativas. En E1/E2 reutiliza el normalizador compartido de `src/utils/planes.js`.
- **`useLayout.js`**: Theme + layout singleton (body class switching).

**Utilidades puras compartidas (nuevas):**
- `src/utils/planes.js` (E1): normalización de JSON, detección de pregrado y catálogo disponible.
- `src/utils/validacionUsuarios.js` (E2): normalización y validación de usuarios, planes y fechas; construcción de `usuarios` y `legajos`.
- `src/utils/csv.js` (E2): parser CSV v2 con columnas y arrays paralelos.

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
- **`registrarUsuario` (Callable)**: Verifica pre-aprobación, crea usuario en Auth, migra doc `email→uid` con `writeBatch`, devuelve perfil. Copia **todos** los campos del pre-registro, incluidos `personaId`, `planes` (mapa) y `numeroLegajo`; el legajo no se mueve. En v2, el resultado debe quedar con `estadoRegistro: "registrado"` (hoy la CF no lo escribe: E3 lo normaliza en lectura y puede persistirlo).
- Configuración: maxInstances 10, Node 24
- Cliente llama con `httpsCallable(functions, 'nombreFuncion')` desde `@/config/firebase.js`

---

## Firestore Rules

> El modelo v2 define la matriz objetivo en [modelo-datos.md](modelo-datos.md#10-permisos-objetivo-e4).
> `firestore.rules` se actualiza en E4. **Hasta entonces rigen las reglas v1 que se describen
> acá.**

### Reglas actuales (v1)

- `firestore.rules` usa funciones helper (`esAdmin()`, `esBedel()`, `esCoordinacion()`) que leen
  los custom claims (`request.auth.token['roles']`), no Firestore.
- `usuarios`:
  - `read`: el propio usuario o bedel/coordinación/admin.
  - `create`: admin, o coordinación sin poder otorgar `admin`/`coordinacion`. **Bedel no puede
    crear** todavía.
  - `update`: el dueño sin tocar `roles`; bedel/coordinación solo sobre usuarios con rol
    `estudiante` y sin tocar `roles`; admin sin restricciones.
  - `delete`: solo admin.
- `ofertaAcademica`: `write` (create/update/delete) para `coordinacion` y admin.
- `legajos` e `importaciones`: **no tienen reglas** (no existen todavía).

### Objetivo v2 (E4)

- Bedel puede `create` solo `roles == ['estudiante']` y
  `estadoRegistro == 'pendiente_registro'`.
- Coordinación sigue sin poder crear `admin`/`coordinacion`; admin sin cambios.
- Validaciones mínimas de `create`: `personaId` UUID, `email` = docId, `roles` no vacío,
  `planes` mapa no vacío si es estudiante, `uid` ausente.
- `legajos/{personaId}`: read/write para bedel, coordinación y admin; estudiante no.
- `importaciones/{id}`: write para coordinación y admin.

### Colecciones dinámicas

- Colecciones dinámicas (`inscripciones${ciclo}` → `inscripciones20261`): wildcard de
  **segmento completo** + `matches()` (`match /usuarios/{userId}/{subcoleccion}/{materiaId}` con
  `subcoleccion.matches('^inscripciones[0-9]+$')`). Las reglas no soportan comodines parciales
  dentro de un segmento. Ver `AGENTS.md` §4.

---

## ⏳ Problemas identificados (pendientes)

> Estado verificado el 29/10/2026: `npm run test:unit` → 59/59 ✅, `npm run test:integration` → 13/13 ✅
> (con `firebase-tools` 15 y Java 21, ver `testing-setup.md`) y `npm run build` → ✅.

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
- **Costo (resuelto en F2-3):** `esAdmin()`, `esBedel()` y `esCoordinacion()` ya leen custom claims
  (`request.auth.token['roles']`), así que no hacen lecturas extra a Firestore. La nota histórica sobre el
  `get()` por evaluación quedó obsoleta.
- **Validación y deploy**: `npm run test:integration` (requiere Java 21) valida contra los emuladores; el deploy lo hace el workflow de `main` en cada release (o a mano: `firebase deploy --only firestore:rules`).

### 📋 Backlog FASE 2 (arquitectura de roles `coordinacion`)

> Decidido el 19/10/2026 junto con la matriz de responsabilidades del 5to rol (`coordinacion`).
> **Importante, no urgente** — no bloquea la FASE 1 (reglas de `usuarios`/`ofertaAcademica`, flujo de ingestión
> y UI del rol). Cada punto es una mejora autónoma.

| # | Área | Problema / Limitación | Solución prevista |
|---|------|------------------------|-------------------|
| F2-2 | Ingestión de usuarios (`usuarios/{email}`) | La carga v1 escribe docs pre-registro con ID = email. Si el usuario ya se registró, su doc migró a `usuarios/{uid}` y el doc `email` ya no existe: re-importar podía crear un **doc huérfano**. | El flujo v2 (E5) valida duplicados por email y DNI con consultas `in` en chunks de 30 y **aborta toda la carga** si encuentra uno; además la carga sigue siendo operación de inicio de ciclo y nunca modifica usuarios registrados. |
| F2-3 | `firestore.rules` (costo, relacionado con #3) | `esAdmin()`, `esBedel()` y `esCoordinacion()` hacían un `get()` por evaluación → 1-3 lecturas facturadas extra por request que las use. Con ~800 estudiantes y el 5to rol el costo crece. | ✅ **Resuelto (Bloque 4/Paso 8)**: roles migrados a custom claims (`request.auth.token['roles'].hasAny([...])`). `registrarUsuario` ahora llama `setCustomUserClaims()`. Tests de integración 13/13 ✅. Usuarios existentes necesitan script de migración. |
| F2-4 | `useUsuarios.actualizarRoles()` | Escribe `roles` en Firestore pero **no sincroniza los custom claims**. Hasta que el usuario renueve el token, las rules siguen viendo los roles viejos. | Actualizar los claims desde una Cloud Function/admin al cambiar roles, o forzar refresh del token. Fuera de alcance de este plan. |

### 🧱 Deuda conocida del modelo v2

| Tema | Estado actual | Etapa / decisión |
|---|---|---|
| Shape v1 en Firestore | `estado`, `planes` como array de nombres, sin `personaId` ni `estadoUsuario`. | E3 migra con dry-run. |
| Lectores de `user.plan` | `TableroE.vue`, `PlanesEstudioView.vue`, `PlanesEstudioCard.vue` y `PerfilCard.vue` leen el campo singular; la importación escribe `planes`. | E3 unifica a `user.planes`. |
| Planes sin JSON | Solo `662` y `708` son utilizables; `662G` está bloqueado y faltan 34 JSON. | Fuera de alcance: bloquean altas nuevas hasta revisión. |
| `trayectoriaAcademica` | No implementada; sin ella no se pueden calcular `ingresante → activo`, `por_vencer` ni `vencido`. | Fuera de alcance; el modelo ya guarda `ultimaAcreditacion` como campo previsto. |
| `estadoRegistro` post-registro | La CF copia los datos pero no cambia `estado`/`estadoRegistro`. | E3 normaliza por `uid` en lectura; persistirlo es una mejora. |
| Claims al editar roles | Ver F2-4. | Fuera de alcance. |

### 🟡 Moderados

> Sin problemas moderados pendientes. Todos los problemas de esta categoría ya fueron resueltos (ver historial en `docs/notas.md` → "Historial de problemas resueltos").

### 🟢 Sugerencias

| # | Área | Sugerencia |
|---|------|------------|
| 13 | Lint | No hay ESLint configurado: cosas como un identificador suelto o un import no-`lite` no las detecta nadie hasta que rompen en runtime. ✅ **Resuelto (Bloque 4/Paso 7)**: `eslint.config.js` creado con flat config v9 + script `lint` en `package.json`. Reglas como `warn` inicialmente. `npm run lint` código 0. |
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
- Plan de carga de usuarios y legajo digital: [`plan-carga-usuarios-202610.md`](plan-carga-usuarios-202610.md)
- Importaciones: [`importar-usuarios.md`](importar-usuarios.md), [`importar-oferta.md`](importar-oferta.md)
