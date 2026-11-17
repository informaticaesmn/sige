# Informe de auditoría — JSON de planes en `public/planes/`
> 16/11/2026. Solo lectura de código y JSON; no se modificó ningún plan.
> Contraparte: `plan-modelo-requisitos.md` (§12, E4). `VERIFICADO` = leído o
> ejecutado sobre los archivos; lo dudoso va a “Preguntas abiertas”.

## 1. Resumen por JSON

| JSON | Pasa carga masiva | Detecta pregrado | Pasa `validarRequisitos` | Materias cubiertas por requisitos | Defectos (`archivo:línea`) |
|---|---|---|---|---|---|
| `662` | Sí | Sí, 11 de año 0 | No, 86 errores | 10 de 91 | `R-2-OPT` con `anio:2` y 5 candidatos de año 4 (`662.json:37-43`); doble cómputo `662-0.3.1→662-0.1` (`:60`) y `662-0.3.2→662-0.2` (`:66`) |
| `663` | **No**: `"663-"` sin año | 13 de año 0, no detectado | No, 55 errores | 16 de 71 | clave `"663-"` (`663.json:249`); 9 equivalencias a códigos ausentes del plan (`:169,178,187,196,206,215,224,225,234`) |
| `664` | Sí | Sí, 14 de año 0 | No, 54 errores | 18 de 72 | 3 auto-equivalencias (`664.json:199,208,217`); 3 a códigos ausentes (`:226,245,246`) |
| `665` | Sí | Sí, 13 de año 0 | No, 53 errores | 18 de 71 | 8 equivalencias a códigos ausentes (`665.json:193,202,211,221,230,239,240,249`) |
| `666` | Sí | Sí, 13 de año 0 | No, 53 errores | 18 de 71 | 8 equivalencias a códigos ausentes (`666.json:188,197,206,215,225,239,240,249`) |
| `708` | Sí | No (años 1-3) | Sí | 29 de 29 | Ninguno detectado |
| `662x` | **No**: fuera del catálogo y `plan` interno ≠ archivo | 14 de año 0, no utilizable | No, sin `requisitos` | 0 de 72 | `plan:"662Letra"` (`662x.json:2`); `esPlantilla:true` (`:4`); 3 auto-equivalencias (`:66,75,84`); 3 a códigos ausentes (`:93,103,104`); sin entrada en `planes.json` |

## 2. Cómo se obtiene cada columna
- **Carga masiva**: el flujo exige catálogo y `planesDisponibles()`
  (`src/composables/usuarios/useImportarUsuarios.js:90-106`) y luego llama
  `validarPlanDetalle` por plan (`:131`). Ese detalle combina catálogo +
  `normalizarPlanJson` (`src/utils/planes.js:509-577`), que falla si el `plan`
  interno no coincide con el código del archivo (`planes.js:159-164`) o si
  alguna materia no tiene año reconocible (`planes.js:129-132,172-176`).
- **Pregrado**: `tienePregrado` (`planes.js:326-333`) devuelve `false` cuando
  el plan no normaliza, aunque el JSON tenga materias de año 0.
- **`validarRequisitos` / cobertura**: `src/utils/requisitos.js:207-330`.
  Cobertura = candidatos distintos de todos los requisitos sobre el total de
  materias del JSON. Un plan inválido deja `calcularAvancePlan` con
  `valido:false` (`requisitos.js:372-373`), y `espaciosDisponibles` devuelve
  `[]` (`:539-541`).
- **Hoy pasan la carga masiva 5 de las 6 entradas `disponible:true`** de
  `planes.json` (`public/planes/planes.json:4-121`): `662`, `664`, `665`,
  `666` y `708`. Falla `663`; `662x` no está en el catálogo.

## 3. Defectos ordenados

### 3.1 Bloquean la carga masiva
1. `663`: clave de materia `"663-"` sin año (`663.json:249`) →
   `normalizarPlanJson` devuelve “no disponible” (`planes.js:130-132`) y
   `validarPlanDetalle` reporta el plan como inválido.
2. `662x`: `plan:"662Letra"` no coincide con el archivo `662x.json:2`
   (`planes.js:159-164`); además no tiene entrada en `planes.json`, así que no
   se puede elegir en la importación. `esPlantilla:true` (`662x.json:4`).

### 3.2 Bloquean el cálculo de avance (`valido:false`)
3. `662`: 81 materias fuera de todo requisito (`requisitos.js:323-327`) y
   5 errores de año por `R-2-OPT` (`662.json:37-43`, año 2 con candidatos de
   año 4).
4. `663`: 55 materias fuera de todo requisito (cobertura 16 de 71).
5. `664`: 54 fuera de requisito (18 de 72).
6. `665`: 53 fuera de requisito (18 de 71).
7. `666`: 53 fuera de requisito (18 de 71).
8. `662x`: no tiene `requisitos` (`requisitos.js:212-217`).

### 3.3 No bloquean; silenciosos o cosméticos
9. Auto-equivalencias `664-0.7.1→664-0.7.1`, `.2→.2`, `.3→.3`
   (`664.json:199,208,217`) y las mismas en `662*-0.7.1/2/3`
   (`662x.json:66,75,84`). `validarRequisitos` solo las marca si el código es
   candidato (`requisitos.js:317-319`), y ninguno lo es.
10. Equivalencias a códigos inexistentes en el propio plan: `663` 9
    (`663.json:169,178,187,196,206,215,224,225,234`), `665` 8, `666` 8,
    `664` 3 (`664.json:226,245,246`), `662x` 3 (`662x.json:93,103,104`). No
    rompen la carga ni el cálculo: la equivalencia nunca acredita nada.
11. Doble cómputo en `662`: `662-0.3.1→662-0.1` (`662.json:60`) y
    `662-0.3.2→662-0.2` (`:66`) apuntan a candidatos de `R-0-01` y `R-0-02`;
    acreditar el instrumento acredita también Audioperceptiva / Educación
    Vocal (`requisitos.js:190-193`).

## 4. Relaciones entre planes a evaluar (no se clasifican como defecto)
| Origen | Destino | Equivalencias | Destino ausente en el plan destino | Nombre distinto |
|---|---|---|---|---|
| `663` | `662` | 12 | 3 (`662-0.6.4`, `0.6.5`, `0.6.6`) | 7 |
| `664` | `662` | 11 | 3 (`662-0.6.4`, `0.6.5`, `0.6.6`) | 7 |
| `664` | `663` | 1 (`664-0.1→663-0.1`) | 0 | 0 |
| `665` | `662` | 11 | 2 (`662-0.6.4`, `0.6.5`) | 7 |
| `665` | `663` | 1 (`665-0.1→663-0.1`) | 0 | 0 |
| `666` | `662` | 11 | 2 (`662-0.6.4`, `0.6.5`) | 7 |
| `666` | `663` | 1 (`666-0.1→663-0.1`) | 0 | 0 |
| `662x` | `662` | 42 | 3 (`662-0.6.4`, `0.6.5`, `0.6.6`) | 30 |
| `662x` | `663` | 1 (`662*-0.1→663-0.1`) | 0 | 0 |

Patrón repetido del “nombre distinto”: materias `EDI …` de `663`-`666`/`662x`
apuntan a `Espacio …` de `662` (`663.json:177`, `664.json:198`,
`665.json:192`, `666.json:196`, `662x.json:65`), e `Instrumento
Armónico - …` apunta a `Instrumento - …`. En `662x` además cambia la
numeración: `662*-1.5→662-1.7`, `662*-3.2→662-4.3`, `662*-3.8→662-2.5`
(`662x.json:151,373,406`).

## 5. Preguntas abiertas
1. `662-0.6.4`, `662-0.6.5` y `662-0.6.6` no existen en `662.json`, pero cinco
   planes las referencian: ¿faltan materias en `662` o sobran esas referencias?
2. ¿Las equivalencias `EDI … → Espacio …` son válidas? Deben coincidir por
   nombre según el criterio del pedido y hoy no coinciden.
3. `663` referencia `663-0.7.1` a `663-0.7.8`: ¿el plan debe tener esos códigos
   o las 9 equivalencias están mal escritas?
4. `R-2-OPT` (`662.json:37-43`): ¿el año correcto es 4 (el de sus 5
   candidatos) o los candidatos pertenecen a otro requisito?
5. `662x`: ¿es una plantilla intencionalmente fuera de `planes.json`? ¿Su `plan`
   interno debería ser `662x` y sus códigos `662x-*` en lugar de `662*-*`?
6. Las coberturas de `662`-`666` (10-18 materias) vs. `708` (29 de 29): ¿el
   avance de esos planes se mide solo por año o faltan requisitos por declarar?
7. El doble cómputo de `662`: ¿`Instrumento - Piano` acredita Audioperceptiva a
   propósito o la equivalencia apunta al código equivocado?

## 6. Qué se hizo
Se ejecutó la normalización real de `planes.js` y una réplica exacta de
`validarRequisitos` sobre los 7 JSON, y se contrastó con `useImportarUsuarios`
y `planes.json`. Resultado: 5 de 6 planes `disponible:true` pasan la carga
masiva; solo `708` pasa `validarRequisitos`; `662`-`666` quedan con cobertura
parcial (10-18 materias) y `662x` sin requisitos.
