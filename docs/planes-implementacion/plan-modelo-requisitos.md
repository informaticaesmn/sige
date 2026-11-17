# P0 — Formato de requisitos y cálculo de avance

> 16/11/2026. Solo lectura de código y JSON. **VERIFICADO** = leído en archivo:línea; **SUPUESTO** = a confirmar. Alcance: formato de `requisitos` y cálculo de avance. La plantilla 662X, la generación por letra y `exportarJSONValidado` son P0b: solo se listan sus dependencias (§7). Reemplaza a `20261113-plan-modelo-requisitos.md`, que quedó desactualizado (afirma que ningún JSON declara `requisitos`).

## 1. Estado verificado de los JSON
`public/planes/` tiene 7 planes más `planes.json`. Claves de nivel plan: `plan`, `nombre`, `materias` y, desde el 11/11, `requisitos` (`src/utils/requisitos.js`); `662x` agrega `esPlantilla`.

| Archivo | `plan` | Materias | `requisitos` | Cubiertas | ¿`validarRequisitos`? | `equivale_a` |
|---|---|---:|---:|---:|---|---:|
| `662.json` | `662` | 91 | 5 | 10 | **no** | 2 |
| `663.json` | `663` | 71 | 15 | 16 | **no** | 12 |
| `664.json` | `664` | 72 | 17 | 18 | **no** | 12 |
| `665.json` | `665` | 71 | 17 | 18 | **no** | 12 |
| `666.json` | `666` | 71 | 17 | 18 | **no** | 12 |
| `708.json` | `708` | 29 | 29 | 29 | **sí** | 0 |
| `662x.json` | `662Letra` | 72 | 0 | 0 | **no** | 43 |

- "Cubiertas" = materias que pertenecen a algún requisito. La partición exige todas y `validarRequisitos` reporta las que faltan (`requisitos.js:323-327`): solo `708` la cumple.
- `calcularAvancePlan` devuelve `valido: false` si la validación falla (`requisitos.js:373, 446`): hoy **solo 708 tiene avance calculable**.
- `planes.json` marca `disponible: true` en 662, 663, 664, 665, 666 y 708 (L4-6, 99-101, 104-106, 109-111, 114-116, 119-121). Letras (L9-97) y 389-393 (L123-147) en `false`; ninguno de ellos tiene JSON. **VERIFICADO:** contradice `modelo-datos.md:857-871` (solo 662 y 708).

## 2. Casos reales de conmutables y optativos
- **En `requisitos`:** `662.json:21-27` `R-0-03` conmutable 1 de 2 (`0.3.1`/`0.3.2`, Piano/Guitarra); `662.json:37-43` `R-2-OPT` optativo 2 de 5 (seminarios `4.13.1-3` y `4.16.1-2`) con un **defecto**: declara `anio: 2` y los candidatos son de año 4, y `validarRequisitos` lo rechaza (`requisitos.js:314-316`). 663-666 solo tienen `R-0-03` (`663.json:21-27`); 708 no tiene ninguno (29 obligatorios).
- **Implícitas en `correlativas` (sin requisito):** `662.json:112-132` — `1.1` exige en `cursar` uno de `0.3.1/0.3.2`, uno de `0.5.1-3` y uno de `0.6.1-3`. Hay **11 grupos `or`**: además `1.2.x` (L1202-1236), `1.3.x`, `3.2.x`, `3.4.1-5` (L1448-1530) y `3.6.1-5` (L1562-1645); no cruzan años.
- `664.json:276-285`, `665.json:268-277`, `666.json:268-277` — `1.1` exige uno de siete EDI `0.6.x`. `663-1.1` no tiene correlativas (verificado: sin clave).
- **SUPUESTO:** esos grupos son conmutables u optativos reales. El mínimo (1, 2, 3...) lo define Coordinación: no se deduce del `or`.

## 3. Códigos: el formato xxxx-AA-NN.N no se usa
- El formato real es `{plan}-{año}.{n}[.{sub}]`: `662-0.1`, `708-1.1`, `663-4.13`. Ningún archivo usa año de dos dígitos; `anioDeMateria` acepta ambos (`src/utils/planes.js:83-84`).
- `708`: códigos `708-1.1`…`708-3.7`, plan `708`, sin año 0 (sin pregrado). La cadena `0708` no aparece en ningún JSON (grep de los 7 archivos).
- `662x`: `plan: "662Letra"` (L2), `esPlantilla: true` (L4), prefijo `662*`; no está en `planes.json` y no es asignable.
- Letras `662A`…`662Q` (18, con Ñ): solo en `planes.json`; no hay JSON.
- `663.json:249`: clave vacía `"663-"`, sin nombre y sin año reconocible.
- **`equivale_a` existe en:** `662` (solo `0.3.1` y `0.3.2`); `663` (`0.2`, `0.3.1/2`, `0.4`, `0.5`, `0.6.1-7`); `664` (`0.1`, `0.3.1/2`, `0.4`, `0.6`, `0.7.1-7`); `665` (`0.1`, `0.2`, `0.3.1/2`, `0.4`, `0.6.1-7`); `666` (`0.1`, `0.2`, `0.3.1/2`, `0.4`, `0.5`, `0.6.1-4` y `0.6.6/7`); `662x` (43, de `0.x` a `3.14`); `708` ninguna. Defectos concretos en §6.

## 4. Formato de `requisitos`
Ya definido (`modelo-datos.md:913-969`), implementado y en uso. Se propone **congelarlo** tal cual: `{ "id", "anio", "tipo", "minimo", "candidatos", "etiqueta"? }`, por ejemplo `{ "id": "R-0-03", "anio": 0, "tipo": "conmutable", "minimo": 1, "candidatos": ["662-0.3.1", "662-0.3.2"] }`.
- `id` único y estable; `anio` entero ≥ 0 o `null` (transversal); `tipo` explícito (`obligatorio` 1/1, `conmutable` N/1, `optativo` N/M con M < N); `minimo` en espacios.
- Partición: cada materia en exactamente un requisito; `sum(minimo)` = espacios requeridos. Es lo que falta completar en 662-666.
- Es aditivo: ningún lector actual se rompe (§5.2).

## 5. Migración necesaria
### 5.1 JSON cargados
1. **662:** corregir `R-2-OPT` (año 4) y sumar 81 materias; definir los grupos `0.3/0.5/0.6/1.2/1.3/3.2/3.4/3.6` y el mínimo de los 5 seminarios.
2. **663:** borrar o completar `"663-"` (L249) y sumar 55 materias; decidir los EDI `0.6.x` y completar `1.1`.
3. **664-666:** sumar 54 materias cada uno y decidir si `1.1` exige 1 o 7 EDI.
4. **708:** sin cambios; único válido y completo (29/29).
5. **662x:** sin `requisitos`; se completa en P0b sobre la plantilla (§7).
6. Corregir las equivalencias de §6 antes de habilitar la validación. No cambiar `disponible`: 663-666 ya están en `true` y quedarían con avance inválido hasta terminar sus requisitos.
### 5.2 Lectores del JSON y riesgo
- **Inscripción:** no lee planes. `InscripcionesE.vue:132` usa `ofertaAcademica`; `useInscripciones.js:12-33` solo escribe. **No se rompe.**
- **Carga masiva:** `useImportarUsuarios.js:129-161` → `validarPlanDetalle` → `normalizarPlanJson`, que solo usa `disponible`, `materias` y pregrado. Es aditivo: **no se rompe**, pero no ve `requisitos`.
- **Vidriera:** `usePlanesEstudio.js:16-32` hace `fetch` del JSON crudo y conserva las claves nuevas (las ignora).
- **Único que necesita el JSON crudo:** `calcularAvancePlan`; hoy no lo llama ninguna vista (grep en `src/`).
### 5.3 Editor de planes
- Ya importa y exporta `requisitos` (`useEditorPlanes.js:205-207, 561-569, 677-689`) y `equivale_a` (`107-128, 670`): round-trip correcto.
- **Hueco 1:** exportar no valida (`useEditorPlanesVista.js:536-540` vs. `522-525`): se puede descargar un plan inválido.
- **Hueco 2:** `generarJSONDetalle` no emite `parametros` (`useEditorPlanes.js:678-690`); fuera de alcance, pero se pierde al editar.
- **Hueco 3:** `normalizarPlanJson` descarta `requisitos` y `equivale_a` (`src/utils/planes.js:128-146, 184-192`).

## 6. Cálculo de avance (contrato verificado)
- `calcularAvancePlan(plan, acreditadas)` (`requisitos.js:372-452`), pura, sin Vue ni Firestore. `plan` es el JSON crudo (o equivalente con `materias` y `requisitos`); `acreditadas` acepta códigos, objetos `{codigo}` o `Set` (`98-125`), y hoy solo se usa `codigo` (`planCodigo` se ignora).
- **Por requisito:** `{ id, etiqueta, anio, tipo, minimo, candidatos, acreditados, cumplidos, faltan, estado, sobrantes }`; `acreditados` son solo los que cuentan hasta el mínimo y `sobrantes` el resto. **Por año:** `{ anio, requisitos, cumplidos, completo }`.
- **Total:** `{ requisitos, cumplidos, pendientes, avance, espaciosRequeridos, espaciosCumplidos, sobrantes, acreditadasSinRequisito }`. `avance = cumplidos / requisitos` (medida oficial); `espacios*` y `sobrantes` son diagnóstico.
- **`equivale_a`:** un candidato cuenta si está acreditado su código o alguno de sus `equivale_a`; es dirigida y **no se encadena** (`190-194`). Un código satisface dos requisitos solo si ambos lo declaran (hay test). Lo acreditado de más va a `sobrantes` y no reemplaza otro requisito; lo ajeno a todo requisito va a `acreditadasSinRequisito` (`339-350`).
- **Hueco:** se descartan las `advertencias` de `validarRequisitos` (`requisitos.js:373`) y no se avisa del doble cómputo que pide `modelo-datos.md:1001-1003`. Solo es confiable con `valido: true`; con un plan inválido el cálculo igual cuenta y no deduplica entre requisitos.
- **Datos que hoy lo rompen:** auto-equivalencias `664-0.7.1/2/3` (`664.json:197, 206, 215`) y `662*-0.7.1/2/3` (`662x.json:64, 73, 82`); equivalencias a códigos propios inexistentes (`663-0.5 → 663-0.7.5` en `663.json:167`; `664-0.6 → 664-0.7.5` en `664.json:188`; `662*-0.6 → 662*-0.7.6` en `662x.json:55`); equivalencias a un plan que no es la madre (`664-0.1`, `665-0.1`, `666-0.1` → `663-0.1`, `equivale_a` en L146 de los tres; `662*-0.1 → 663-0.1` en `662x.json:10`); y doble cómputo en 662 (`0.3.1 → 0.1` en L60 y `0.3.2 → 0.2` en L66, cuando `0.1`/`0.2` son candidatos de `R-0-01`/`R-0-02`).

## 7. Lo que P0b necesita de este formato
- **Plantilla 662X:** copiar `requisitos` y `equivale_a` a cada letra y remapear el prefijo (`662-...` → `662G-...`); `662*` no debe salir al JSON. Cada plan generado debe pasar `validarRequisitos`: la partición se rompe si el instrumento (candidato) se renombra mal.
- **Generación por letra:** `id` estables e iguales entre letras; cambia el candidato del instrumento, no el requisito. Si los optativos difieren por letra, la plantilla no alcanza.
- **`exportarJSONValidado`:** necesita un `validarPlan(plan)` agregado (materias + requisitos + parámetros); hoy el editor valida pero la exportación no lo exige (§5.3).

## 8. Historial académico: dónde vive y si alcanza
- **No existe.** `trayectoriaAcademica` y `resumenAcademico` son diseño (`modelo-datos.md:498-683`); `ultimaAcreditacion` está previsto pero no se escribe (`3.1`, L148-149). `HAcademico.vue:1-5` es un cartel de “no disponible” y `useInscripciones.js:27-33` guarda `pendiente`, sin nota ni acreditación.
- Por lo tanto **no alcanza**: P0 fija el contrato `acreditadas` y lo prueba con fixtures; el dato real llega con el plan de historial (fuera de P0).
- Cuando exista: pasar `planCodigo` por acreditación y filtrar antes de llamar; `codigo` solo no desambigua (alias `62G`, equivalencias entre planes).

## 9. Condicionalidad de cursada (previsión)
- Es distinta de `planes[codigo].estado = "condicional"` (equivalencias de plan; `modelo-datos.md:182-186, 389-390`): es un dato de **una inscripción**.
- Dónde: en el documento de inscripción (hoy `usuarios/{uid}/inscripciones{ciclo}`, `useInscripciones.js:19-25`; P2 la pasa a colección plana). El campo previsto es `condicionCursada` (`modelo-datos.md:368-390`); ningún código lo lee ni lo escribe (grep).
- `fechaLimite` sale de `ciclos/{anio}`: `fin` si la cursada es anual y `periodos[].cierreCursada` para `1C`/`2C` (`modelo-datos.md:447-468`). El período ya está en el JSON (662: 63 anual, 12 `1C`, 16 `2C`). `ciclos` no existe (`modelo-datos.md:106`).
- No usar `ofertaAcademica.etapas[].desde/hasta`: son ventanas de inscripción (`useOfertaAcademica.js:11-20`), no fin de cursada. Se congela al registrar; sin calendario queda `null` y no se autovence.
- **SUPUESTO:** una cursada con condición pendiente no acredita hasta resolverse. Las transiciones no se deciden acá (§10).

## 10. Preguntas abiertas
1. ¿El mínimo de un grupo se mide en espacios o en horas?
2. ¿Los optativos se informan o se validan al inscribirse?
3. ¿Cuántos seminarios exige 662 y si `0.5.x`/`0.6.x` son conmutables u optativos?
4. ¿En 664-666 `1.1` exige uno o los siete EDI? ¿Y `663-1.1`, sin correlativas?
5. ¿Una equivalencia a un plan distinto de la madre (663 en 664) es error o es legítima?
6. ¿Una materia acreditada puede cumplir dos requisitos vía `equivale_a` en los datos reales, o se corrige para que no ocurra?
7. Condicionalidad: ¿qué pasa al vencer, hay prórroga, quién la resuelve y con qué auditoría? ¿Afecta el avance o solo la acreditación?
8. ¿El avance se muestra a los estudiantes en 2027 o queda interno hasta que exista historial?
9. ¿Los planes con requisitos incompletos siguen `disponible: true`?

## 11. Decisiones para mí
1. Congelar el formato `requisitos` vigente, sin campos nuevos.
2. Aprobar que sin partición completa no se calcule avance (`valido: false`) y no se muestre un porcentaje parcial.
3. Aprobar que `calcularAvancePlan` devuelva `advertencias` y avise del doble cómputo (cambio de código).
4. Aprobar que `normalizarPlanJson` conserve `requisitos` y `equivale_a`, y que exportar exija validación (cambio de código, no de modelo).
5. Aprobar el orden: equivalencias y códigos antes de cargar requisitos; por plan; sin tocar `disponible`.
6. Aprobar que `acreditadas` viaje con `planCodigo` cuando exista historial.
7. Aprobar `condicionCursada` en la inscripción y `fechaLimite` desde `ciclos`; transiciones a preguntas abiertas.
8. Aprobar que P0 no cree historial ni vistas: cálculo puro + fixtures.
9. Aprobar corregir `662 R-2-OPT`, `663-` y las equivalencias auto/colgadas.

## 12. Etapas
### E1 — Advertencias y alcance del cálculo
- **Objetivo:** informar el doble cómputo sin depender de datos globales. **Archivos:** `src/utils/requisitos.js` y su spec.
- **Pasos:** agregar `advertencias` (las de `validarRequisitos` más la de código compartido); tests de 1→2, auto-equivalencia y plan inválido.
- **No se toca:** JSON, vistas, editor, Firestore. **Lecturas:** ninguna. **Verificación:** `npx vitest run tests/unit/utils/requisitos.spec.js`.
### E2 — Validación agregada y gate de exportación
- **Objetivo:** `validarPlan(plan)` que sume materias, requisitos y parámetros; exportar solo si pasa. **Archivos:** `src/utils/validacionPlanes.js`, `useEditorPlanes.js`, `useEditorPlanesVista.js` y sus specs.
- **Pasos:** componer el resultado; bloquear `exportarDetalle`/`copiarDetalle` con errores; mostrar advertencias sin bloquear.
- **No se toca:** JSON publicados, reglas, vistas de estudiante. **Lecturas:** ninguna nueva (validación en memoria; el borrador se abre con el flujo actual). **Verificación:** specs del editor y round-trip importar→exportar.
### E3 — Normalización que conserva el plan completo
- **Objetivo:** que `normalizarPlanJson` no pierda `requisitos` ni `equivale_a`. **Archivos:** `src/utils/planes.js` y sus specs.
- **Pasos:** agregarlos al plan normalizado; confirmar que la carga masiva no cambia (`estadoInicialDePlan`, `tienePregrado`).
- **No se toca:** JSON, Firestore, editor. **Lecturas:** ninguna. **Verificación:** specs de `planes` y `useImportarUsuarios`; un plan normalizado debe calcular avance.
### E4 — Auditoría de los 7 JSON (solo lectura)
- **Objetivo:** informe de defectos por plan (materias sin requisito, años cruzados, `663-`, equivalencias auto/colgadas, grupos `or` sin requisito). **Archivos:** script de solo lectura en `scripts/` o informe manual.
- **Pasos:** recorrer `public/planes/*.json`; emitir tabla por materia; no escribir nada.
- **No se toca:** JSON, `planes.json`, app. **Lecturas:** ninguna. **Verificación:** cubre los 7 archivos y coincide con §1-§3.
### E5 — Carga de requisitos por plan (revisión humana)
- **Objetivo:** completar `requisitos` en 662, 663, 664, 665 y 666; corregir defectos; 708 sin cambios. **Archivos:** los JSON de `public/planes/`.
- **Pasos:** un plan por sesión; cargar solo lo aprobado por Coordinación; correr `validarRequisitos` antes de publicar; no tocar `disponible`.
- **No se toca:** código, `planes.json`, plantilla `662x`. **Lecturas:** ninguna. **Verificación:** `validarRequisitos(plan).exito` en los 5 planes migrados (708 ya pasa); `npm run test:unit` y `npm run build`.

## Resumen
- Los 7 JSON ya declaran `requisitos`, pero solo 708 es válido y completo (29/29); 662-666 cubren entre 10 y 18 materias y 662x no tiene ninguno.
- Hay conmutables/optativos declarados (662 `R-0-03`, `R-2-OPT`) y 11 grupos `or` implícitos en 662; el mínimo lo define Coordinación.
- El formato `xxxx-AA-NN.N` no se usa: es `{plan}-{año}.{n}`; `708` no aparece como `0708` y las letras no tienen JSON.
- El cálculo puro ya existe y está testeado; faltan advertencias, gate de exportación y conservar el plan completo al normalizar.
- No hay historial: el avance se prueba con fixtures hasta que exista.
- Condicionalidad: campo en la inscripción y `fechaLimite` desde `ciclos`.