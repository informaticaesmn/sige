# Plan: Editor/Revisor de Planes de Estudio (Rol Coordinación)

> **Estado:** aprobado para implementación (02/11/2026).
> **Objetivo:** que los coordinadores importen el JSON que genera el Apps Script de la planilla, revisen y editen materias y correlatividades, validen, y publiquen `public/planes/{codigo}.json` + `planes.json`.
> **Producción:** febrero 2027, con foco en año 0 (pregrado) y listado completo de materias. Correlatividades y equivalencias pueden quedar incompletas inicialmente y completarse durante 2027.

---

## 0. Contexto y decisiones de diseño

### 0.1 Exclusividad de JSON (Adiós al pasado)

La planilla de Google Sheets sigue siendo la herramienta de edición humana, pero el **Apps Script `exportPlanJSONCore`** es el único productor del insumo del editor. El editor **no procesa CSV de planes**: trabaja pura y exclusivamente con archivos y borradores en formato JSON.

Ventajas:
1. Una sola fuente de verdad estructurada entre la planilla y SIGE.
2. No se parsea texto libre ni se manejan formatos planos ambiguos.
3. El JSON de entrada ya tiene el mismo shape que consume la app, permitiendo un round-trip (importar → editar → exportar) limpio y sin pérdida.

**Decisión:** se elimina cualquier rastro de importación o persistencia basada en CSV para los planes de estudio. El editor solo acepta y emite JSON.

### 0.2 Formato de entrada (salida del Apps Script)

El script genera un objeto con este shape:

```json
{
  "plan": "663",
  "nombre": "Plan 663",
  "materias": {
    "663-0.1": {
      "nombre": "Audioperceptiva",
      "nombre_c": "Audio Pre",
      "cursada": "anual",
      "correlativas": {
        "cursar": {
          "and": [
            "663-0.2",
            { "or": ["663-0.3.1", "663-0.3.2"] }
          ]
        },
        "aprobar": "663-0.1"
      },
      "equivale_a": ["662-0.1"]
    }
  }
}
```

Particularidades que el editor debe tolerar:

| Campo | Qué trae el script | Implicancia |
|---|---|---|
| `plan` | `hoja.getName()` (puede incluir el nombre completo) | El editor deriva el código del primer token (`plan.split(' ')[0]`). |
| `nombre` | `"Plan " + hoja.getName()` | Se usa como nombre editable; se limpia el prefijo `"Plan "`. |
| `materias` | Mapa `{ [materia_id]: { ... } }` | La clave es el código canónico. |
| `id` | **No viene** dentro de la materia | Se deriva de la clave. |
| `anio` | **No viene** dentro de la materia | Se deriva con `anioDeMateria(id)`. |
| `nombre_c` | Opcional | Si falta, se guarda `null`. |
| `cursada` | Texto crudo (`anual`, `1C`, `2C`, vacío) | Se normaliza a `anual` / `1C` / `2C` / `null`. |
| `correlativas` | Opcional; string, `{and}` o `{or}` | Se preserva como árbol editable. |
| `equivale_a` | Opcional; **array** de códigos | El editor lo trata siempre como `string[]`. |
| `formato` | **No viene** | El editor lo agrega al exportar (`"objeto"`). |
| `disponible` | **No viene** | Lo define el catálogo al publicar (§6). |
| `propia`, `cSiuned` | **No vienen** | No se inventan; se conservan solo si un JSON los trae. |

### 0.3 Normalizaciones que aplica el editor

| Dato | Regla |
|---|---|
| Código de plan | Primer token de `plan`, o el valor que el coordinador escriba en “Código del plan”. |
| Nombre del plan | `nombre` sin el prefijo `"Plan "`; editable. |
| Código de materia | La clave del mapa `materias` (`materia_id`). |
| Año | `anioDeMateria(codigo)` de `src/utils/planes.js`. Si devuelve `null`, es error de validación. |
| Cursada | `anual` / `1C` / `2C`; vacío → `null`. |
| Correlativas | Se convierten a un árbol normalizado (§2.3) y se vuelven a serializar al exportar. |
| `equivale_a` | Siempre `string[]`; se acepta string por compatibilidad. |
| Campos desconocidos | Se conservan a nivel materia si son conocidos (`propia`, `cSiuned`); el resto se descarta. |

### 0.4 Persistencia de borradores

Los JSON en revisión se guardan en **Firestore**:

- Colección: `planesPendientes/{codigo}` (ID = código canónico del plan).
- Campos: `codigo`, `nombre`, `jsonTexto`, `materiasCount`, `actualizadoEn`, `actualizadoPor`, `actualizadoPorEmail`.
- Motivo: un coordinador sube el JSON una sola vez y cualquier coordinador puede reabrirlo sin volver a elegir el archivo.
- `jsonTexto` almacena el contenido crudo del JSON de trabajo.
- Límite: 1.000.000 bytes.
- Las reglas de `firestore.rules` validan `jsonTexto`.

La fuente de verdad del plan **publicado** sigue siendo `public/planes/{codigo}.json`.

### 0.5 Publicación

- `public/planes/{codigo}.json`: detalle del plan publicado.
- `public/planes/planes.json`: catálogo con `codigo`, `nombre` y `disponible`.
- El editor descarga ambos archivos; el coordinador los commitea.
- Un push a `main` publica hosting y `firestore.rules` (GitHub Action).
- Un plan se considera publicado cuando **ambos** archivos están actualizados y `planes.json` lo marca con `disponible: true`.

### 0.6 Observaciones sobre el Apps Script (no bloqueantes)

No son parte del repo, pero conviene corregirlas en la planilla:

1. `planData.plan = hoja.getName()` y el archivo se llama `${planData.plan}.json`. Si la hoja se llama `663 Dirección Coral`, el archivo queda con espacios y `normalizarPlanJson` lo rechaza. Recomendación: `plan: planId` y `${planId}.json`.
2. `processPrerequisites()` agrupa por `id.split('.')`. Si `materia_id` usa guiones (`663-00-01`), la expansión de “año completo” puede agrupar mal. Recomendación: estandarizar `materia_id` al formato con punto (`663-0.1`) o corregir el script.
3. `saveJsonToDriveWithPrompt()` guarda con `MimeType.PLAIN_TEXT`; usar `MimeType.APPLICATION_JSON` es más correcto.

El editor debe funcionar igual con el script actual; estas mejoras solo reducen fricción.

---

## 1. Estructura de archivos

| Archivo | Acción | Propósito |
|---|---|---|
| `src/views/coordinacion/EditorPlanes.vue` | **Editar** | Vista principal: importar JSON, editar materias y condiciones, validar, exportar. |
| `src/composables/academico/useEditorPlanes.js` | **Reescribir** | Lógica pura: parsear JSON, normalizar, validar, generar JSON, estado de edición. |
| `src/composables/academico/usePlanesPendientes.js` | **Editar** | Persistir `jsonTexto` en `planesPendientes`. |
| `src/composables/academico/useCatalogoPlanes.js` | **Crear** | Cargar y cachear `planes.json`; exponer planes disponibles. |
| `src/components/ui/EditorCondicion.vue` | **Crear** | Editor recursivo de condiciones AND/OR/año completo. |
| `src/components/ui/SelectMateria.vue` | **Mantener** | Autocomplete de materias para las hojas de la condición. |
| `src/utils/condiciones.js` | **Crear** | Conversión, recorrido y validación pura de condiciones. |
| `src/utils/validacionPlanes.js` | **Editar** | Validaciones adaptadas a condiciones estructuradas. |
| `src/utils/planes.js` | **Editar** | Catálogo desde `planes.json`, `planesDisponibles()`, `validarPlanDetalle()`. |
| `src/utils/validacionUsuarios.js` | **Editar** | Gate de planes disponibles en el alta. |
| `src/composables/usuarios/useImportarUsuarios.js` | **Editar** | Validar detalle de planes y calcular estado inicial. |
| `src/views/coordinacion/CargaMasiva.vue` | **Editar** | Usar `useCatalogoPlanes` antes de importar. |
| `src/router/index.js` | **Hecho** | Ruta `/coordinacion/editor-planes`. |
| `src/components/BarraApp.vue` | **Hecho** | Ítem “Editor de Planes”. |
| `firestore.rules` | **Editar** | `planesPendientes`: exigir `jsonTexto`. |
| `public/planes/planes.json` | **Editar** | Agregar `disponible` a cada plan. |
| `tests/unit/utils/condiciones.spec.js` | **Crear** | Conversión y validación de condiciones. |
| `tests/unit/utils/validacionPlanes.spec.js` | **Crear** | Validaciones del editor. |
| `tests/unit/composables/useEditorPlanes.spec.js` | **Crear** | Importación, edición y round-trip. |
| `tests/unit/composables/useCatalogoPlanes.spec.js` | **Crear** | Fetch, cache y fallback del catálogo. |
| `tests/unit/composables/usePlanesPendientes.spec.js` | **Editar** | Tests para `jsonTexto`. |
| `tests/unit/utils/planes.spec.js` | **Editar** | `planesDisponibles`, resolución sin gate y `validarPlanDetalle`. |
| `tests/unit/utils/validacionUsuarios.spec.js` | **Editar** | Plan no disponible → error. |
| `tests/unit/composables/useImportarUsuarios.spec.js` | **Editar** | Fetch de detalle, estado inicial y aborto. |

No se crean carpetas nuevas en `src/`. La vista vive en `src/views/coordinacion/` y los componentes en `src/components/ui/`.

---

## 2. Composable `useEditorPlanes.js`

### 2.1 Estado reactivo

- `jsonTexto` (string): texto crudo del JSON importado (reemplaza `csvTexto` y `filasCSV`).
- `materias` (mapa por código): `{ [codigo]: MateriaEdit }`.
- `planCodigo`, `planNombre` (string): metadatos del plan.
- `disponible` (boolean): estado del checkbox de publicación.
- `errores` (array): lista de errores de validación.
- `valido` (boolean): resultado de la última validación.
- `hayPregrado` (boolean): si existe alguna materia de año 0.

### 2.2 Funciones principales

1. `importarJSONPlan(texto, { planCodigo, planNombre })` → `JSON.parse`, valida shape, deriva metadatos y construye `materias`.
2. `normalizarMateriaJSON(codigo, datos)` → convierte una materia del JSON a `MateriaEdit`.
3. `agruparPorAnio()` → `{ 0: [...], 1: [...], ... }`.
4. `agregarMateria(anio)` → fila vacía con código `{plan}-{anio}.{n}` (ej. `663-0.1`).
5. `eliminarMateria(codigo)`.
6. `actualizarMateria(codigo, campo, valor)` → nombre, nombre corto, cursada, `equivale_a`.
7. `actualizarCondicion(codigo, 'cursar' | 'aprobar', condicion)`.
8. `validar()` → `{ exito, errores }`.
9. `generarJSONDetalle()` → objeto SIGE.
10. `generarJSONCatalogo()` → **async**; hace merge con `planes.json` existente.
11. `descargarJSON(datos, nombreArchivo)` y `copiarJSON(datos)`.

### 2.3 Modelo de condiciones

Para no perder las condiciones del script, el editor **no** aplana a `string[]`. Usa un árbol normalizado:

```js
// Condición
{ tipo: 'materia', codigo: '663-0.1' }
{ tipo: 'and', hijos: [Condicion, ...] }
{ tipo: 'or',  hijos: [Condicion, ...] }
{ tipo: 'anio', anio: 0 }   // equivale a { anio_completo: 0 }
```

Conversión desde JSON (`condicionDesdeJson`):

| Entrada | Resultado |
|---|---|
| `null` / `undefined` / `''` | `null` |
| `"663-0.1"` | `{ tipo: 'materia', codigo: '663-0.1' }` |
| `["663-0.1", "663-0.2"]` | `{ tipo: 'and', hijos: [...] }` (legacy) |
| `{ and: [...] }` | `{ tipo: 'and', hijos: [...] }` |
| `{ or: [...] }` | `{ tipo: 'or', hijos: [...] }` |
| `{ anio_completo: 1 }` | `{ tipo: 'anio', anio: 1 }` |

Conversión al exportar (`condicionAJson`):

| Entrada | Resultado |
|---|---|
| `{ tipo: 'materia' }` | `"663-0.1"` |
| `{ tipo: 'anio' }` | `{ anio_completo: N }` |
| `and`/`or` con 1 hijo | Se serializa el hijo (se colapsa el grupo). |
| `and`/`or` con más de 1 hijo | `{ and: [...] }` / `{ or: [...] }` |
| `and`/`or` vacío | `null` + error de validación. |

### 2.4 Formato `MateriaEdit`

```js
{
  id: "663-0.1",
  anio: 0,
  nombre: "Audioperceptiva",
  nombre_c: "Audio Pre",
  cursada: "anual",
  correlativas: {
    cursar: {
      tipo: "and",
      hijos: [
        { tipo: "materia", codigo: "663-0.2" },
        { tipo: "or", hijos: [
          { tipo: "materia", codigo: "663-0.3.1" },
          { tipo: "materia", codigo: "663-0.3.2" }
        ] }
      ]
    },
    aprobar: { tipo: "materia", codigo: "663-0.1" }
  },
  equivale_a: ["662-0.1"]
}
```

Los campos `propia` y `cSiuned` se agregan solo si el JSON de origen los trae.

### 2.5 Formato de exportación `{codigo}.json`

```json
{
  "plan": "663",
  "nombre": "663 Profesorado de Música con orientación en Dirección Coral",
  "formato": "objeto",
  "materias": {
    "663-0.1": {
      "id": "663-0.1",
      "anio": 0,
      "nombre": "Audioperceptiva",
      "nombre_c": "Audio Pre",
      "cursada": "anual",
      "correlativas": {
        "cursar": {
          "and": [
            "663-0.2",
            { "or": ["663-0.3.1", "663-0.3.2"] }
          ]
        },
        "aprobar": "663-0.1"
      },
      "equivale_a": ["662-0.1"]
    }
  },
  "disponible": true,
  "revisadoEn": "2026-11-02T12:00:00.000Z",
  "revisadoPor": "uid-del-coordinador"
}
```

- `disponible` es un **espejo** de auditoría; el gate real está en `planes.json` (§6).
- `formato: "objeto"` es informativo; `normalizarPlanJson` no lo exige.
- `revisadoEn` / `revisadoPor` se completan al marcar el plan como disponible.

---

## 3. Componentes

### 3.1 `SelectMateria.vue` (se mantiene)

- Props: `materiasDisponibles`, `excluir`, `placeholder`.
- Emite `select` con el código elegido.
- Se usa como hoja del árbol de condiciones.
- No cambia su comportamiento actual.

### 3.2 `EditorCondicion.vue` (nuevo)

Componente recursivo para editar una condición completa.

**Props:**

- `modelValue` (`Condicion|null`).
- `materiasDisponibles` (`{ codigo, nombre }[]`).
- `tiposPermitidos` (`['materia','and','or','anio']`).
- `profundidad` (number, para el límite visual).

**UI:**

- Nodo `materia`: chip con `código - nombre` + botón quitar.
- Nodo `and`/`or`: caja con borde, etiqueta “Y”/“O”, hijos y botones:
  - `+ Materia`
  - `+ Grupo Y`
  - `+ Grupo O`
  - `+ Año completo`
- Nodo `anio`: selector 0–4 + quitar.
- Acción “Convertir en grupo” sobre una hoja.
- Límite de profundidad: 4 niveles.
- Emite `update:modelValue` con el árbol completo; no muta props.

**Uso en `EditorPlanes.vue`:**

- Dos instancias por materia: `correlativas.cursar` y `correlativas.aprobar`.

---

## 4. Vista `EditorPlanes.vue`

Secciones de arriba a abajo:

### 4.1 Planes guardados

- Lista los JSON de `planesPendientes` (Firestore).
- “Abrir” carga `jsonTexto` en el editor sin volver a subir el archivo.
- “Eliminar” borra el borrador (no el plan publicado).

### 4.2 Importar JSON

- `<input type="file" accept=".json">`.
- Área de texto opcional para pegar JSON.
- Botón “Cargar plan desde JSON”.
- Mensaje: “JSON cargado: X materias, plan Y, Z condiciones complejas”.
- Si el JSON es inválido, se muestra el error de parseo y no se toca el estado actual.

### 4.3 Metadatos del plan

- `Código del plan` (texto, ej. `663`).
- `Nombre del plan` (texto).
- Aviso si el código editado no coincide con el `plan` del JSON importado.

### 4.4 Tabla de materias

- Agrupadas por año (`0` = pregrado).
- Cada fila: código, nombre, nombre corto, cursada, condiciones de cursar y aprobar (`EditorCondicion`), `equivale_a`.
- Botón “Agregar materia” con código autogenerado `{plan}-{anio}.{n}`.
- Botón “Eliminar materia”.

### 4.5 Validaciones

- Códigos de materia sin año reconocible.
- Materias con nombre vacío.
- Condiciones vacías (`and`/`or` sin hijos).
- Correlativas que referencian códigos inexistentes.
- Auto-referencia (una materia que se exige a sí misma).
- Año completo sin materias de ese año.
- `equivale_a` fuera del plan: **warning**, no error (puede ser del plan madre).

### 4.6 Exportar

- “Descargar `planes.json` (catálogo)” → hace merge con el catálogo existente.
- “Descargar `{codigo}.json` (detalle)”.
- “Copiar detalle al portapapeles”.
- Checkbox “Marcar plan como disponible” (`disponible`), con efecto real en el catálogo.

### 4.7 Publicación

Texto de ayuda: “Para publicar, commiteá juntos `{codigo}.json` y `planes.json`. Un push a `main` despliega hosting y reglas.”

---

## 5. Ruta y navegación (hecho)

La ruta ya existe:

```js
{
  path: 'editor-planes',
  name: 'CoordinacionEditorPlanes',
  component: () => import('@/views/coordinacion/EditorPlanes.vue')
}
```

El ítem “Editor de Planes” ya está en `src/components/BarraApp.vue`. No hay cambios pendientes en esta sección.

---

## 6. Catálogo y gating real

### 6.1 `planes.json` como fuente de disponibilidad

```json
{
  "planes": [
    { "codigo": "662", "nombre": "662 Profesorado de Música", "disponible": true },
    { "codigo": "708", "nombre": "708 Técnico Superior en Sonido", "disponible": true },
    { "codigo": "662G", "nombre": "662G Profesorado de Música con orientación en Guitarra", "disponible": false },
    { "codigo": "663", "nombre": "663 Profesorado de Música con orientación en Dirección Coral", "disponible": false }
  ]
}
```

- `disponible: true` solo para planes con detalle revisado y normalizable.
- Migración inicial: `662` y `708` → `true`; `662G` y los 34 restantes → `false`.
- El editor actualiza este archivo al publicar (merge por código).

### 6.2 `useCatalogoPlanes.js`

Singleton con:

- `catalogo` (ref): mapa `{ [codigo]: { codigo, nombre, disponible } }`.
- `cargado` (ref), `error` (ref).
- `cargarCatalogoPlanes()` → `fetch('/planes/planes.json')`, normaliza y llama a `setCatalogoPlanes()` de `src/utils/planes.js`.
- `asegurarCatalogo()` → idempotente; si falla, devuelve error explícito (no se asume disponibilidad).
- `planesDisponibles` (computed): solo `disponible === true`.

Se invoca antes de importar usuarios (`CargaMasiva.vue`) y en `EditorPlanes.vue`. Puede calentarse desde `main.js` sin bloquear el montaje.

### 6.3 Semántica nueva en `src/utils/planes.js`

| Función | Hoy | Nueva |
|---|---|---|
| `catalogoDePlanes()` | Array hardcodeado `PLANES_CON_JSON` | Todos los códigos del catálogo cargado; fallback hardcodeado solo para resolución. |
| `planesDisponibles()` | No existe | Códigos con `disponible: true`; vacío si el catálogo no cargó. |
| `esPlanDisponible(codigo)` | `PLANES_CON_JSON.includes` | `planesDisponibles().includes(codigo)`. |
| `resolverCodigoPlan()` | Resuelve **y** gatea | Solo resuelve contra todos los códigos; el gate se hace aparte. |
| `normalizarPlanJson()` | Valida shape | Igual; no decide disponibilidad. |
| `validarPlanDetalle(codigo)` | No existe | Combina catálogo + detalle → `{ disponible, motivo, plan }`. |

Separar `resolverCodigoPlan` del gate es obligatorio: hoy usa `esPlanDisponible`, así que si se gatea ahí, un usuario existente con `662G` dejaría de normalizarse.

### 6.4 `validarPlanDetalle(codigo)`

1. Verifica que el código esté en `planesDisponibles()`.
2. Hace `fetch('/planes/{codigo}.json')` (con cache en memoria por código).
3. Normaliza con `normalizarPlanJson(json, codigo)`.
4. Devuelve `{ disponible, motivo, plan }`.
5. Si el catálogo dice disponible pero el detalle no normaliza, gana el detalle y se reporta el motivo.

### 6.5 Alta de usuarios

En `src/utils/validacionUsuarios.js`:

- `validarDatosUsuario` y `validarCSVUsuarios` reciben `planesDisponibles` (o usan `planesDisponibles()`).
- `resolverCodigoPlan` resuelve contra todos los códigos.
- Después de resolver, se exige `esPlanDisponible(codigo)`.
- Mensaje: `El plan "X" no está disponible (revisar en el editor de planes)`.

En `src/composables/usuarios/useImportarUsuarios.js`:

1. `await asegurarCatalogo()`.
2. Validar filas contra `planesDisponibles()`.
3. Obtener códigos únicos de plan y `await Promise.all(codigos.map(validarPlanDetalle))` (cacheado).
4. Si un detalle no existe o no normaliza → abortar todo (todo-o-nada).
5. Calcular `estadoPorPlan[codigo] = estadoInicialDePlan(planNormalizado)`:
   - con año 0 → `ingresante`;
   - sin año 0 → `activo`.
6. Pasar `estadoPorPlan` a `construirDocumentoUsuario`.

`construirDocumentoUsuario` deja de hardcodear `'ingresante'`: usa `estadoPorPlan` y cae a `'activo'` solo si no se pasó (con warning).

### 6.6 Migración y riesgos

- `planes.json` debe actualizarse con `disponible` en el **mismo release** que el código de gating. Si el código sale antes, todos los planes quedan bloqueados.
- `662G` sigue no disponible porque su detalle es legacy (`plan: "62G"`).
- La carga masiva hace un fetch por plan único, no por fila; cachear.
- `useUsuarios.js` sigue usando `catalogoDePlanes()` para normalizar usuarios existentes; no se debe gatear ahí.
- Si `planes.json` no carga, `planesDisponibles()` devuelve vacío y el alta falla con error explícito. No se asume disponibilidad.
- Los flujos sincrónicos (`validarDatosUsuario`) deben llamar a `asegurarCatalogo()` antes. Si el catálogo no está cargado, el error debe ser `catálogo de planes no disponible`, no `plan inválido`.

---

## 7. Cambios en la documentación

### 7.1 `docs/modelo-datos.md`

- Agregar `planesPendientes/{codigo}` en “Colecciones implementadas”.
- Documentar:
  - `planes.json` con `disponible`;
  - `validarPlanDetalle()` y el flujo de gating;
  - `correlativas` como string u objeto (`{and}`, `{or}`, `{anio_completo}`);
  - `equivale_a` como `string[]`;
  - `anio` derivado del código si no viene.
- Corregir la afirmación de que `normalizarPlanJson` devuelve `disponible: true` solo cuando el coordinador lo marca: eso ahora lo decide el catálogo.

### 7.2 `docs/contexto.md`

- Agregar `planesPendientes` a las colecciones de soporte.
- Actualizar “Datos estáticos” para mencionar `disponible` y el gate por catálogo.
- Mantener el estado de implementación existente; este plan no cambia E1–E11.

---

## 8. Alcance para febrero 2027 (producción)

### Dentro de alcance (MVP)

- Editor de planes para rol coordinación.
- Importar el JSON del Apps Script.
- Persistir borradores en `planesPendientes` con `jsonTexto`.
- Editar materias y condiciones AND/OR/año completo.
- Validar: año reconocible, nombre, condiciones vacías, referencias inexistentes, auto-referencia.
- Exportar `planes.json` (merge) y `{codigo}.json`.
- Marcar plan como `disponible: true`.
- Gating real en el alta de usuarios.
- Cálculo del estado inicial (`ingresante` / `activo`).
- Agrupar materias por año (0 = pregrado).

### Fuera de alcance (post-febrero 2027)

- Chequeo completo de correlatividades de años 1–4 (se hará gradualmente).
- Uso de `equivale_a` para cálculo automático.
- Cálculo de `por_vencer` / `vencido` / `ingresante → activo`.
- Parseo de texto libre (ya no aplica: el script entrega JSON estructurado).
- Editor visual de condiciones fuera del árbol AND/OR/año.

---

## 9. Preguntas abiertas

### Resueltas

1. **¿Dónde se guardan los borradores?** Firestore `planesPendientes` con `jsonTexto`.
2. **¿Se mantiene CSV?** No. Solo JSON.
3. **¿Cómo se editan las correlativas complejas?** Editor AND/OR completo, con árbol normalizado.
4. **¿Se implementa `disponible`?** Sí, con `planes.json` como fuente de verdad.
5. **¿El código canónico es `materia_id` o `Cod`?** `materia_id` (clave del mapa).
6. **¿Sobrescribir un plan ya publicado?** Sí, con confirmación y merge del catálogo.

### Pendientes menores

1. ¿El editor debe permitir crear un plan nuevo sin JSON previo? Recomendación: sí, con “Agregar materia” y metadatos manuales.
2. ¿Se guarda un historial de versiones del JSON en Firestore? Recomendación: no por ahora; el historial es git.
3. ¿`revisadoPor` guarda uid o email? Recomendación: uid + email en `planesPendientes`; en el detalle publicado, uid.

---

## 10. Checklist de verificación por etapa

| Etapa | Comando / prueba |
|---|---|
| Docs actualizados | Revisar `plan-editor-planes-202611.md`, `modelo-datos.md`, `contexto.md` |
| `condiciones.js` + `EditorCondicion.vue` | `npm run test:unit` (tests de condiciones) y prueba manual del árbol |
| `useEditorPlanes.js` | `npm run test:unit` (importación, round-trip, export) |
| `usePlanesPendientes.js` + rules | Guardar/abrir un JSON; verificar `jsonTexto` y reglas |
| `useCatalogoPlanes.js` + `planes.js` | Catálogo carga, `planesDisponibles()` correcto |
| Gating en alta | Importar CSV con plan disponible y con plan no disponible |
| Estado inicial | Plan con año 0 → `ingresante`; sin año 0 → `activo` |
| Exportar JSON | `normalizarPlanJson` lee el archivo sin errores; round-trip conserva `{and}`/`{or}` |
| Catálogo | Descargar `planes.json` y verificar merge sin perder planes |
| Build | `npm run build` |