# Plan: Editor/Revisor de Planes de Estudio (Rol Coordinación)

> **Estado:** borrador (02/11/2026). Sin código escrito aún.
> **Objetivo:** que los coordinadores revisen, validen y exporten planes de estudio desde CSV de Google Sheets antes de incluirlos como archivos JSON estáticos en `public/planes/`.
> **Producción:** febrero 2027, con foco en año 0 (pregrado) y listado completo de materias. Correlatividades y equivalencias pueden quedar incompletas inicialmente y completarse durante 2027.

---

## 0. Contexto y decisiones de diseño

### CSV de Google Sheets: problemas conocidos

El CSV adjunto (ejemplo de plan `663`) tiene las siguientes limitaciones, ya identificadas:

| Problema | Origen | Cómo lo resuelve el editor |
|---|---|---|
| Columnas duplicadas al final | Las primeras columnas son para edición humana; las finales (no visibles) traen los códigos ya resueltos | El editor prioriza las columnas finales (`materia_id`, `nombre`, `nombre_c`, `cursada`, `correlativas_cursar`, `correlativas_aprobar`) como fuente de verdad. Las primeras se ignoran o se usan solo como referencia visual. |
| `Cod` corto vs `materia_id` largo | `Cod`=`0.1`, `materia_id`=`662-00-01`. No siempre coinciden | El código canónico del JSON de SIGE es `materia_id` (formato largo con prefijo de plan). Si falta `materia_id`, se construye como `{plan}-{Cod}`. |
| Correlativas por nombre, no por código | `CodC`/`CodA` contienen nombres (`GUITARRA I`), no códigos | **No se escriben a mano.** El editor provee un desplegable/autocomplete que lista todas las materias del propio plan. Al seleccionar, se completa automáticamente código y nombre. |
| Condiciones complejas en texto libre | `ELEMENTOS DEL ANALISIS MUSICAL I-MUSICA DE CAMARA I - EXPRESION CORPORAL` | El formato de SIGE usa objetos estructurados (`{and: [...]}`, `{or: [...]}`, `{anio_completo: N}`). El editor no intenta parsear el texto libre; el coordinador arma la condición desde la UI seleccionando materias del desplegable y eligiendo el tipo de condición (AND/OR/año completo). |
| Filas sin código | `anual,663,,,,...` | Se detectan como errores de validación. El plan no se exporta mientras existan filas sin código. |
| `cursada` inconsistente | `anual`, `1C`, `2C`, vacío | Se normaliza a los valores válidos de SIGE (`anual`, `1C`, `2C`). Vacío se deja como `null`. |
| `equivale_a` con código de plan madre | `662-00-01` | Campo informativo en la UI; no es obligatorio para la exportación inicial (foco año 0). Se guarda como campo opcional en el JSON detalle. |

### ¿CSV en revisión o JSON directo?

**Sí, es conveniente y necesario hostear CSVs "en revisión".**

Razones:
1. Varios planes tienen correlatividades complejas que requerirán varias sesiones de revisión.
2. La producción es febrero 2027; no es realista revisar todos los años de todos los planes antes de esa fecha.
3. El foco inicial es año 0 (pregrado) + listado completo de materias por plan. Las correlativas de años superiores pueden completarse durante 2027.

**Estrategia:**
- `public/planes/pendientes/`: carpeta temporal para CSVs de planos en revisión (no se leen desde la app de estudiante, solo desde el editor).
- `public/planes/{codigo}.json`: solo se publica cuando el coordinador marca el plan como "revisado y exportado".
- `public/planes/planes.json`: catálogo oficial. Un plan aparece aquí solo cuando su JSON detalle existe y está marcado como disponible.
- El editor lee el CSV desde `pendientes/`, permite editar, valida, y exporta a `public/planes/{codigo}.json` + actualiza `planes.json`.

---

## 1. Estructura de archivos

| Archivo | Acción | Propósito |
|---|---|---|
| `src/views/coordinacion/EditorPlanes.vue` | **Crear** | Vista principal: importar CSV, editar materias, validar, exportar JSON. |
| `src/composables/academico/useEditorPlanes.js` | **Crear** | Lógica pura: parsear CSV, normalizar, validar, generar JSON, estado de edición. |
| `src/components/ui/SelectMateria.vue` | **Crear** | Desplegable/autocomplete para seleccionar correlativas (muestra "código - nombre"). |
| `src/utils/validacionPlanes.js` | **Crear** | Funciones puras de validación: códigos duplicados, correlativas inexistentes, año 0, filas sin código. |
| `src/router/index.js` | **Editar** | Agregar ruta hija `/coordinacion/editor-planes` con meta `role: 'coordinacion'`. |
| `src/components/BarraApp.vue` o `src/layouts/CoordinacionLayout.vue` | **Editar** | Agregar ítem de menú "Editor de Planes" visible solo para rol coordinación. |
| `docs/modelo-datos.md` | **Editar** | Agregar sección sobre formato de JSON de planes, campos `correlativas` estructurados, campo opcional `equivale_a`, y estado de disponibilidad del plan. |

No se crean carpetas nuevas en `src/`. La vista vive en `src/views/coordinacion/` junto a `CargaMasiva.vue` y `TableroC.vue`.

---

## 2. Composable `useEditorPlanes.js`

Estado reactivo:
- `csvTexto` (string): texto crudo del CSV importado.
- `materias` (mapa por código): objeto interno de edición `{ [codigo]: MateriaEdit }`.
- `planCodigo`, `planNombre` (string): metadatos del plan.
- `errores` (array): lista de errores de validación.
- `valido` (boolean): resultado de la última validación.
- `jsonCatalogo` (object): `{ planes: [{codigo, nombre}] }` listo para `planes.json`.
- `jsonDetalle` (object): `{ plan, nombre, materias: {...} }` listo para `{codigo}.json`.

Funciones principales:

1. `importarCSV(texto)` → parsea el CSV, prioriza columnas finales (`materia_id...`), construye `materias` como mapa, detecta `planCodigo` de la columna `Plan`.
2. `normalizarMateria(fila)` → convierte una fila del CSV a `MateriaEdit`:
   - `id`: código canónico (`materia_id` o construido `{plan}-{Cod}`).
   - `anio`: extraído del código (`00`/`0` = pregrado).
   - `nombre`, `nombre_c`, `cursada`, `equivale_a`, `propia`, `cSiuned`.
   - `correlativas`: `{ cursar: [], aprobar: [] }` (arrays de códigos, llenados desde el desplegable).
3. `agruparPorAnio()` → devuelve `{ 0: [...], 1: [...], 2: [...], ... }`.
4. `tienePregrado()` → true si existe alguna materia con `anio === 0`.
5. `validar()` → retorna `{ exito, errores }`: códigos duplicados, correlativas que referencian códigos inexistentes, filas sin código.
6. `generarJSONCatalogo()` → array para `planes.json`.
7. `generarJSONDetalle()` → objeto para `{codigo}.json` con formato exacto de SIGE.
8. `exportarJSON(nombreArchivo)` → descarga archivo JSON o copia al portapapeles.

Formato `MateriaEdit` (interno del editor):
```js
{
  id: "663-00-01",           // código canónico
  anio: 0,                   // 0 = pregrado
  nombre: "Audioperceptiva (orientaciones)",
  nombre_c: "Audio orientaciones",
  cursada: "anual",          // anual | 1C | 2C | null
  correlativas: {            // estructurado, no texto libre
    cursar: ["663-00-02"],   // array de códigos
    aprobar: []
  },
  equivale_a: "662-00-01",   // opcional, código del plan madre
  propia: false,
  cSiuned: false
}
```

Formato de exportación `{codigo}.json` (formato SIGE, objeto):
```js
{
  plan: "663",
  nombre: "663 Profesorado de Música con orientación en Dirección Coral",
  formato: "objeto",
  materias: {
    "663-00-01": {
      id: "663-00-01",
      anio: 0,
      nombre: "Audioperceptiva (orientaciones)",
      nombre_c: "Audio orientaciones",
      cursada: "anual",
      correlativas: {
        cursar: ["663-00-02"],
        aprobar: []
      },
      equivale_a: "662-00-01",
      propia: false,
      cSiuned: false
    }
  },
  disponible: false,         // se marca true solo cuando el coordinador lo revisa
  revisadoEn: null,          // Timestamp
  revisadoPor: null          // uid
}
```

---

## 3. Componente `SelectMateria.vue`

- Props: `valor` (código seleccionado), `materiasDisponibles` (array de `{ codigo, nombre }`), `emit`.
- Template: `<select>` con `<option>` para cada materia, mostrando `"código - nombre"`.
- Opcional: `<input>` con `<datalist>` para autocomplete si hay muchas materias.
- Al seleccionar, emite `update:modelValue` con el código limpio.
- Usado en el editor para elegir `correlativas.cursar` y `correlativas.aprobar` de cada materia.
- Evita errores de tipeo y códigos inexistentes.

---

## 4. Vista `EditorPlanes.vue`

Secciones (de arriba a abajo):

### 4.1 Importar CSV
- `<input type="file" accept=".csv">` o área de texto para pegar CSV.
- Botón "Cargar plan desde CSV".
- Mensaje de éxito: "CSV cargado: X materias detectadas, plan Y".

### 4.2 Metadatos del plan
- Campo `Código de plan` (texto, ej. `663`). Validar que no exista ya en `planes.json` o que esté marcado para sobrescribir.
- Campo `Nombre del plan` (texto, ej. `663 Profesorado de Música con orientación en Dirección Coral`).

### 4.3 Tabla de materias
- Agrupadas por año (0 = pregrado, 1, 2, 3, 4...).
- Cada fila: código, nombre, nombre corto, cursada, correlativas de cursar (SelectMateria), correlativas de aprobar (SelectMateria), equivalente en plan madre.
- Botón "Agregar materia" (fila vacía con código autogenerado `{plan}-{anio}.{n}`).
- Botón "Eliminar materia" por fila.

### 4.4 Validaciones
- Lista de errores (códigos duplicados, correlativas inexistentes, filas sin código).
- Botón "Validar".
- Indicador visual: "Plan válido para exportar" / "Plan con errores".

### 4.5 Exportar
- Botón "Descargar `planes.json`" (actualiza el catálogo).
- Botón "Descargar `{codigo}.json`" (detalle del plan).
- Botón "Copiar al portapapeles".
- Checkbox "Marcar plan como disponible" (establece `disponible: true` en el JSON detalle y agrega a `planes.json`).

---

## 5. Ruta en `src/router/index.js`

Dentro del bloque `/coordinacion` (ruta padre con `meta: { requiresAuth: true, role: 'coordinacion' }`):

```js
{
  path: '/coordinacion',
  component: () => import('@/layouts/CoordinacionLayout.vue'),
  meta: { requiresAuth: true, role: 'coordinacion' },
  children: [
    { path: '', name: 'CoordinacionTablero', component: () => import('@/views/coordinacion/TableroC.vue') },
    { path: 'carga', name: 'CoordinacionCarga', component: () => import('@/views/coordinacion/CargaMasiva.vue') },
    { path: 'editor-planes', name: 'CoordinacionEditorPlanes', component: () => import('@/views/coordinacion/EditorPlanes.vue') }
  ]
}
```

La meta de auth y role se hereda del padre; no es necesario repetirla en la hija.

---

## 6. Navegación

Revisar `src/components/BarraApp.vue` y `src/layouts/CoordinacionLayout.vue`:
- Si `BarraApp.vue` renderiza un menú dinámico según el rol activo, agregar ítem "Editor de Planes" que enlace a `CoordinacionEditorPlanes` (ruta `/coordinacion/editor-planes`), visible solo cuando `rolActivo === 'coordinacion'`.
- Si el menú está en `CoordinacionLayout.vue`, agregar el ítem ahí.

---

## 7. Cambios en `docs/modelo-datos.md`

Agregar sección sobre el formato de los JSON de planes y el flujo de revisión:

### Nuevos campos en `public/planes/{codigo}.json`

| Campo | Tipo | Descripción |
|---|---|---|
| `disponible` | boolean | `true` solo cuando el coordinador ha revisado y exportado el plan. `false` = en revisión o bloqueado. |
| `revisadoEn` | Timestamp | Fecha de la última revisión. |
| `revisadoPor` | string | uid del coordinador que revisó. |
| `materias[].correlativas.cursar` | string[] | Códigos de materias que deben cursarse simultáneamente (AND por defecto). |
| `materias[].correlativas.aprobar` | string[] | Códigos de materias que deben aprobarse antes. |
| `materias[].equivale_a` | string | Código de materia equivalente en el plan madre (opcional). |
| `materias[].propia` | boolean | Indica si la materia es propia del plan o compartida. |
| `materias[].cSiuned` | boolean | Campo de la planilla original, se conserva por referencia. |

### Estado de disponibilidad de planes

Un plan está **disponible** para alta de usuarios solo cuando:
1. Existe `public/planes/{codigo}.json`.
2. `normalizarPlanJson` retorna `disponible: true`.
3. El código está en `public/planes/planes.json` (catálogo).
4. `disponible: true` en el JSON detalle (marcado por el coordinador).

Hoy (30/10/2026): solo `662` y `708` cumplen todo. `662G` está en el catálogo pero su JSON no es usable. Los 34 planes restantes no tienen JSON.

---

## 8. Alcance para febrero 2027 (producción)

### Dentro de alcance (MVP)
- Editor de planes para rol coordinación.
- Importar CSV desde `public/planes/pendientes/`.
- Validar: códigos duplicados, correlativas inexistentes, filas sin código, año 0 detectado.
- Exportar `planes.json` y `{codigo}.json`.
- Marcar plan como `disponible: true`.
- Desplegable para seleccionar correlativas (no escritura manual).
- Agrupar materias por año (0 = pregrado).

### Fuera de alcance (post-febrero 2027, durante 2027)
- Chequeo completo de correlatividades de años 1-4 (se hará gradualmente).
- Equivalencias con plan madre (`equivale_a` se guarda pero no se usa para cálculo).
- Cálculo automático de `por_vencer`/`vencido`/`ingresante → activo` (ya fuera de alcance del plan de usuarios).
- Parseo automático de condiciones complejas (AND/OR/año completo) desde texto libre del CSV.

---

## 9. Preguntas abiertas

1. **¿Dónde se hostean los CSV en revisión?** ¿`public/planes/pendientes/` o un bucket de Storage privado? Recomendación: `public/planes/pendientes/` por simplicidad durante el desarrollo, mover a Storage si hay datos sensibles.
2. **¿El código canónico es `materia_id` o `Cod`?** Recomendación: `materia_id` (formato largo `662-00-01`) porque es el que usa el formato actual de los JSON (`662-0.1`, `662-00-01`).
3. **¿Sobrescribir un plan ya publicado?** Si un plan ya está en `planes.json` y disponible, ¿se permite reexportar desde CSV? Recomendación: sí, pero con confirmación y versión de respaldo.
4. **¿`disponible: false` bloquea la carga de usuarios?** Sí, `esPlanDisponible` en `planes.js` ya lo impide. El editor es quien pasa un plan de `false` a `true`.

---

## 10. Checklist de verificación por etapa

| Etapa | Comando / prueba |
|---|---|
| EditorPlanes.vue + useEditorPlanes.js | `npm run test:unit` (nuevos tests del editor), `npm run build` |
| SelectMateria.vue | Prueba manual: seleccionar materia, se completa código y nombre |
| Router | Navegar a `/coordinacion/editor-planes` como coordinador; acceso denegado para otros roles |
| BarraApp / CoordinacionLayout | Ítem "Editor de Planes" visible solo para coordinación |
| Exportar JSON | Archivo descargable con formato exacto de SIGE; `normalizarPlanJson` lo lee sin errores |
| modelo-datos.md | Sección de formato JSON y disponibilidad agregada |
