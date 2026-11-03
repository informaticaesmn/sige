# Plan: editor de planes compacto (lista + detalle por materia)

> **Estado:** implementado (03/11/2026). Incluye `condicionATexto()`, `ListaMaterias.vue`,
> `EditorMateria.vue`, la integración en `EditorPlanes.vue`, selección por URL
> (`?abrir=...&materia=...`), aviso de cambios sin guardar y vista mobile de una columna.
> **Objetivo:** que abrir un plan no genere una página de decenas de miles de píxeles.
> El plan se resume arriba, las materias se navegan en una lista angosta a la izquierda
> y **el editor completo se aplica a una sola materia a la vez**.
> **Base:** extiende `plan-editor-planes-202611.md`. No cambia el modelo de datos, ni el
> JSON exportado, ni las reglas de Firestore: es un refactor **de presentación**.

---

## 0. Problema y dimensionamiento

`EditorPlanes.vue` renderiza hoy todas las materias del plan en una sola página, y cada
materia incluye **dos** `EditorCondicion` recursivos (cursar y aprobar) más su panel de
comentarios.

| Plan | Materias | Tarjetas con árbol editable |
|---|---|---|
| `662` | **91** | 91 × 2 = 182 editores recursivos |
| `708` | 29 | 58 editores recursivos |

La vista además apila cinco secciones (metadatos, materias, validación, exportación,
comentarios generales). El resultado: para llegar a la validación de un plan de 91 materias
hay que scrollear toda la lista.

**Consecuencia práctica:** revisar un plan es lento, y encontrar "la materia que tiene el
problema" obliga a recorrer visualmente 91 tarjetas.

---

## 1. Alcance

### Entra

- Resumen compacto del plan arriba (código, nombre, estado de revisión, contadores).
- Lista navegable de materias (agrupada por año, con buscador y señales de estado).
- Panel de detalle de **una** materia con toda la funcionalidad actual.
- Validación, exportación y comentarios generales como bloques colapsables.

### No entra

- Cambios en `useEditorPlanes` que alteren el modelo (`materias`, árbol de condiciones, JSON).
- Cambios en Firestore, reglas, `planesPendientes` o la subcolección `comentarios`.
- Publicación a `planesPublicados` (es la Fase 2 de `plan-planes-publicacion-202611.md`).
- Virtual scrolling (ver §10).

---

## 2. Diseño de UI

### 2.1 Layout

```
┌───────────────────────────────────────────────────────────────────┐
│ [Plan: 663 ▾]  Listo para publicar   [Guardar] [Validar] [⋯]        │ ← sticky
├───────────────────────────────────────────────────────────────────┤
│ 663 · Profesorado de Música · 91 materias · 6 años · ✓ 88/91        │ ← resumen
├──────────────────┬────────────────────────────────────────────────┤
│ 🔍 buscar...      │  663-0.1  Audioperceptiva          [Eliminar]  │
│                  │  Nombre [__________]  Corto [____]  Cursada ▾   │
│ AÑO 0 (3)        │  ────────────────────────────────────────────   │
│  663-0.1 ✓ 1C    │  Correlativas para CURSAR:   [árbol]           │
│  663-0.2 ⚠       │  Correlativas para APROBAR:  [árbol]           │
│ AÑO 1 (14)       │  ────────────────────────────────────────────   │
│  663-1.1 ...      │  💬 Comentarios de esta materia (2)             │
│  ...              │                                                 │
├──────────────────┴────────────────────────────────────────────────┤
│ ▸ Validación del plan (abierta solo si hay errores)                │
│ ▸ Comentarios generales del plan                                   │
│ ▸ Exportar                                                         │
└───────────────────────────────────────────────────────────────────┘
```

### 2.2 Resumen compacto (arriba)

Una sola línea con chips, en lugar de la tarjeta actual de metadatos:

- `663` (monoespaciado) + nombre del plan (truncado, editable en popover).
- Estado de revisión con el color que ya existe (`claseEstadoRevision`).
- `91 materias · 6 años`.
- `✓ 88/91` → resultado de la última validación.
- `⚠ 3` → materias con datos incompletos (sin nombre o sin cursada).
- `💬 5` → comentarios abiertos (no resueltos).

"Editar datos del plan" (código, nombre, `disponible`) pasa a un popover/modal, porque son
campos que se tocan una vez, no en cada sesión.

### 2.3 Lista de materias (izquierda)

Fila compacta de ~40 px:

```
663-0.1   Audioperceptiva            1C   ✓   💬2
663-0.2   Instrumento                 —   ⚠
```

Columnas: código (mono), nombre corto con fallback a nombre, badge de cursada, un punto de
alerta si falta nombre/cursada, y contador de comentarios.

- Agrupada por año, con encabezados colapsables (`Año 0 (Pregrado)`, `Año 1`, ...).
- Buscador arriba que filtra por código o nombre (case-insensitive, sin acentos).
- La materia seleccionada queda resaltada y hace scroll a la vista al abrir un plan.
- Navegación con teclado: `↑`/`↓` entre filas, `Enter` abre, `/` enfoca el buscador.
  Reutiliza el patrón de accesibilidad que ya usa `TablaPlanEstudio.vue`
  (`tabindex`, `@keydown.enter`, `@keydown.space.prevent`, `aria-label`).

### 2.4 Detalle de materia (derecha)

Es esencialmente **la tarjeta actual extraída a su propio componente**, con la misma
funcionalidad, más:

- Encabezado con código, nombre y acciones (eliminar, duplicar en otro año si algún día
  se quiere).
- Resumen textual de las correlativas (de `condicionATexto`, ver §5) arriba de cada árbol,
  para leer de un vistazo sin desplegar los grupos.
- Panel de comentarios de esa materia, siempre visible en el detalle en lugar de acordeón.

### 2.5 Bloques colapsables (abajo)

Validación, exportación y comentarios generales dejan de aportar altura permanente. Se
implementan con `<details>` nativo (sin estado ni dependencias nuevas), con la salvedad de
que **validación se abre automáticamente si hay errores**.

---

## 3. Cambios por archivo

### Nuevos

| Archivo | Responsabilidad | Líneas aprox. |
|---|---|---|
| `src/components/ui/ListaMaterias.vue` | Buscador, agrupación por año, filas compactas, emisión de `seleccionar` | ~120 |
| `src/components/ui/EditorMateria.vue` | Detalle editable de una materia (campos + 2 `EditorCondicion` + comentarios) | ~160 |
| `src/components/ui/ResumenPlan.vue` *(opcional)* | Tira de chips del §2.2 | ~60 |

`EditorMateria.vue` es **tonto**: recibe `materia`, `materiasDisponibles`, `comentarios`,
`cargandoComentarios`, `errorComentarios` y emite `actualizar-campo`, `actualizar-condicion`,
`eliminar`, `agregar-comentario`, `resolver-comentario`, `reabrir-comentario`,
`eliminar-comentario`. No importa Firestore ni composables, en línea con `AGENTS.md` §3.

### Modificados

| Archivo | Cambio |
|---|---|
| `src/views/coordinacion/EditorPlanes.vue` | Pasa a orquestador: selector + resumen + `ListaMaterias` + `EditorMateria` + colapsables. Buena parte de su template actual se muda a los componentes nuevos |
| `src/utils/condiciones.js` | Nueva función pura `condicionATexto()` (§5) |
| `src/composables/academico/useEditorPlanes.js` | Solo aditivo: helper `materiasOrdenadas` (array plano ordenado por año y código) para no repetir el `Object.entries` en dos componentes |
| `docs/plan-editor-planes-202611.md` | Nota de que esta vista la reemplaza |

### Sin cambios

`useGestionPlanes`, `useComentariosPlanes`, `usePlanesPendientes`, `firestore.rules`,
`EditorCondicion.vue`, el formato de `planesPendientes` y el JSON exportado.

---

## 4. Estado y comportamiento

- **Selección**: `codigoSeleccionado` es estado local de la vista.
  - Al abrir un plan (`abrirBorrador`): se selecciona la primera materia de la lista ordenada.
  - Al eliminar la materia seleccionada: se selecciona la siguiente (o la anterior si era la última).
  - Al agregar una materia: se selecciona la nueva (hoy se agrega al final del año y no se ve).
- **No se pierde nada al cambiar de materia**: el estado real vive en `materias` del
  composable; el panel solo lo refleja y emite cambios. Esto ya es así hoy.
- **Cambios sin guardar**: agregar `hayCambiosSinGuardar` (comparar contra el último
  `jsonTexto` importado/guardado) y pedir confirmación al cambiar de plan o al salir.
  Hoy cambiar de plan descarta los cambios en silencio, y con el selector sticky arriba
  es más fácil pisarlo sin querer.
- **URL**: mantener `?abrir=663` y sumar `?materia=663-0.1` con `router.replace` al
  seleccionar, para poder compartir un hallazgo puntual entre revisores.
- **Mobile**: una columna; la lista y el detalle se alternan con "← Materias". Se decide
  por breakpoint `lg` (el sidebar aparece recién cuando hay lugar).

---

## 5. `condicionATexto()` — resumen legible de correlativas

Función pura en `src/utils/condiciones.js`:

```js
condicionATexto({ tipo: 'materia', codigo: '663-0.1' })
// → '663-0.1'

condicionATexto({ tipo: 'and', hijos: [A, B] })
// → '663-0.1 y 663-0.2'

condicionATexto({ tipo: 'or', hijos: [A, B] })
// → '663-0.1 o 663-0.2'

condicionATexto({ tipo: 'anio', anio: 1 })
// → 'Año 1 completo'

condicionATexto({ tipo: 'and', hijos: [{ tipo: 'or', hijos: [A, B] }, C] })
// → '(663-0.1 o 663-0.2) y 663-0.5'

condicionATexto(null)
// → 'Sin correlativas'
```

Opciones: `{ nombres: { '663-0.1': 'Audioperceptiva' }, usarNombres: false }` para poder
mostrar nombre en lugar de código en el detalle y código en la lista.

Se usa en tres lugares: fila de la lista, encabezado del detalle y tooltip del árbol.

---

## 6. Tests

| Archivo | Caso |
|---|---|
| `tests/unit/utils/condiciones.spec.js` (existente) | Agregar casos de `condicionATexto`: materia, and, or, anio, anidado con paréntesis, `null` |
| `tests/unit/components/ListaMaterias.spec.js` (nuevo) | Agrupa por año, filtra por código y nombre, emite `seleccionar`, marca faltantes |
| `tests/unit/components/EditorMateria.spec.js` (nuevo) | Renderiza campos y dos `EditorCondicion`; emite `actualizar-campo`, `actualizar-condicion` y `eliminar`; muestra el panel de comentarios |

No hay tests de la vista `EditorPlanes.vue` hoy, así que el refactor no rompe tests
existentes. Los tests de `useEditorPlanes` siguen válidos porque el composable no cambia
su contrato.

> Nota: la suite unitaria corre con `isolate: true` desde el fix de v0.8.28, así que los
> tests nuevos de componentes no arrastran contaminación de otros specs.

---

## 7. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Perder la referencia visual al editar (antes se veían todas las materias juntas) | El resumen de correlativas de cada materia visible en la fila (`condicionATexto`) y el contador de comentarios |
| Regresión funcional al mover tanto template | `EditorCondicion.vue` no se toca; `EditorMateria` es extracción literal de la tarjeta actual |
| Planes con muchas materias por año (hasta ~20) | El sidebar scrollea independiente del detalle |
| El usuario espera ver "todo el plan" al imprimir o revisar | Los bloques colapsables se pueden abrir todos; evaluar un "Expandir todo" si aparece la necesidad |

---

## 8. Orden de implementación

1. `condicionATexto()` + tests (aislado, sin UI).
2. `ListaMaterias.vue` + tests, todavía sin usarse.
3. `EditorMateria.vue` + tests (extracción de la tarjeta actual).
4. `EditorPlanes.vue`: conectar los componentes, resumen y colapsables.
5. Selección por URL, `hayCambiosSinGuardar`, comportamiento mobile.
6. Pasar `npm run lint`, `npm run test:unit`, `npm run build`.

Cada paso deja el repo verde; se puede cortar en cualquier punto.

---

## 9. Criterios de aceptación

- Abrir el plan `662` (91 materias) renderiza **un** detalle editable, no 91.
- Se puede llegar a cualquier materia en ≤ 2 acciones (buscador o lista).
- Editar nombre, cursada y ambas correlativas funciona igual que hoy.
- Eliminar/agregar materia actualiza la lista y la selección sin perder el foco.
- Los comentarios por materia y los generales siguen funcionando.
- El JSON exportado es **byte a byte** el mismo que antes del refactor para un plan sin cambios.
- Validación visible sin scrollear el plan completo.
- Mobile usable en una columna.