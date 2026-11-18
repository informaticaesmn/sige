# P0b — Plantilla 662X, generación por letra y exportación validada

> 18/11/2026. **VERIFICADO** = leído en archivo:línea; **SUPUESTO** = a confirmar.
> Alcance: completar el editor para planes con letra y cerrar la exportación validada.
> El editor "con requisitos" ya está hecho en P0 (E1-E3): no se replanifica. Depende
> de **P0-E5** (datos): requisitos de la plantilla y equivalencias corregidas. Sin esos
> datos la generación aborta por diseño. Referencias: `decisiones-y-planes-sige.md` §5,
> `P0-plan-modelo-requisitos.md` e `informe-auditoria-planes.md`.

## 1. Estado verificado
- Editor de requisitos: `EditorRequisitos.vue` montado en `EditorPlanes.vue:383-393`;
  agregar/editar/eliminar requisitos y candidatos ya funciona. Validación agregada en
  `validarPlan` (`validacionPlanes.js:186`) y gate de exportación por plan en
  `useEditorPlanesVista.js:543-573`.
- Plantilla: `662x.json` declara `"plan": "662Letra"`, `"esPlantilla": true`, 72 materias
  con prefijo `662*` y **sin** `requisitos` (líneas 1-4; no hay clave en el archivo).
- Catálogo: `planes.json` tiene 29 entradas; las 18 letras `662A`…`662Q` (con Ñ) están en
  L9-97, todas con `disponible: false`; `662x` no figura en el archivo (grep sin coincidencias).
- Generación por letra: **no existe**. `662Letra` solo se usa para detectar plantilla
  (`useEditorPlanes.js:202`).
- `exportarJSONValidado`: **no existe** en `src/` (grep).
- Round-trip de la plantilla: `generarJSONDetalle` no emite `esPlantilla`
  (`useEditorPlanes.js:645-684`) y `agregarMateria` usa `planCodigo` como prefijo (`269`),
  que en la plantilla es `662Letra`, no `662*`.
- La vista no expone `esPlantilla` (`useEditorPlanesVista.js:601-690`).

## 2. Alcance
### Entra
1. Tabla de las 18 letras y núcleo puro de generación (una función, testeable sin Vue).
2. `exportarJSONValidado` con gate todo-o-nada sobre los 18 planes.
3. Panel de plantilla en el editor: resumen, confirmación y descarga.
4. Round-trip correcto de la plantilla y planes generados de solo lectura.
5. `modelo-datos.md` al día con el formato generado.

### No entra
- Cargar los requisitos de `662x` ni corregir equivalencias: es P0-E5 (datos).
- Publicar, cambiar `disponible` en `planes.json` o escribir en `public/planes/`.
- Escribir planes generados en Firestore: se descargan y se copian a mano.
- `parametros` (sigue fuera del editor, igual que en P0).
- Diff contra JSON ya publicados: primera regeneración, posterior a P0b.

## 3. Diseño
### 3.1 Contrato de generación
- Plantilla canónica: `{ clave: '662x', plan: '662Letra', prefijo: '662*' }`.
- Se remapea **solo** lo que empieza con `662*`: claves de `materias`, `id`,
  `correlativas` (recursivo, preservando `and`/`or`/`anio_completo`/arrays) y `equivale_a`,
  más `requisitos[].candidatos`. Los códigos `662-…` son equivalencias al plan madre y se
  conservan; `requisito.id` (`R-0-01`) no cambia.
- Cada letra puede declarar `renombres` por sufijo (`'1.1' → { nombre, nombre_c }`). Por
  defecto vacío: qué materias llevan el instrumento en el nombre es dato de Coordinación.
- Cada plan generado lleva: `plan: '662A'`, `nombre: 'Plan 662A'`, `formato: 'objeto'`,
  `disponible: false`, `revisadoEn/Por: null`, sin `esPlantilla`, y los metadatos
  `generadoDesde: '662x'`, `versionPlantilla`, `generadoEn`, `generadoPor`.
- `versionPlantilla` = `actualizadoEn` (ISO) del borrador guardado. Se relee la plantilla al
  generar (1 lectura) para no versionar un estado sin guardar.

### 3.2 Gates (todo-o-nada)
- **Generar** exige: `esPlantilla`, plantilla guardada, `estadoRevision === 'listo_para_publicar'`,
  `requisitos` no vacíos y `validarRequisitos` sin errores.
- **Exportar** exige para cada uno de los 18: `validarPlan`, `validarRequisitos` estricto (no
  `permitirAusente`) y `normalizarPlanJson(plan, codigo).disponible`. Si uno falla, no se
  descarga ninguno.
- Códigos permitidos: `catalogoDePlanes()` (las 18 ya existen en `planes.json`).
- Descarga: 18 `.json` con `descargarJSON` (`useEditorPlanes.js:691-701`). El navegador pide
  permiso de descargas múltiples una vez. Sin ZIP ni dependencias nuevas.

## 4. Etapas
### E1 — Tabla de letras y generación pura
- **Objetivo:** generar los 18 JSON desde la plantilla, sin Vue ni Firestore.
- **Archivos:** `src/utils/planesLetras.js` (nuevo) y `tests/unit/utils/planesLetras.spec.js` (nuevo).
- **Pasos:** exportar `PLANTILLA_662X`; exportar `LETRAS_662` con `{ codigo, letra, instrumento,
  activo }` (instrumento transcripto de `planes.json`, sin parsear el nombre; `activo: true`);
  exportar `generarPlanesDePlantilla({ plantilla, letras, version, generadoPor, generadoEn })`
  → `{ exito, errores, planes }` con las reglas de §3.1 y acumulando todos los errores;
  exportar `resumenDePlan(plan)` → `{ codigo, materias, requisitos, espaciosRequeridos }`
  para la tabla de la UI.
- **No se toca:** JSON publicados, editor, Firestore, `planes.json`.
- **Lecturas:** 0.
- **Verificación:** `npx vitest run tests/unit/utils/planesLetras.spec.js`. Casos: plantilla real
  662x → 18 códigos, ningún `662*` remanente, equivalencias `662-…` intactas y error por falta
  de requisitos; plantilla sintética con requisitos → los 18 pasan `validarPlan`; remapeo de
  `correlativas` anidadas y `candidatos`; `renombres` aplicado; letra duplicada o fuera del
  catálogo → aborta todo.

### E2 — `exportarJSONValidado`
- **Objetivo:** una sola función de exportación que valide los 18 antes de descargar.
- **Archivos:** `src/composables/academico/useEditorPlanesVista.js` y su spec.
- **Pasos:** agregar `validarPlanesParaExportar(planes)` con los gates de §3.2 (incluye
  catálogo); agregar `exportarJSONValidado(planes)` que, si hay errores, escribe el resumen en
  `mensajeExport` y no descarga nada; si pasa, descarga `${codigo}.json` de cada plan y deja
  `mensajeExport` con el total. No reemplaza `exportarDetalle`/`copiarDetalle`.
- **No se toca:** editor, util de generación, Firestore, JSON.
- **Lecturas:** 0.
- **Verificación:** `npx vitest run tests/unit/composables/useEditorPlanesVista.spec.js`: un
  plan inválido → 0 descargas y mensaje; 18 válidos → 18 descargas; código fuera del catálogo
  → 0 descargas.

### E3 — Panel de plantilla en el editor
- **Objetivo:** generar y exportar las 18 letras desde `EditorPlanes.vue` con confirmación.
- **Archivos:** `useEditorPlanesVista.js`, `src/views/coordinacion/EditorPlanes.vue` y el spec
  del composable.
- **Pasos:** exponer `esPlantilla`; agregar `generarPlanes()` (gates de §3.2, `cargarBorrador`
  para releer la plantilla, abortar si el `jsonTexto` guardado difiere de `jsonActual`, parsear
  y llamar a E1; guardar `planesGenerados` / `erroresGeneracion`); agregar
  `exportarPlanesGenerados()` → E2; en el bloque "Exportar archivos JSON", si `esPlantilla`,
  mostrar tabla con `resumenDePlan`, botón "Generar 18 planes", confirmación explícita y
  errores/advertencias. Ocultar la exportación por plan.
- **No se toca:** generación pura (E1), gate de exportación por plan, Firestore (solo lee).
- **Lecturas:** 1 (`planesPendientes/{662Letra}` al generar).
- **Verificación:** spec con `cargarBorrador` mockeado: plantilla no guardada, no `listo`,
  sin requisitos o con cambios sin guardar → error y 0 descargas; plantilla válida → 18 planes
  y 18 descargas. `npm run build` para la vista.

### E4 — Round-trip de plantilla y generados de solo lectura
- **Objetivo:** editar/guardar la plantilla sin perder su marca ni su prefijo; evitar editar un
  plan generado.
- **Archivos:** `src/composables/academico/useEditorPlanes.js`, `EditorPlanes.vue` y specs.
- **Pasos:** `generarJSONDetalle` emite `esPlantilla: true` cuando corresponde; `agregarMateria`
  usa `662*` como prefijo si es plantilla; `importarJSONPlan` conserva `generadoDesde` y
  `generarJSONDetalle` lo vuelve a emitir; `soloLectura` = hay `generadoDesde`, que bloquea
  `guardarBorradorEnNube` y `marcarListo` y muestra un aviso con "Desvincular de la plantilla"
  (confirmación + quitar `generadoDesde`).
- **No se toca:** generación, exportación, Firestore, JSON publicados.
- **Lecturas:** 0.
- **Verificación:** `npx vitest run tests/unit/composables/useEditorPlanes.spec.js` y
  `useEditorPlanesVista.spec.js`: importar→exportar 662x conserva `esPlantilla`; materia nueva
  nace `662*-…`; plan con `generadoDesde` no se guarda ni se marca listo hasta desvincular.

### E5 — Documentación y verificación final
- **Objetivo:** dejar `modelo-datos.md` y las decisiones al día, y correr la suite completa.
- **Archivos:** `docs/modelo-datos.md`, `docs/decisiones-y-planes-sige.md`.
- **Pasos:** documentar en §9.5/§9.8 el formato generado (§3.1), los gates (§3.2) y que la
  plantilla no es asignable; agregar `esPlantilla` y los metadatos a la tabla del JSON;
  corregir el estado de `requisitos` (ya lo declaran los 7) y la tabla §9.6 (663-666 están
  `disponible: true` en `planes.json`, no `false`); marcar P0b como hecho y enlazar este plan.
- **No se toca:** código, JSON, `planes.json`.
- **Lecturas:** 0.
- **Verificación:** `npm run test:unit`, `npm run build` y revisión de las citas del doc.

## 5. Preguntas abiertas
1. ¿Qué materias cambian de nombre por letra, además del prefijo? El mecanismo `renombres`
   existe, pero los datos los define Coordinación.
2. ¿`2.9`/`2.10` (complementario Piano/Guitarra) aplican igual a letras que no son piano ni
   guitarra, o se renombran?
3. ¿Los 18 planes quedan `disponible: false` hasta la revisión de 2027, o se habilitan al
   publicar los JSON?
4. ¿La primera regeneración (cuando ya existan los 18 archivos) exige diff contra el publicado
   antes de descargar? Hoy no hay archivos que comparar.

## 6. Decisiones para mí
1. Aprobar los metadatos `generadoDesde`, `versionPlantilla`, `generadoEn`, `generadoPor` en
   cada JSON generado, sin colección de registro nueva.
2. Aprobar que la versión sea el `actualizadoEn` del borrador guardado (no un número manual).
3. Aprobar los gates: plantilla guardada + `listo_para_publicar` + requisitos válidos;
   exportación todo-o-nada.
4. Aprobar 18 descargas individuales (sin ZIP ni dependencias nuevas).
5. Aprobar `disponible: false` en los generados y no tocar `planes.json`.
6. Aprobar el modo solo lectura para planes con `generadoDesde`, con "Desvincular".

## 7. Resumen
- P0b = tabla de letras, generación pura, exportación validada y panel en el editor; el editor
  de requisitos ya está hecho.
- La generación remapea solo `662*` y conserva las equivalencias al plan madre `662-…`.
- Todo-o-nada: no se descarga nada si un plan o la plantilla no pasan los gates.
- Depende de P0-E5 (requisitos de la plantilla y equivalencias): sin eso, aborta.
- Quedan 4 preguntas de datos y 6 decisiones para aprobar antes de implementar.
