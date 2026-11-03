# Plan: Taller editorial de planes y publicación (Rol Coordinación / Admin)

> **Estado:** propuesto (03/11/2026). Pendiente de aprobación para implementación.
> **Objetivo:** separar el **taller editorial** (donde coordinación y admin revisan, comentan
> y aprueban planes) de la **vidriera de runtime** (lo que la app y la página pública leen),
> de modo que los planes se trabajen 100 % in-app sin afectar la ruta crítica de inscripción.
> **Base:** extiende `plan-editor-planes-202611.md`. La nomenclatura acordada es **"provisorios"**
> (en revisión) y **"listos"** (publicados y en uso).

---

## 0. Contexto y decisiones de diseño

### 0.1 Qué hay hoy

| Conjunto | Dónde vive | Quién lo lee |
|---|---|---|
| **Listos** | Archivos estáticos `public/planes/{codigo}.json` + `planes.json` | La app (warmup en `main.js`), el gate de altas (`validarPlanDetalle`), la página pública `/planes-estudio` y `PlanesEstudioView` |
| **Provisorios** | Firestore `planesPendientes/{codigo}` (`jsonTexto` + auditoría) | Coordinación/admin (Carga de Datos + Editor) |

Hoy no existe estado de revisión ni comentarios. La decisión de dejar los "listos" como
archivos estáticos está en `docs/notas.md` y nació de bajar lecturas.

### 0.2 Por qué las lecturas NO son el factor decisivo

La inscripción a materias **no lee el plan**: `InscripcionesE.vue` + `useInscripciones.js`
solo leen `ofertaAcademica/{ciclo}` (1) y `usuarios/{uid}/inscripciones{ciclo}` (N), y escriben
1 doc por inscripción. El árbol de correlatividades no participa. El plan se lee solo al
**verlo** y en el **gate de altas** (cacheado por código).

Cálculo para febrero 2027 (800 estudiantes × 8 materias):

| Escenario | Lecturas Firestore del plan | Free tier (50k/día) |
|---|---|---|
| Estático (hoy) | 0 (+ cache CDN/navegador) | — |
| Firestore con cache por sesión | ~800/día | 1,6 % |
| Firestore naïve (1 lectura por materia) | 6.400/día | 12,8 % |

Aun el peor caso entra en el free tier; si lo superara, el costo es US$0,06/100.000 lecturas
(centavos). Lo que hay que vigilar en febrero son las **escrituras** (6.400 inscripciones +
confirmaciones de bedel ≈ 12.800/día, cerca del free tier de 20k), no la lectura de planes.

### 0.3 Decisión: Opción C — "taller en Firebase, vidriera estática"

| | Qué es | Dónde vive |
|---|---|---|
| **Taller editorial** | Provisorios, comentarios, estado de revisión y el registro de "listos" aprobados | **Firestore** (`planesPendientes` + `planesPublicados` + subcolección `comentarios`) |
| **Vidriera de runtime** | Lo que la app y la página pública leen | **`public/planes/`** (estáticos, **generados** desde `planesPublicados`) |

Ventajas:

1. La ruta crítica (inscripción, página pública, altas) **no cambia**: sigue leyendo estáticos,
   0 lecturas Firestore, cache CDN, y la página pública **no** depende de Firestore ni requiere
   exponer la colección.
2. Coordinación y admin trabajan **100 % in-app** (comentar, marcar listo, aprobar).
3. **Git conserva el historial** de lo publicado.
4. La vidriera es un **artefacto generado** de una sola vía (no un espejo editable): se
   regenera completa desde `planesPublicados`, así que no puede desincronizarse por edición manual.

### 0.4 Nombres

- **Provisorios** = `planesPendientes/{codigo}` (se mantiene el nombre de colección; migrarlo
  no aporta).
- **Listos** = `planesPublicados/{codigo}` (registro de lo aprobado/publicado en el taller).
- En la UI: *"Planes provisorios (en revisión)"* y *"Planes listos (publicados)"*.

### 0.5 Quién publica

- **Coordinación:** edita, comenta, marca `listo_para_publicar`.
- **Admin (vos):** aprueba y **publica** (promueve `provisorio → listo` y genera la vidriera).

---

## 1. Modelo de datos

### 1.1 `planesPendientes/{codigo}` (existente, se amplía)

Campos actuales: `codigo`, `nombre`, `jsonTexto`, `csvTexto` (legacy), `materiasCount`,
`actualizadoEn`, `actualizadoPor`, `actualizadoPorEmail`.

Se agregan:

| Campo | Tipo | Descripción |
|---|---|---|
| `estadoRevision` | `'en_edicion' \| 'revision' \| 'listo_para_publicar'` | Estado en el flujo de trabajo. Default `'en_edicion'`. |
| `listoParaPublicarEn` | timestamp \| null | Cuándo se marcó como listo. |
| `listoParaPublicarPor` | uid \| null | Quién lo marcó. |
| `publicadoEn` | timestamp \| null | Cuándo se publicó (si ya se publicó). |

### 1.2 `planesPendientes/{codigo}/comentarios/{comentarioId}` (nueva subcolección)

| Campo | Tipo | Descripción |
|---|---|---|
| `texto` | string (1–2000) | Contenido del comentario. |
| `materiaId` | string \| null | `null` = comentario general del plan; si no, ancla a una materia. |
| `tipo` | `'nota' \| 'actualizacion' \| 'chequear' \| 'listo'` | Semántica del comentario. |
| `autor` | uid | Autor. |
| `autorEmail` | string | Email del autor (para mostrar sin leer `usuarios`). |
| `creadoEn` | timestamp | Alta. |
| `resuelto` | boolean | Resuelto o pendiente. |
| `resueltoPor` | uid \| null | Quién lo resolvió. |
| `resueltoEn` | timestamp \| null | Cuándo. |

**Por qué subcolección y no dentro del JSON:** el JSON exportado/publicado no debe cargar
comentarios internos, y un re-guardado del borrador hace `setDoc` del padre (que **no** toca
subcolecciones), mientras que un re-import del JSON del Apps Script pisaría cualquier campo
`comentarios` dentro del doc o del `jsonTexto`.

### 1.3 `planesPublicados/{codigo}` (nueva colección — registro de "listos")

| Campo | Tipo | Descripción |
|---|---|---|
| `codigo` | string | Código canónico. |
| `nombre` | string | Nombre del plan. |
| `disponible` | boolean | Si se habilita para el alta. |
| `jsonTexto` | string (≤ 1 MB) | Detalle publicado (el mismo objeto que genera `generarJSONDetalle()`). |
| `version` | number | Se incrementa en cada publicación. |
| `publicadoEn` | timestamp | Fecha de publicación. |
| `publicadoPor` | uid | Admin que publicó. |
| `publicadoPorEmail` | string | Email del admin. |
| `materiasCount` | number | Denormalizado para el listado. |
| `origenActualizadoEn` | timestamp \| null | `actualizadoEn` del borrador promovido (trazabilidad). |

La **vidriera** (`public/planes/`) se genera a partir de esta colección (§6).

---

## 2. Reglas de Firestore

En `firestore.rules`:

1. **`planesPendientes/{codigo}`** (existente): aceptar el campo opcional `estadoRevision`
   (si viene, debe estar en el conjunto permitido). El resto del `shapeValido()` no cambia.
2. **`planesPendientes/{codigo}/comentarios/{comentarioId}`** (nueva, anidada):
   - `read`: coordinación o admin.
   - `create`: coordinación/admin, con `texto` string de 1–2000, `autor == request.auth.uid`,
     `tipo` en el conjunto permitido y `creadoEn` presente.
   - `update`: coordinación/admin, permitiendo resolver (`resuelto`, `resueltoPor == uid`,
     `resueltoEn`) y editar `texto`.
   - `delete`: coordinación o admin.
3. **`planesPublicados/{codigo}`** (nueva):
   - `read`: coordinación o admin.
   - `create, update, delete`: **solo admin** (`esAdmin()`), con `codigo == codigo`,
     `jsonTexto` string ≤ 1 MB y `publicadoPor == request.auth.uid`.

No se exponen estas colecciones a lectura anónima: la página pública sigue leyendo la vidriera.

---

## 3. Estructura de archivos

| Archivo | Acción | Propósito |
|---|---|---|
| `src/composables/academico/usePlanesPendientes.js` | **Editar** | Persistir `estadoRevision`; `marcarListoParaPublicar(codigo, {uid,email})`; normalizar el nuevo campo. |
| `src/composables/academico/useComentariosPlanes.js` | **Crear** | CRUD de la subcolección `comentarios`: listar, agregar, resolver/reabrir y eliminar. |
| `src/composables/academico/usePlanesPublicados.js` | **Crear** | Leer/crear `planesPublicados`; `publicarPlan(...)` (copia provisorio→listo con `version++`); armar la vidriera. |
| `src/composables/academico/useGestionPlanes.js` | **Editar** | Orquestación: bandeja de "listos para publicar", publicar, exponer estado de revisión. |
| `src/components/ui/PanelComentarios.vue` | **Crear** | Lista + alta + resolver comentarios (general y por materia). |
| `src/views/coordinacion/EditorPlanes.vue` | **Editar** | Selector de **provisorios**; panel de comentarios; botón "Marcar listo para publicar"; botón "Publicar" (solo admin). |
| `src/views/coordinacion/CargaDatos.vue` | **Editar** | Mostrar `estadoRevision` en la tabla de borradores. |
| `firestore.rules` | **Editar** | Reglas de `planesPublicados` y de la subcolección `comentarios`. |
| `scripts/seed-planes-publicados.js` | **Crear** | Sembrar `planesPublicados` desde los `public/planes/*.json` actuales (662, 662G, 708). |
| `tests/unit/composables/useComentariosPlanes.spec.js` | **Crear** | Alta/listado/resolución de comentarios. |
| `tests/unit/composables/usePlanesPublicados.spec.js` | **Crear** | Publicación, `version++`, armado de la vidriera. |
| `tests/unit/composables/usePlanesPendientes.spec.js` | **Editar** | `estadoRevision` y `marcarListoParaPublicar`. |
| `tests/unit/composables/useGestionPlanes.spec.js` | **Editar** | Bandeja de aprobación y publicar. |

No se crean carpetas nuevas bajo `src/` (todo cae en `academico/` y `components/ui/`).

---

## 4. Composables

### 4.1 `useComentariosPlanes.js`

```
listarComentarios(codigoPlan)                 -> { exito, datos: Comentario[], error }
agregarComentario(codigoPlan, { texto, materiaId, tipo, uid, email }) -> { exito, datos, error }
resolverComentario(codigoPlan, id, { uid })   -> { exito, datos, error }
reabrirComentario(codigoPlan, id)             -> { exito, datos, error }
eliminarComentario(codigoPlan, id)            -> { exito, datos, error }
```

Orden por `creadoEn` ascendente. Toda función devuelve `{ exito, datos, error }` (AGENTS.md §5).

### 4.2 `usePlanesPublicados.js`

```
listarPlanesPublicados()                      -> { exito, datos: PlanPublicado[], error }
obtenerPlanPublicado(codigo)                  -> { exito, datos, error }
publicarPlan({ codigo, nombre, jsonTexto, disponible, materiasCount, uid, email, origenActualizadoEn })
                                              -> { exito, datos, error }
generarVidriera()                             -> { catalogo, detalles }  // objetos listos para serializar
```

`publicarPlan` lee el `version` actual (si existe), escribe `planesPublicados/{codigo}` con
`version + 1`, y actualiza `publicadoEn/...` en el provisorio (opcional).

### 4.3 `useGestionPlanes.js` (orquestación)

Suma a lo existente:

- `planesListosParaPublicar` (computed): provisorios con `estadoRevision === 'listo_para_publicar'`.
- `marcarListoParaPublicar(codigo)` / `volverARevision(codigo)`.
- `publicar(codigo)`: valida, llama a `publicarPlan`, genera la vidriera y dispara la descarga
  (MVP) de `{codigo}.json` + `planes.json`.

---

## 5. Vistas y UX

### 5.1 `EditorPlanes.vue`

- **Selector de provisorios** (resuelve tu pedido de "que figuren ya para ser elegidos"):
  un `<select>` con los borradores de `planesPendientes` (código + estado + actualizado).
  Al elegir, carga el plan como hoy lo hace `?abrir=`. Se mantiene `?abrir={codigo}` para
  deep-link desde Carga de Datos.
- **Panel de comentarios** (`PanelComentarios.vue`):
  - General del plan y por materia (ícono junto a cada materia que abra los comentarios de esa
    materia).
  - Tipos con color: *actualización*, *a chequear*, *nota*, *listo*.
  - Resolver/reabrir; se muestra autor y fecha.
- **Barra de estado de revisión:** píldora `en_edicion` / `revision` / `listo_para_publicar`
  + botón **"Marcar listo para publicar"**.
- **Publicar (solo admin):** botón habilitado cuando el plan está `listo_para_publicar`;
  publica y descarga la vidriera (§6).
- **Bandeja del admin:** los planes marcados "listo para publicar" se listan arriba con el
  último comentario `tipo: 'listo'`.

### 5.2 `CargaDatos.vue`

La tabla de borradores suma una columna **Estado** (`en_edicion` / `revision` /
`listo_para_publicar`) y muestra la fecha con `formatearFechaHora`.

---

## 6. Flujo taller → vidriera

Al publicar (`publicarPlan`):

1. Escribe `planesPublicados/{codigo}` (con `version++`).
2. Genera los dos artefactos de la vidriera:
   - `public/planes/{codigo}.json` = `generarJSONDetalle()` del plan publicado
     (con `disponible`, `revisadoEn`, `revisadoPor`).
   - `public/planes/planes.json` = catálogo completo = merge de `planesPublicados`
     (`{ planes: [{ codigo, nombre, disponible }] }`).
3. **MVP (sin infra):** el admin descarga ambos archivos (ya existe el export) y los commitea.
   Un push a `main` despliega hosting (workflow `firebase-hosting-main.yml`).

**Automatización futura (opcional):** un workflow programado/manual en `.github/workflows/`
con una service account (rol admin en las rules) que lea `planesPublicados`, regenere
`public/planes/` y commitee si hay cambios → hosting redepliega. Ahí "publicar" queda 100 %
en un clic, sin download+commit.

---

## 7. Comentarios y estado de revisión (resumen)

- Los comentarios **no** van dentro del JSON ni del doc del borrador: van a la subcolección
  (§1.2). Así sobreviven a re-guardados y re-imports, y no contaminan lo publicado.
- El **estado de revisión** vive en el doc del borrador (`estadoRevision`) y es lo que arma la
  bandeja del admin.
- "Avisar al admin" = `estadoRevision = 'listo_para_publicar'` + opcionalmente un comentario
  `tipo: 'listo'`.

---

## 8. Migración / seed

1. **Sembrar `planesPublicados`** con los 3 planes actuales (662, 662G, 708) leyendo
   `public/planes/*.json` y `planes.json` → `scripts/seed-planes-publicados.js`
   (usa `scripts/firebaseNode.js`). Idempotente.
2. Los provisorios existentes arrancan con `estadoRevision: 'en_edicion'`.
3. Una vez verificada la vidriera generada, `public/planes/` sigue siendo la fuente de runtime
   (no se toca el consumo).

---

## 9. Tests

- `useComentariosPlanes`: alta (general y por materia), listado ordenado, resolver/reabrir,
  eliminación, validaciones de texto vacío.
- `usePlanesPublicados`: `publicarPlan` crea/actualiza con `version++`, `listarPlanesPublicados`,
  `generarVidriera` (catálogo + detalle).
- `usePlanesPendientes`: `marcarListoParaPublicar` setea estado y auditoría; normalización del campo.
- `useGestionPlanes`: `planesListosParaPublicar` y `publicar` (éxito y error).

Cargar la skill **`testing`** antes de tocar `tests/` (trampas de mocks/orden de `vi.resetModules`).

---

## 10. Cambios en la documentación

- `docs/modelo-datos.md`: agregar `planesPublicados/{codigo}`, la subcolección
  `planesPendientes/{codigo}/comentarios`, y `estadoRevision`; actualizar §9.5.
- `docs/contexto.md`: listar los composables nuevos y las colecciones de soporte.
- `docs/notas.md`: anotar la revisión de la decisión "los planes viven en JSON estáticos":
  la vidriera sigue estática, pero la **fuente editorial** pasa a Firestore (taller).
- `docs/plan-editor-planes-202611.md`: referenciar este plan desde la sección de publicación.

---

## 11. Fuera de alcance

- Migrar la **lectura de runtime** de los planes a Firestore (eso sería la Opción A; descartada).
- Notificaciones push/email al admin (el aviso es el `estadoRevision`).
- Hilos/respuestas anidadas en los comentarios (MVP: lista plana + resolver).
- Historial de versiones del JSON publicado (el historial de la vidriera sigue siendo git;
  `planesPublicados.version` queda como marca).
- Editor de planes nuevos desde cero (se sigue partiendo de un JSON del Apps Script).

---

## 12. Preguntas abiertas

1. ¿Coordinación puede **desmarcar** `listo_para_publicar` (volver a `revision`)? *Recomendado: sí.*
2. ¿El comentario por materia se ancla también a un **campo** (ej. `correlativas.aprobar`) o
   alcanza con `materiaId`? *Recomendado: `materiaId` en el MVP.*
3. ¿`planesPublicados` guarda además un `disponible` propuesto por coordinación, distinto del
   que decide el admin al publicar? *Recomendado: el admin decide al publicar; el provisorio
   guarda el propuesto en el checkbox del editor.*

---

## 13. Checklist de verificación

| Etapa | Prueba |
|---|---|
| `useComentariosPlanes` + rules | Crear/leer/resolver comentarios; coordinación y admin sí, estudiante no. |
| `usePlanesPendientes` | Marcar listo → `estadoRevision` y auditoría persistidos. |
| `usePlanesPublicados` | Publicar crea el doc con `version++` y `disponible` correcto. |
| Vidriera | `generarVidriera` + `normalizarPlanJson` leen el `{codigo}.json` generado sin errores. |
| Editor | Selector de provisorios + panel de comentarios + publicar (admin). |
| Reglas deploy | `npm run test:integration` (requiere Java 21) y deploy del workflow `main`. |
| Docs | `modelo-datos.md`, `contexto.md`, `notas.md` actualizados. |
| Build | `npm run lint` + `npm run test:unit` + `npm run build`. |
