Reemplazado por plan-modelo-requisitos.md; su afirmación sobre requisitos es incorrecta

# P0 — Requisitos del plan, avance y condicionalidad de cursada
> 10/11/2026. Solo lectura de código y JSON. **VERIFICADO** = leído en
> archivo/línea; **SUPUESTO** = a confirmar.

## 1. Estado verificado
### 1.1 Inventario: el pedido dice 3, hoy hay 7
`public/planes/` tiene `662`, `708`, `662x`, `663`, `664`, `665` y `666`. Las
decisiones (§5, 76-80) dicen “3: 662, 708 y 662G”, pero **`662G.json` no
existe** y sí hay cinco archivos nuevos. **SUPUESTO:** el alcance son los 7; si
querés limitarlo a 3, falta decir cuáles.

| Archivo | `requisitos` | `equivale_a` | Observación |
|---|---|---|---|
| `662.json:1-4` | no | 0 | 91 materias; el más completo |
| `708.json:1-4` | no | 0 | 29 materias; sin optativos por nombre |
| `662x.json:1-4` | no | 43 | plantilla; `plan: "662Letra"` (línea 2), sin `esPlantilla` |
| `663.json:1-4` | no | 12 | clave `"663-"` vacía (línea 128) |
| `664.json:1-4` | no | 12 | `or` de 7 EDI en `1.1` (129-147) |
| `665.json:1-4` | no | 12 | equivalencias colgadas (54-57) |
| `666.json:1-4` | no | 12 | `or` de 7 EDI en `1.1` (132-140) |

Ninguno declara `anio`: se deriva del código (`src/utils/planes.js:77-100`).
`planes.json` lista 29 códigos; solo `662` (4-6) y `708` (119-121) están `disponible: true`. No existe `662X`/`662x` en el catálogo.
### 1.2 Casos reales de conmutables y optativos
- **662, año 0:** `or` de correlativas en `0.3.1/0.3.2` (69-74),
  `0.5.1/0.5.2/0.5.3` (77-82) y `0.6.1/0.6.2/0.6.3` (84-89). **Años 1 y 3:**
  `1.2.1/1.2.2` y `1.3.1/1.3.2` (121-364); `3.2.1/3.2.2`, `3.4.1` a `3.4.5` y
  `3.6.1` a `3.6.5` (2043-2060). No cruzan años.
- **662, optativos:** cinco “Seminario optativo”: `4.13.1` (2075), `4.13.2`
  (2122), `4.13.3` (2169), `4.16.1` (2246) y `4.16.2` (2293). Sin mínimo.
- **663-666:** los EDI son materias sueltas, sin `minimo` ni grupo. En 664-666
  `1.1` exige uno de siete EDI (`664.json:129-147`; análogos en 665/666),
  mientras `663-1.1` no tiene correlativas.
- **662x:** EDI sueltos, auto-equivalencias (`662x.json:65`) y equivalencias
  colgadas (86-95). **663-666** también apuntan a códigos propios inexistentes
  (`663.json:48`; `665.json:54-57`).
- **Conclusión:** solo hay alternativas implícitas en `correlativas` y nombres
  “optativo”. Ningún JSON declara `minimo`, `candidatos` ni requisitos.
## 2. Formato propuesto de `requisitos`
Clave nueva de nivel plan, al lado de `materias`:
```json
"requisitos": [
  { "id": "R-0.1", "minimo": 1, "candidatos": ["662-0.1"], "etiqueta": "Pregrado" },
  { "id": "R-0.3", "minimo": 1, "candidatos": ["662-0.3.1", "662-0.3.2"] },
  { "id": "R-4.13", "minimo": 1, "candidatos": ["662-4.13.1", "662-4.13.2", "662-4.13.3"] }
]
```

- `id` único y estable; `etiqueta` opcional. `minimo` entero, `0 < minimo <=
  candidatos.length`. Obligatorio = grupo de 1; conmutable = varios con mínimo
  1; optativo = N con mínimo M. “1 obligatorio más 2 optativos” son **dos**
  requisitos (grupo de 1 + grupo con mínimo 2).
- **Partición:** cada materia pertenece a exactamente un requisito. Así
  `sum(minimo)` es el total de créditos y un espacio no es obligatorio y
  optativo a la vez. `tipo` se deriva; `horas` no se agrega hasta resolver §13.
- **Compatibilidad:** es aditiva. El lector crudo la conserva
  (`usePlanesEstudio.js:16-32`), pero `normalizarPlanJson` descarta `requisitos`
  y `equivale_a` (`src/utils/planes.js:135-144`) y el editor reconstruye las
  materias sin campos desconocidos (`useEditorPlanes.js:375-398`). Sin corregir
  eso, el editor **borra** los requisitos al guardar.
### Migración de los JSON cargados
1. **Todos:** agregar `requisitos`; no inventar mínimos.
2. **662:** partir de los 8 grupos visibles (0.3, 0.5, 0.6, 1.2, 1.3, 3.2, 3.4,
   3.6) y de los 5 seminarios. Confirmar si 0.5/0.6 son conmutables u optativos
   y cuántos seminarios se exigen.
3. **708:** proponer 29 requisitos de 1 candidato, sujeto a revisión; el JSON no
   muestra optativos.
4. **663:** corregir `"663-"` (128); decidir los EDI `0.6.x`; completar `1.1`.
5. **664-666:** unificar la numeración EDI, corregir equivalencias colgadas y
   decidir si `1.1` exige uno o todos los EDI.
6. **662x:** corregir `plan`, declarar `esPlantilla: true`, limpiar
   equivalencias y definir los requisitos **en la plantilla** para que la
   generación de las 18 letras los copie. No generar archivos aún.
7. **`planes.json`:** resolver el código de la plantilla sin cambiar
   `disponible` en P0.
## 3. Función pura de cálculo de avance
Propuesta: `src/utils/requisitos.js`, sin Vue ni Firestore.

```js
calcularAvancePlan(plan, acreditadas) -> { valido, errores, requisitos, total }
```
**Entradas:** `plan` con `materias` y `requisitos`; `acreditadas` = códigos ya
acreditados (o `{ codigo, fecha }`, del que solo se usa `codigo`). El origen del
historial no importa. **Salida por requisito:** `{ id, etiqueta, minimo,
candidatos, anio, cumplidos, acreditados, faltan, estado: "cumplido" |
"pendiente" }`. **Total:** `requisitosTotal`, `requisitosCumplidos`,
`requisitosPendientes`, `avance` (= cumplidos / total, medida oficial de §5),
`creditosRequeridos`, `creditosCumplidos`, `sobrantes` y
`acreditadasSinRequisito`. `creditos` es solo diagnóstico: si el mínimo se mide
en horas, la fórmula cambia.
**Reglas de `equivale_a` y sobrantes:**
- Un candidato se cumple si está acreditado su código **o** alguno de sus
  `equivale_a`. La relación es dirigida (la declara el plan); no se invierte ni
  se encadena. Un código del historial se consume una vez: auto-equivalencia o
  un código usado por dos materias = plan inválido, no se cuenta doble.
- Cada requisito asigna como máximo `minimo` códigos. Los que sobran van a
  `sobrantes` y **no reemplazan** otro requisito; los ajenos a todo requisito
  van a `acreditadasSinRequisito`.
- Sin `requisitos` no se infiere nada: `valido: false`. Tampoco se asume que
  todas las materias son obligatorias.
- Errores: grupo vacío, `minimo <= 0`, mínimo mayor que candidatos, candidato
  inexistente o repetido, materia sin requisito, auto-equivalencia y
  equivalencia propia inexistente. Una equivalencia a otro plan es advertencia.
- **Vista del Estudiante (solo propuesta):** cuando exista historial,
  `MateriasAprobadasCard.vue` o `HAcademico.vue` podrían mostrar “X de Y
  requisitos” y pendientes; hoy son marcadores vacíos (1-14 y 1-6).
## 4. Historial: dónde vive hoy y si alcanza
**No existe historial.** `trayectoriaAcademica` y `resumenAcademico` son diseño
futuro (`modelo-datos.md:387-390`); `ultimaAcreditacion` está “previsto” pero
“no se escribe” (128-130). `HAcademico.vue:1-6` es un cartel de “no disponible”
y `MateriasAprobadasCard.vue:1-14` está vacía. `useInscripciones.js:19-33`
guarda materia, comisión, estado `pendiente`/`confirmada`, fecha y ciclo; **no**
acredita ni califica. Por lo tanto **no alcanza**: P0 solo define el contrato
`acreditadas` y lo prueba con fixtures; el dato real llega con P6/P8.
## 5. Condicionalidad de cursada (propuesta, sin transiciones)
No confundir con `usuarios.planes[].estado = "condicional"` (equivalencias de
plan; `modelo-datos.md:204-206`). Es un dato de **una inscripción**, no del
plan. Propongo el campo en la inscripción (modelo plano de P2; hoy
`usuarios/{uid}/inscripciones{ciclo}`, `useInscripciones.js:19-33`):

```js
condicionCursada: { correlativa: "662-3.6", motivo: "final_pendiente",
  fechaLimite: Timestamp | null, registradaEn, registradaPor,
  resueltaEn: null, resueltaPor: null }
```
`fechaLimite` se congela al registrar, tomada de `ciclos/{año}` (fin de año o
cuatrimestre según `cursada`, `useEditorPlanes.js:22-27`). Hoy `ciclos` no existe (decisiones
181-185). Las fechas `etapas[].desde/hasta` de `ofertaAcademica` son ventanas
de inscripción, **no** fin de cursada (`useCargaOferta.js:109-123`;
`importar-oferta.md:43-44`): no usarlas. Sin calendario, `fechaLimite: null` y
la UI muestra “sin fecha”; no se deduce ni bloquea nada.
## 6. Etapas
### E1 — Formato, normalización y validación
- **Objetivo/archivos:** `normalizarRequisitos()` y `validarRequisitos()` puras en `src/utils/requisitos.js`, con `tests/unit/utils/requisitos.spec.js`.
- **Pasos:** normalizar `{id,minimo,candidatos,etiqueta}`; validar partición, existencia, duplicados, mínimos, años y equivalencias.
- **NO tocar:** JSON, Firestore, vistas, editor, rules. **Lecturas:** ninguna. **Verificación:** `npx vitest run tests/unit/utils/requisitos.spec.js`; grupo vacío, mínimo inválido, candidato repetido y materia sin requisito.
### E2 — Cálculo puro de avance
- **Objetivo/archivos:** `calcularAvancePlan()` sobre E1, en `src/utils/requisitos.js` y el mismo spec.
- **Pasos:** contar cumplidos, mínimos, sobrantes y sin requisito; aplicar `equivale_a` dirigida; devolver salida por requisito y total.
- **NO tocar:** JSON, Firestore, UI. **Lecturas:** ninguna. **Verificación:** obligatorio, conmutable, optativo 2 de 5, dos alternativas acreditadas (una sobra), equivalencia directa, auto-equivalencia, código desconocido y plan sin `requisitos`.
### E3 — Integración con lector y editor
- **Objetivo/archivos:** que `requisitos` y `equivale_a` sobrevivan en `src/utils/planes.js`, `src/utils/validacionPlanes.js` y `src/composables/academico/useEditorPlanes.js` (con sus specs).
- **Pasos:** conservarlos en el plan normalizado; importarlos/exportarlos en el editor; validarlos antes de publicar.
- **NO tocar:** JSON publicados, reglas, vistas. **Lecturas:** 1 doc de `planesPendientes` al abrir un borrador; la validación es en memoria. **Verificación:** specs de `planes`, `validacionPlanes` y `useEditorPlanes`; round-trip importar → exportar conserva `requisitos`.
### E4 — Auditoría y migración de JSON (con aprobación humana)
- **Objetivo/archivos:** informe de huecos y carga de requisitos en los 7 JSON de `public/planes/` y `planes.json`; script de auditoría de solo lectura si hace falta.
- **Pasos:** listar materias sin requisito, grupos candidatos, optativos sin mínimo, códigos inválidos y equivalencias colgadas; corregir 663 y 662x; cargar lo aprobado; recién después generar la plantilla 662X.
- **NO tocar:** `disponible` ni el código de la app. **Lecturas:** ninguna. **Verificación:** cada plan pasa `validarRequisitos()`; `npm run test:unit` y `npm run build`; revisión de Coordinación de un plan representativo.
## 7. Preguntas abiertas
1. ¿El alcance son 3 JSON o los 7 archivos?
2. ¿Cuántos optativos se exigen en 662 (`4.13.x`, `4.16.x`) y si los EDI
   `0.5/0.6` son conmutables u optativos?
3. ¿En 664-666 `1.1` exige uno o todos los EDI? ¿Y `663-1.1`, sin correlativas?
4. ¿El mínimo se mide en espacios o en horas?
5. ¿Los optativos solo se informan o se validan al inscribirse?
6. ¿Una equivalencia puede satisfacer más de un espacio? ¿Se encadenan entre planes?
7. ¿Quién acredita y con qué documento? ¿`trayectoriaAcademica` lleva `planCodigo`?
8. Condicionalidad: ¿qué pasa al vencer sin final? ¿Se pierde la cursada, se
   bloquea la acreditación, hay prórroga? ¿Quién resuelve y con qué auditoría?
## 8. Decisiones para mí
1. Aprobar `requisitos` (`id`, `minimo`, `candidatos`, `etiqueta?`) y la partición.
2. Aprobar que `tipo` se derive y que `horas` no se agregue todavía.
3. Aprobar `equivale_a` dirigida, consumo único y error ante auto-equivalencia.
4. Aprobar sobrantes sin reemplazo y avance medido en requisitos, no en créditos.
5. Aprobar que sin `requisitos` no se calcule avance (no inferir obligatorios).
6. Aprobar que `normalizarPlanJson` y el editor conserven `requisitos` y
   `equivale_a` (amplía lo dejado fuera en `20261103-plan-editor-planes.md:515-519`).
7. Aprobar migración con revisión humana: los mínimos los define Coordinación.
8. Aprobar corregir `662x` (`plan`, `esPlantilla`) y su código en `planes.json`.
9. Aprobar `condicionCursada` en la inscripción y `fechaLimite` desde `ciclos`.
10. Aprobar que el historial exponga `planCodigo` para desambiguar equivalencias.
## Resumen
- Se verificaron 7 JSON, no 3; ninguno tiene `requisitos` y `662G.json` no existe.
- Los casos reales son `or` de correlativas en 662 y nombres “optativo”; no hay mínimos.
- Formato: `requisitos: [{ id, minimo, candidatos, etiqueta? }]`, con partición y `tipo` derivado.
- Cálculo puro, `equivale_a` dirigida, sobrantes que no reemplazan y avance por requisitos.
- El historial no existe; las inscripciones no acreditan nada.
- Condicionalidad de cursada: campo en la inscripción y `fechaLimite` congelada desde `ciclos`.
- Antes de migrar: corregir 663/662x y definir optativos en 662 y EDI en 664-666.
- Pendiente de tu aprobación: formato, equivalencias, migración, plantilla 662X y condicionalidad.
