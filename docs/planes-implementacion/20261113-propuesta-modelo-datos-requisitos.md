# Propuesta — Extensión v3 del modelo de datos: requisitos, avance, historial, condicionalidad y parámetros

> 11/11/2026. **Aplicado** a `modelo-datos.md` el 11/11/2026 como extensión v3. No se
> modificó código. Se conserva como documento de trabajo y fundamento de las decisiones.
> Incorpora las respuestas del 11/11 a las preguntas abiertas de
> [`P0-plan-modelo-requisitos.md`](P0-plan-modelo-requisitos.md).
> **VERIFICADO** = leído en archivo; **PROPUESTA** = cambio a aprobar.

## 1. La opción en una página

La propuesta **no reemplaza** el modelo v2: lo extiende donde hoy hay un hueco.
Se mantienen el mapa `usuarios.planes`, los seis estados de plan, `planes.json` como
catálogo, `disponible` como gate del alta, los borradores en `planesPendientes` y los
planes en `public/planes/*.json` (no se crea `planesDeEstudio`).

Se agrega:

1. **`requisitos` en el JSON del plan**: grupos explícitos de obligatorios,
   conmutables y optativos, con `minimo` medido en **espacios**.
2. **Un cálculo puro de avance** sobre requisitos, no sobre “todas las materias”.
3. **“Año completo” basado en requisitos**, para que los optativos de un año cuenten
   por su mínimo y no por la lista completa de materias.
4. **Historial académico concreto**: eventos de cursada, final y equivalencia; los
   seis casos de acreditación, la vigencia de la cursada regular, el docente de cursada
   y el tribunal de 3 docentes del final; `resumenAcademico` como caché.
5. **Condicionalidad de cursada** dentro de la inscripción, con `fechaLimite`
   congelada desde un calendario `ciclos/{anio}`.
6. **Parámetros académicos centralizados**: vigencias, umbrales y mínimos de
   aprobación en un archivo versionado, con overrides por plan y un resolvedor
   explícito.
7. **Editor de planes de Coordinación** capaz de importar, editar, validar y exportar
   `requisitos` y `parametros` sin borrarlos.

Los **mínimos concretos de cada plan no se deciden acá**: son dato del plan y los
carga Coordinación. El sistema debe recalcular cuando cambien.

## 2. Respuestas traducidas al modelo

| # | Respuesta | Consecuencia en el modelo |
|---|---|---|
| 1 | Alcance: los 7 planes cargados; los archivos son base, no están listos. | `requisitos` es opcional durante la migración. `disponible` sigue siendo independiente: un plan puede estar publicado sin avance calculable. No se inventan mínimos. |
| 2 | No importa “cuántos” optativos: la lógica debe adaptarse y ofrecer los espacios del plan. | `tipo`, `minimo` y `candidatos` son **datos** del plan. Cambiar la cantidad es editar un número o una lista, no código. La oferta al estudiante se deriva de los requisitos pendientes. |
| 3 | Si el año anterior tenía optativos, “año completo” es obligatorios + mínimo de optativos. | `{anio_completo: N}` se evalúa contra los **requisitos** del año N, no contra todas las materias. Cada requisito declara su `anio`. |
| 4 | Nada se mide en horas; todo en espacios. | Se elimina “créditos/horas” del cálculo. `minimo` y los totales se expresan en `espacios`. |
| 5 | No aplica. | Se retira la pregunta. La oferta se limita a los requisitos pendientes; el mínimo se controla al calcular avance, no como regla de inscripción. |
| 6 | Equivalencias 99% 1 a 1; una excepción vieja: una materia se desdobló en dos. | `equivale_a` dirigida y sin cadenas. Por defecto 1:1. El caso 1→2 se declara explícitamente: las dos materias nuevas apuntan a la vieja. |
| 7 | No aplica. | Se retira la pregunta; el historial solo guarda `registradoPor`/`origenDato`, sin definir circuito. |
| 8 | Si vence el ciclo sin nota que levante la condicionalidad, se pierde la cursada. Alerta: futuro. | `condicionCursada.estado: "vencida"`; la cursada no habilita final ni acredita. La nota queda en el historial para auditoría, pero no se usa. La alerta queda para después. |

## 3. Formato propuesto de `requisitos`

Clave nueva de nivel plan, al lado de `materias`:

```json
"requisitos": [
  {
    "id": "R-0-01",
    "anio": 0,
    "tipo": "obligatorio",
    "minimo": 1,
    "candidatos": ["662-0.1"],
    "etiqueta": "Audioperceptiva"
  },
  {
    "id": "R-0-COM",
    "anio": 0,
    "tipo": "conmutable",
    "minimo": 1,
    "candidatos": ["662-0.3.1", "662-0.3.2"],
    "etiqueta": "Lenguaje musical"
  },
  {
    "id": "R-4-OPT",
    "anio": 4,
    "tipo": "optativo",
    "minimo": 2,
    "candidatos": ["662-4.13.1", "662-4.13.2", "662-4.13.3", "662-4.16.1", "662-4.16.2"],
    "etiqueta": "Seminarios optativos"
  }
]
```

> El ejemplo es **ilustrativo**. El mínimo real de los seminarios del 662 y de los
> EDI de 663-666 lo define Coordinación; no se deduce del JSON actual.

Reglas:

- `id` único y estable dentro del plan. `etiqueta` es opcional (texto para la UI).
- `anio`: entero ≥ 0, o `null` para un requisito transversal. Si no es `null`, todos
  los candidatos deben pertenecer a ese año. Sin `anio`, el requisito no cuenta para
  “año completo”.
- `tipo` es **explícito**, no derivado:
  - `obligatorio`: 1 candidato, `minimo = 1`.
  - `conmutable`: ≥ 2 candidatos, `minimo = 1` (elegir una alternativa).
  - `optativo`: ≥ 2 candidatos, `1 ≤ minimo < candidatos.length` (elegir M de N).
- `minimo` es un entero en **espacios**. No hay `horas` ni `creditos`.
- **Partición:** cada materia del plan pertenece a exactamente un requisito. Así un
  espacio no es obligatorio y optativo a la vez y `sum(minimo)` es el total de
  espacios requeridos.
- Todo `candidato` debe existir en `materias` del mismo plan.
- Un requisito puede tener candidatos de un solo año; si el plan necesita un grupo que
  cruza años, se modela como `anio: null` (transversal) o se divide en dos requisitos.
- **No se guarda `tipo` derivado de la cantidad**: “1 de 3” puede ser conmutable u
  optativo, y esa diferencia cambia la oferta y la lectura del plan. El dato debe ser
  explícito.

### 3.1 Por qué esto atiende el punto 2

El sistema no necesita saber “el 662 tiene 5 seminarios”. Necesita leer:

```text
R-4-OPT: tipo optativo, minimo 2, candidatos [5 códigos], anio 4
```

Si mañana son 3 de 8, Coordinación cambia `minimo` y `candidatos` en el editor. La
consulta de espacios pendientes, el año completo y el avance se recalculan sin tocar
código. Los planes que no tienen optativos simplemente tienen requisitos
`obligatorio` de un candidato.

## 4. “Año completo” con optativos

Definición propuesta:

```text
anioCompleto(plan, N, acreditadas) =
  todos los requisitos con requisito.anio === N están cumplidos
```

Ejemplo de un año 2:

| Requisito | Tipo | Mínimo | Candidatos |
|---|---|---:|---|
| `R-2-01` … `R-2-06` | obligatorio | 1 c/u | 6 materias |
| `R-2-COM` | conmutable | 1 | 2 materias |
| `R-2-OPT` | optativo | 2 | 4 materias |

El año está completo con **6 + 1 + 2 = 9 espacios**, no con las 12 materias listadas.
Si el estudiante acreditó 3 de los 4 optativos, el tercero es sobrante y el año ya
estaba completo con 2.

Consecuencias:

- `{anio_completo: N}` en una correlativa significa “todos los requisitos del año N
  cumplidos”. La materia de año N+1 que lo declara sigue usando el mismo formato JSON.
- `ingresante → activo` usa `anioCompleto(plan, 0)`, no “todas las materias 00”.
  Esto corrige el texto actual de `modelo-datos.md:200`, `:227` y `:241-242`.
- Si un requisito es `anio: null`, no interviene en ningún “año completo”; se muestra
  como requisito transversal.
- La elegibilidad para cursar un espacio sigue saliendo de `correlativas.cursar`, pero
  la evaluación de `{anio_completo}` consulta los requisitos, no la lista de materias.

### 4.1 Espacios que se ofrecen al estudiante

`espaciosDisponibles(plan, acreditadas)` es una vista derivada; no se guarda:

- Requisito `pendiente`: se ofrecen sus candidatos aún no acreditados.
- Requisito `optativo`: se ofrece mientras `cumplidos < minimo`; al llegar al mínimo,
  el grupo deja de ofrecerse.
- Requisito `conmutable`: se ofrecen las alternativas aún no acreditadas.
- Se filtra por `correlativas.cursar`, evaluadas con el mismo motor que
  `{anio_completo}`.
- No se ofrecen materias de requisitos cumplidos ni códigos ya acreditados.

Así el sistema “ofrece los espacios del plan” sin conocer cantidades fijas: si el plan
cambia `minimo` o `candidatos`, la lista cambia sola. La UI del estudiante solo muestra
esta vista; no decide obligatoriedad ni mínimos.

## 5. Cálculo puro de avance

Módulo propuesto: `src/utils/requisitos.js`, sin Vue, sin Firestore, sin fetch.

```js
calcularAvancePlan(plan, acreditadas) -> {
  valido, errores,
  requisitos: [{
    id, etiqueta, anio, tipo, minimo, candidatos,
    acreditados, cumplidos, faltan, estado, sobrantes
  }],
  anios: [{ anio, requisitos, cumplidos, completo }],
  total: {
    requisitos, cumplidos, pendientes, avance,
    espaciosRequeridos, espaciosCumplidos,
    sobrantes, acreditadasSinRequisito
  }
}
```

- `plan`: objeto normalizado con `materias` y `requisitos`.
- `acreditadas`: códigos (`["662-0.1", ...]`) o `[{ codigo, planCodigo?, fecha? }]`.
  Para el cálculo solo importa `codigo`; `planCodigo` se usa para desambiguar
  equivalencias entre planes. Puede venir del `resumenAcademico` (vista del
  estudiante) o de `trayectoriaAcademica` (cálculo autoritativo); la función no
  consulta Firestore. Para equivalencias, el conjunto debe incluir códigos de otros
  planes; no se filtra solo por el plan actual.
- **Salida por requisito:** `acreditados` son los códigos que cuentan, hasta el
  mínimo; `sobrantes` los que exceden. `estado` es `cumplido` o `pendiente`.
- **Total:** `avance = cumplidos / requisitos` (medida oficial). `espaciosRequeridos
  = sum(minimo)`, `espaciosCumplidos = sum(min(acreditados, minimo))` y `sobrantes`
  son **diagnóstico**, no la medida oficial.
- **Sin `requisitos`:** `valido: false`; no se infiere que todas las materias son
  obligatorias.
- La evaluación de `correlativas.cursar` y de `{anio_completo}` vive en el mismo
  módulo (`evaluarCondicion`), para que la oferta de espacios y el avance no dupliquen
  reglas.
- **Equivalencias:** un candidato se cumple si está acreditado su código **o** alguno
  de sus `equivale_a`. La relación es dirigida (la declara el plan) y **no se
  encadena** (`A→B→C` no hace que C cumpla A).
- **Regla vs. evento:** `equivale_a` es la regla estática del plan; un evento
  `tipo: "equivalencia"` es la materialización de un pase o equivalencia para una
  materia destino. Si existe el evento directo, gana; si no, se aplica `equivale_a`
  sobre el código de origen del historial.
- **Caso 1→2:** si una materia vieja se desdobla en dos nuevas, las dos nuevas
  declaran `equivale_a: ["vieja"]`. Un mismo código del historial puede satisfacer dos
  requisitos **solo** por esa declaración explícita; se reporta como advertencia para
  que sea visible.
- **Sin doble cómputo accidental:** un candidato repetido en dos requisitos es error.
  Un código del historial que no es candidato ni equivalencia declarada va a
  `acreditadasSinRequisito`; no rellena otro requisito.
- **Errores:** grupo vacío, `minimo <= 0`, mínimo mayor que candidatos, candidato
  inexistente o repetido, materia sin requisito, auto-equivalencia, `tipo` incompatible
  con la cantidad de candidatos y requisito con candidatos de otro año.

## 6. Historial académico

Hoy **no existe**: `trayectoriaAcademica` y `resumenAcademico` son solo diseño
(`modelo-datos.md:387-390`), `ultimaAcreditacion` está previsto pero no se escribe
(`:128-130`) y las inscripciones no acreditan (`:340-346`). Por eso el cálculo se
prueba con fixtures; el dato real llega después.

### 6.1 Un documento por intento

`trayectoriaAcademica/{intentoId}` es un **evento inmutable**: no se edita el pasado,
se agrega otro intento. Una materia puede tener varios documentos (cursadas, finales,
equivalencias) y la acreditación se **deriva**; no se guarda un único “aprobada” que
pise el historial.

```js
tipo: "cursada" | "final" | "equivalencia"
```

Campos comunes: `personaId`, `planCodigo`, `materiaId`, `ciclo`, `origenDato`
(`"carga_manual" | "importacion" | "sistema"`), `registradoPor` y `creadoEn`.
`planCodigo` es obligatorio: el mismo código puede existir en otro plan y las
equivalencias necesitan saber de dónde vienen. `origenDato` indica **de dónde vino el
registro**; no confundir con la forma de acreditación: “promoción” no es un origen de
dato, es una `modalidad` de cursada. `formaAcreditacion` se deriva en cursada/final
(`promocion`, `final_regular`, `final_libre`) y se guarda en equivalencia
(`equivalencia`, `pase`); el resumen la materializa.

### 6.2 `tipo: "cursada"`

```js
{
  tipo: "cursada",
  personaId, planCodigo, materiaId, ciclo,
  comisionId: "..." | null,
  inscripcionId: "..." | null,
  condicionCursadaId: "..." | null,
  modalidad: "promocion" | "regular",
  resultado: "aprobada" | "desaprobada" | "abandonada",
  notaCursada: 8 | null,
  fechaCursada: Timestamp,
  docente: { id: "<uid|personaId>" | null, nombre: "..." },
  vigenciaHasta: Timestamp | null,
  parametrosVersion: "2026.1" | null,
  // estadoVigencia es derivado, no se persiste en el evento:
  // "vigente" | "vencida" | "consumida" | null
  origenDato, registradoPor, creadoEn
}
```

- **Promoción:** `modalidad: "promocion"`, `resultado: "aprobada"`,
  `notaCursada` **es** la nota de la materia, `vigenciaHasta: null` y no lleva final.
  Es la forma que faltaba en el modelo anterior.
- **Regular aprobada:** `modalidad: "regular"`, `resultado: "aprobada"`,
  `notaCursada` queda registrada,
  `vigenciaHasta = fechaCursada + parametros.cursada.vigenciaRegularAnios` y
  `estadoVigencia: "vigente"`.
- **Parámetros:** al registrar, se guarda `parametrosVersion` para explicar con qué
  reglas se calculó `vigenciaHasta`; no se guarda una copia completa del archivo.
- **Regular desaprobada:** no habilita final regular; el estudiante puede recursar o
  rendir libre.
- **Vencida:** una cursada regular aprobada sin final dentro del plazo pasa a
  `estadoVigencia: "vencida"`. La nota queda para auditoría, pero no acredita ni
  habilita final regular; el estudiante puede recursar o rendir libre.
- **Consumida:** un final regular aprobado usó esa cursada; ya no se reutiliza.
- **Condición de cursada:** si la inscripción tenía `condicionCursada`, la cursada
  queda vinculada por `condicionCursadaId` (el `materiaId` del documento en
  `inscripciones{ciclo}`; se resuelve con `personaId` + `ciclo`). Si la condición
  vence, la cursada se invalida aunque haya sido aprobada (ver §7.3).
- `estadoVigencia` se deriva de `vigenciaHasta`, de los finales, de la condición y de
  la fecha actual; **no se escribe en el evento**. El `resumenAcademico` lo cachea para
  consultas y alertas futuras.

### 6.3 `tipo: "final"`

```js
{
  tipo: "final",
  personaId, planCodigo, materiaId, ciclo,
  mesaId: "..." | null,
  inscripcionExamenId: "..." | null,
  caracter: "regular" | "libre",
  cursadaId: "..." | null,
  resultado: "aprobada" | "desaprobada" | "ausente",
  notaFinal: 7 | null,
  fechaExamen: Timestamp,
  tribunal: {
    presidente: { id: "<uid|personaId>" | null, nombre: "..." },
    vocales: [
      { id: "<uid|personaId>" | null, nombre: "..." },
      { id: "<uid|personaId>" | null, nombre: "..." }
    ]
  },
  origenDato, registradoPor, creadoEn
}
```

- **Regular:** exige `cursadaId` de una cursada regular aprobada y vigente a la
  `fechaExamen`. Si el final se aprueba, la cursada se deriva como `consumida` y la
  nota de la materia es `notaFinal`.
- **Libre:** no exige cursada. Se usa cuando el estudiante nunca cursó o cuando cursó
  y desaprobó; `cursadaId` puede referenciar el intento fallido solo como contexto.
- Un final desaprobado o ausente no acredita; si era regular, la cursada sigue vigente
  hasta su fecha límite y se puede intentar de nuevo. Una cursada `consumida` no se
  reutiliza para otro final regular.
- El **tribunal** tiene siempre 3 docentes: presidente y dos vocales. Se guarda como
  snapshot; si además existe `mesaId`, la mesa es la referencia de agenda, no la
  fuente histórica.
- Un final aprobado después de `vigenciaHasta` es inválido: se registra la
  advertencia y no acredita.

### 6.4 `tipo: "equivalencia"`

```js
{
  tipo: "equivalencia",
  personaId, planCodigo, materiaId,
  nota: 8,
  fechaOrigen: Timestamp | null,
  fechaAcreditacion: Timestamp,
  formaAcreditacion: "equivalencia" | "pase",
  origenAcademico: {
    tipo: "plan" | "externa",
    planCodigo: "662G" | null,
    materiaId: "62G.4.1" | null,
    institucion: "..." | null,
    resolucionId: "..." | null
  },
  registradoPor, creadoEn
}
```

- **Pase/cambio de plan:** toma la nota que el estudiante ya tenía en el plan de
  origen. `origenAcademico.tipo: "plan"` y se copian `planCodigo`/`materiaId` de origen.
- **Equivalencia externa:** `origenAcademico.tipo: "externa"` e `institucion`.
- `fechaOrigen` es la fecha original de la nota; `fechaAcreditacion` es la fecha en
  que se reconoce en este plan.
- Si una materia de origen se desdobla en dos destino, se crean **dos eventos** con el
  mismo `resolucionId`; un solo origen puede acreditar dos materias, explícitamente.
- No lleva `docente` ni `tribunal`: no hubo cursada ni final en este plan.

### 6.5 Los seis casos reales

| Caso | Eventos | Nota de la materia | Fecha de acreditación |
|---|---|---|---|
| 1. Cursó y promocionó | `cursada` promoción aprobada | `notaCursada` | `fechaCursada` |
| 2. Cursó, aprobó y rindió final | `cursada` regular aprobada + `final` regular aprobado | `notaFinal` | `fechaExamen` |
| 3. Cursó, aprobó y no rindió en 2 años | `cursada` regular aprobada; `estadoVigencia` derivado: `"vencida"` | — (debe recursar o rendir libre) | — |
| 4. Rindió libre sin cursar | `final` libre aprobado | `notaFinal` | `fechaExamen` |
| 5. Cursó, desaprobó y rindió libre | `cursada` desaprobada + `final` libre aprobado | `notaFinal` | `fechaExamen` |
| 6. Equivalencia o pase | `equivalencia` aprobada | `nota` de origen | `fechaAcreditacion` |

`acreditacionDeMateria(plan, materiaId, eventos)` devuelve la acreditación vigente:

1. Busca un evento directo de la materia destino: promoción, final aprobado o
   equivalencia aprobada.
2. Si no hay evento directo, aplica `equivale_a` sobre los códigos **acreditados** del
   historial (para importaciones viejas o pases no materializados).
3. Si hay más de una acreditación, gana la de `fechaAcreditacion` más reciente; todas
   quedan en el historial. Si las notas difieren, se reporta advertencia.
4. Una cursada regular aprobada **sin** final aprobado no acredita; una cursada
   vencida tampoco.

### 6.6 Vigencia de la cursada

- `vigenciaHasta = fechaCursada + parametros.cursada.vigenciaRegularAnios` (hoy 2
  años; §8) para una cursada regular aprobada. Si el calendario académico define el
  plazo contra fin de ciclo, se usa esa fecha.
- Un final regular solo es válido si `fechaExamen <= vigenciaHasta` y la cursada está
  `vigente`.
- Al vencer sin final aprobado: `estadoVigencia: "vencida"`. La cursada se pierde
  funcionalmente, pero el evento y la nota quedan para auditoría. No se puede rendir
  final regular; queda recursar o rendir libre.
- La promoción no vence: acredita en el momento de aprobar la cursada.
- Una cursada desaprobada no tiene vigencia.
- El proceso que marca vencidas es el mismo que alimenta la alerta futura; hoy solo se
  deriva al leer.
- El valor del plazo **no se escribe en el código**: se resuelve con
  `resolverParametros(plan)` y se congela en el evento junto con `parametrosVersion`
  (§8.3).

### 6.7 Docentes y tribunal

- En `cursada`, `docente` es el docente con el que cursó el estudiante. Se guarda
  `id` (si existe) y `nombre` como snapshot.
- En `final`, `tribunal` tiene presidente y dos vocales, con `id` opcional y `nombre`
  obligatorio. Los tres evaluaron; el presidente es el dato principal para mostrar.
- Si el docente cambia de nombre o se da de baja, el snapshot histórico no se altera.
- `mesasExamen` también debería llevar `tribunal` para la agenda; el historial guarda
  el snapshot de lo que efectivamente ocurrió.

```js
// mesasExamen/{mesaId}
{
  materiaId, fechaExamen, tipo, periodoInscripcion,
  tribunal: {
    presidente: { id: "<uid|personaId>" | null, nombre: "..." },
    vocales: [
      { id: "<uid|personaId>" | null, nombre: "..." },
      { id: "<uid|personaId>" | null, nombre: "..." }
    ]
  }
}
```

### 6.8 `resumenAcademico`

Se mantiene como caché, pero con `planCodigo` para no mezclar planes:

```js
// usuarios/{uid}/resumenAcademico/{planCodigo}__{materiaId}
{
  planCodigo: "662",
  materiaId: "662-0.1",
  estado: "acreditada" | "cursada_vigente" | "cursada_vencida" | "cursada_desaprobada" | "final_desaprobado",
  motivoVigencia: "plazo_vencido" | "condicion_cursada" | null,
  notaMateria: 8 | null,
  notaCursada: 7 | null,
  notaFinal: 7 | null,
  formaAcreditacion: "promocion" | "final_regular" | "final_libre" | "equivalencia" | "pase" | null,
  fechaCursada: Timestamp | null,
  fechaAcreditacion: Timestamp | null,
  eventoId: "..." | null,
  actualizadoEn: Timestamp
}
```

- El ID compuesto evita colisiones entre planes.
- `notaMateria` solo existe si `estado: "acreditada"`; para un regular pendiente se
  muestra `notaCursada`; `notaFinal` guarda el último final (aprobado o no) para la UI.
- `motivoVigencia` explica por qué una cursada quedó vencida: por el plazo de vigencia
  o por una condición de cursada no levantada.
- No guarda `requisitoId`: si el plan cambia, el requisito se deriva del JSON vigente.
- **No se guarda el avance**: se calcula al leer con `calcularAvancePlan()`.
- La vista del estudiante arma `acreditadas` desde este resumen; el cálculo
  autoritativo se hace sobre `trayectoriaAcademica`. Las reglas no pueden resolver
  `uid → personaId`, así que el historial no se expone directo al estudiante.

### 6.9 Actualización de estado y auditoría

- Cuando se registra un evento que acredita, el mismo proceso actualiza
  `usuarios.planes[planCodigo].ultimaAcreditacion` y `estadoCalculadoEn` (campos ya
  previstos en `modelo-datos.md:128-130`). Se usa `fechaAcreditacion`, no
  `fechaOrigen` de una equivalencia.
- El resumen se reconstruye desde el historial; si difiere, gana el historial.
- Índices previstos: `(personaId, planCodigo, fechaCursada)`,
  `(personaId, planCodigo, fechaExamen)` y `(personaId, materiaId)`.

### 6.10 Cambios respecto de la primera versión del historial

| Antes | Ahora | Por qué |
|---|---|---|
| `tipo: cursada/final/equivalencia` con `resultado` y `nota` genéricos | Un esquema por tipo, con `notaCursada`, `notaFinal` y `nota` | No confundir nota de cursada con nota de materia |
| `origen` mezclaba fuente y forma | `origenDato` (auditoría) + `formaAcreditacion` (académica) | “Promoción” es forma de acreditación, no origen del dato |
| No existía promoción | `modalidad: "promocion"` y `notaCursada` como nota de materia | Caso 1 real |
| No existía vigencia de cursada | `vigenciaHasta` y `estadoVigencia` | Caso 3: a los 2 años se pierde |
| No existía el final libre | `caracter: "libre"` | Casos 4 y 5 |
| No se guardaba docente | `docente` en cursada | Se pidió registrar con quién cursó |
| No se guardaba tribunal | `tribunal` con presidente + 2 vocales | Se pidió registrar quién evaluó |
| `resumenAcademico` no distinguía notas | `notaMateria`, `notaCursada`, `formaAcreditacion` | La UI necesita ambas |

## 7. Condicionalidad de cursada

No confundir con `usuarios.planes[].estado = "condicional"` (equivalencias de plan,
`modelo-datos.md:204-206`). Es un dato de **una inscripción**.

### 7.1 Inscripción

```js
// usuarios/{uid}/inscripciones{ciclo}/{materiaId}
{
  materiaId, comisionId, estado, fechaInscripcion, ciclo,
  condicionCursada: {
    estado: "pendiente" | "cumplida" | "vencida",
    falta: "662-3.6",                 // materia, requisito o "anio:2"
    motivo: "final_pendiente" | "equivalencia_pendiente" | "otro",
    fechaLimite: Timestamp | null,    // congelada al registrar
    registradaEn: Timestamp,
    registradaPor: "<uid>",
    resueltaEn: Timestamp | null,
    resueltaPor: "<uid>" | null
  } | null
}
```

- `fechaLimite` se copia al registrar y **no se recalcula** si luego cambia el
  calendario.
- Si no hay calendario, `fechaLimite: null`; la UI muestra “sin fecha” y no se
  autovence nada.
- `condicionCursada` es opcional: una inscripción normal lo tiene en `null`.

### 7.2 Calendario `ciclos/{anio}`

```js
{
  anio: 2026,
  inicio: Timestamp,
  fin: Timestamp,
  periodos: [
    { id: "1C", desde: Timestamp, hasta: Timestamp, cierreCursada: Timestamp },
    { id: "2C", desde: Timestamp, hasta: Timestamp, cierreCursada: Timestamp }
  ],
  actualizadoEn: Timestamp,
  actualizadoPor: "<uid>"
}
```

- Para `cursada: "anual"`, `fechaLimite = fin`; para `"1C"`/`"2C"`,
  `cierreCursada` del período.
- **No** se usan `ofertaAcademica.etapas[].desde/hasta`: son ventanas de inscripción,
  no fin de cursada (`modelo-datos.md:337`; `importar-oferta.md:43-44`).
- `ciclos` es colección nueva; hoy no existe.

### 7.3 Ciclo de vida

```text
inscripción con condición
  → condicionCursada.estado = "pendiente" y fechaLimite congelada
  → si se cumple antes: "cumplida" + resueltaEn/Por
  → si llega la fecha sin nota: "vencida"
      · la cursada vinculada (condicionCursadaId) no habilita final ni acredita
      · su estadoVigencia derivado es "vencida"
      · la nota queda en trayectoriaAcademica para auditoría
      · el estudiante debe volver a cursar
      · alerta previa: futuro, no se implementa ahora
```

No se borra el intento de cursada: se lo marca inválido por la condición vencida. Esa
regla se aplica al calcular elegibilidad/acreditación, no reescribiendo el historial.
El `vigenciaHasta` de 2 años para el final regular es independiente: la condición
puede invalidar la cursada antes.

## 8. Parámetros académicos y vigencias

### 8.1 El problema real

Hoy los plazos están escritos a mano en tres lugares distintos:

- `modelo-datos.md:203`, `:228` y `:244` dicen “4 años” para vencer el plan.
- `modelo-datos.md:247-248` propone `config/estadosPlanes` con
  `aniosVencimiento = 4`, `aniosFiltroPrevios = 3` y un `umbralPorVencerMeses` sin
  definir.
- Esta propuesta usa “2 años” para la vigencia de la cursada regular (§6.6).

Si una normativa cambia cualquiera de esos valores, hay que buscar y reemplazar en
documentación, código, tests y, probablemente, en una función de Cloud. Eso es frágil:
no queda registro de cuándo cambió, dos partes pueden quedar desincronizadas y un
cambio de redacción se confunde con un cambio de regla.

Pero **un único documento vivo tampoco es gratis**. La crítica sincera:

1. **Un documento global mutable reescribe el pasado.** Si mañana la vigencia de la
   cursada pasa de 2 a 3 años, no corresponde revivir cursadas ya vencidas ni estirar
   `vigenciaHasta` de eventos viejos. Sin versionado, el mismo documento cambia el
   significado de datos históricos.
2. **No todos los parámetros son de la misma naturaleza.** Una regla académica
   (vigencia de cursada), una fecha real (cierre de ciclo), un umbral de UI y un
   parámetro técnico (tamaño de página) no deberían compartir bolsa: se acoplan sin
   motivo y se les dan los mismos permisos.
3. **Firestore suma costo y puntos de falla.** Un documento leído en cada cálculo
   agrega una lectura, reglas, caché, auditoría y una UI de edición. Si nadie lo edita
   en runtime, es complejidad sin beneficio.
4. **Un archivo estático es revisable.** Vive en git, se testea, se despliega junto con
   el código y no puede quedar “a medio editar” en producción.
5. **Las reglas de seguridad no son el lugar.** Validar “2 años” en `firestore.rules`
   obligaría a leer configuración desde las reglas y a duplicar la regla académica.
   Esa lógica va en Functions/cálculo, no en rules.

**Recomendación:** archivo estático versionado con valores globales, overrides por
plan en el JSON del plan y una función explícita que los resuelve. Una colección solo
si Coordinación necesita editar en runtime sin deploy; en ese caso, documentos
versionados e inmutables, nunca un singleton que se pisa.

### 8.2 Forma propuesta

```json
// src/config/parametrosAcademicos.json
{
  "version": "2026.1",
  "vigenteDesde": "2026-01-01",
  "cursada": {
    "vigenciaRegularAnios": 2,
    "notaAprobacion": null,
    "notaMinimaPromocion": null
  },
  "plan": {
    "aniosVencimiento": 4,
    "umbralPorVencerMeses": null
  },
  "examen": {
    "vocalesTribunal": 2
  },
  "alertas": {
    "diasAvisoVencimientoCursada": null
  }
}
```

- Los valores `null` son **decisiones pendientes**, no ceros ni supuestos. Por ejemplo,
  no se inventa la nota de aprobación ni el umbral de “por vencer”.
- `version` y `vigenteDesde` permiten saber con qué reglas se calculó un dato.
- `plan.aniosVencimiento` se cuenta desde `usuarios.planes[codigo].ultimaAcreditacion`,
  no desde el alta ni desde el inicio del plan.
- `aniosFiltroPrevios` (si se usa) es una optimización de consulta, no una regla
  académica: vive en la configuración técnica, no acá.
- El archivo es global; no conoce planes ni estudiantes.

Override por plan, dentro del JSON que ya se edita (ejemplo hipotético):

```json
{
  "plan": "662",
  "parametros": {
    "vigenteDesde": "2026-01-01",
    "cursada": { "vigenciaRegularAnios": 3 },
    "plan": { "aniosVencimiento": 5 }
  }
}
```

- Solo se declara lo que difiere del global; el resto se hereda.
- El plan no puede definir calendario ni parámetros técnicos.
- Si un plan no declara `parametros`, usa el global sin ruido.

Resolución explícita, inyectada en el cálculo:

```js
// puro: no lee Firestore ni variables de entorno
resolverParametros(plan, global = PARAMETROS_ACADEMICOS)
// → deep merge global ← plan.parametros, con validación de claves y tipos
```

`calcularAvancePlan()`, `acreditacionDeMateria()` y `evaluarVencimientoPlan()` reciben
`parametros` como argumento. **Ningún módulo de cálculo importa un literal de 2 o 4
años.** Así los tests pueden pasar parámetros distintos sin tocar el archivo global.

### 8.3 Qué se congela y qué se recalcula

| Cálculo | Parámetro | Al registrar | Al leer |
|---|---|---|---|
| `vigenciaHasta` de una cursada | `cursada.vigenciaRegularAnios` | Se congela en el evento, junto con `parametrosVersion` | No se recalcula |
| Cursada vencida | `vigenciaHasta` + finales | — | Se deriva |
| Plan `vencido` | `plan.aniosVencimiento` + `ultimaAcreditacion` | — | Se deriva con el parámetro vigente |
| Plan `por_vencer` | `plan.umbralPorVencerMeses` | — | Se deriva |
| Tribunal | `examen.vocalesTribunal` | Snapshot de quiénes actuaron | No se recalcula |
| Nota de aprobación / promoción | `cursada.notaAprobacion`, `notaMinimaPromocion` | Se valida al registrar | Se puede revisar |

- `vigenciaHasta` es el único plazo que se **congela**: es una fecha comprometida con
  el estudiante. Se guarda `parametrosVersion` para poder explicar por qué esa fecha
  es la que es.
- El estado del plan (`activo`, `por_vencer`, `vencido`) es **derivado**: se recalcula
  con el parámetro vigente. No se escribe un `vencido` histórico que después haya que
  deshacer a mano.
- Si una norma nueva se aplica retroactivamente, no se edita el historial: se corre una
  migración explícita y auditada, con decisión registrada. Cambiar un número en el
  archivo no debe reescribir eventos.

### 8.4 Dónde vive cada cosa

| Tipo de dato | Ejemplo | Lugar | Motivo |
|---|---|---|---|
| Regla académica global | vigencia de cursada, vencimiento del plan | `src/config/parametrosAcademicos.json` | Cambia por normativa y debe cambiar en un solo lugar |
| Regla propia del plan | mínimos de optativos, vigencia particular | `parametros` en `public/planes/{plan}.json` | Ya es dato del plan y lo edita Coordinación |
| Fecha real | inicio/fin de ciclo, `cierreCursada` | `ciclos/{anio}` | No es una regla: es el calendario de ese año |
| Configuración técnica | tamaño de página, timeouts | config de la app / entorno | No es académica y no la edita Coordinación |
| Estado calculado | `vencido`, `por_vencer`, `cursada_vencida` | Derivado | No es parámetro ni se persiste como regla |

### 8.5 Consecuencias en el modelo y el editor

- `modelo-datos.md` deja de decir “4 años” y “2 años”: dice
  `plan.aniosVencimiento` y `cursada.vigenciaRegularAnios`, con el valor actual entre
  paréntesis.
- El Editor de Planes debe **conservar** `parametros` al importar/exportar, igual que
  `requisitos`; hoy lo descartaría. La UI solo expone las claves permitidas por plan y
  valida tipo y rango; no permite escribir claves globales.
- `validacionPlanes.js` valida los overrides contra el esquema global.
- El cliente (Vite) y las Cloud Functions (Node) deben usar **la misma fuente**. Si no
  comparten carpeta, el archivo se copia en el build y un test verifica que ambas
  copias coincidan; duplicarlo a mano es exactamente el problema que se quiere evitar.
- Los tests usan parámetros explícitos; no dependen del archivo global ni de la fecha
  del sistema.

### 8.6 Cuándo sí conviene una colección

Solo si se cumplen las tres condiciones: Coordinación necesita cambiar valores sin
deploy, se requiere historial de quién cambió qué, y el cambio debe tener fecha de
vigencia. En ese caso:

```text
config/parametrosAcademicos/versiones/{version}   // inmutable
config/parametrosAcademicos/actual                // puntero a la versión vigente
```

- Nunca se edita una versión publicada; se crea otra.
- Lectura para todo usuario autenticado; escritura solo admin, con auditoría.
- Si no se cumplen las tres condiciones, el archivo estático es mejor: menos reglas,
  menos lecturas, revisión por pull request y despliegue atómico con el código.

## 9. Comparación con `modelo-datos.md` actual

| Tema | Hoy en `modelo-datos.md` | Propuesta | Tipo | Motivo |
|---|---|---|---|---|
| Alcance | §9.6 lista `662G.json` con 58 materias; docs hablan de 3 planes | 7 archivos reales; `662G.json` **no existe**; `662x.json` es plantilla | Corrección | El inventario real no coincide con el doc |
| Requisitos | No existen; solo `or` implícitos en correlativas y nombres “optativo” | `requisitos: [{id, anio, tipo, minimo, candidatos, etiqueta?}]` | Agrega | Permite obligatorios, conmutables y optativos |
| Tipo de requisito | No modelado | Explícito: `obligatorio`/`conmutable`/`optativo` | Agrega | “1 de 3” no alcanza para distinguir conmutable de optativo |
| Mínimo | No modelado | `minimo` entero en espacios | Agrega | El sistema debe adaptarse a cambios de cantidad |
| Alternativas | `{or: [...]}` dentro de `correlativas` | Se conserva para elegibilidad; los grupos se declaran en `requisitos` | Cambia el uso | Una cosa es “puedo cursar” y otra “qué me falta para el plan” |
| Año completo | “todas las materias de año 0/00” (`:200`, `:227`, `:241-242`) | Todos los requisitos del año, con mínimos de optativos | Cambia | Un año con optativos no exige todas las materias listadas |
| Estado inicial | `ingresante` hasta completar todas las materias de pregrado | `ingresante` hasta `anioCompleto(0)` | Cambia | Misma razón: pregrado con optativos |
| Avance | No está definido en el modelo | `avance = requisitos cumplidos / total`; espacios solo diagnóstico | Agrega | Alinea con la decisión de medir en requisitos |
| Horas/créditos | No definido; la pregunta quedó abierta | Se elimina del cálculo; todo en espacios | Elimina ambigüedad | Respondido: nada se mide en horas |
| Equivalencias | `equivale_a` array; puede apuntar al plan madre (`:522-523`) | Dirigida, sin cadenas; 1:1 por defecto; 1→2 explícito; advertencia de uso múltiple | Aclara | Cubre el 99% y la excepción de materia desdoblada |
| Historial | Bullet de 6 campos (`:387-388`) | `trayectoriaAcademica` como evento: `cursada`, `final` o `equivalencia` | Agrega detalle | Sin esto no hay avance real |
| Formas de acreditación | No modeladas; `tipoIntento` no distingue promoción, final regular/libre ni equivalencia | `modalidad` (promoción/regular), `caracter` (regular/libre) y `formaAcreditacion` (incluye `promocion`) | Cambia | Cubre los seis casos reales |
| Vigencia de cursada | No definida | Cursada regular aprobada vence según `cursada.vigenciaRegularAnios` (hoy 2 años) sin final; `estadoVigencia` derivado | Agrega | Caso 3: se pierde la cursada y se recursa |
| Parámetros de vigencia | Literales “4 años” en prosa y un `config/estadosPlanes` propuesto sin versionado | `parametrosAcademicos.json` versionado + `parametros` por plan + `resolverParametros()` | Cambia | Un cambio de normativa se hace en un solo lugar y queda auditado |
| Vencimiento del plan | 4 años hardcodeado (`:203`, `:228`, `:244`) | `plan.aniosVencimiento`; `por_vencer` según `plan.umbralPorVencerMeses` | Cambia | El plazo no vive en el código |
| Docente / tribunal | No modelado | `docente` en cursada; `tribunal` con presidente y 2 vocales en final | Agrega | Se pidió registrar quién cursó y quién evaluó |
| Resumen | `usuarios/{uid}/resumenAcademico/{materiaId}` (`:389-390`) | ID `{planCodigo}__{materiaId}`; `notaMateria`, `notaCursada`, `notaFinal`, `formaAcreditacion` | Cambia | Evita colisiones y distingue nota de cursada de nota final |
| Inscripción | 5 campos (`:340-346`) | Agrega `condicionCursada` | Agrega | La condicionalidad es de una inscripción, no del plan |
| Calendario | No existe | `ciclos/{anio}` con `cierreCursada` | Agrega | `fechaLimite` no puede salir de la oferta |
| Vencimiento condicional | No definido | `condicionCursada.estado: "vencida"`; cursada inválida; alerta futura | Agrega | Respondido el 11/11 |
| Permisos | No hay filas para historial/ciclos | Se agregan lecturas/escrituras por rol | Agrega | El modelo objetivo debe cubrirlos |
| Editor | No se menciona `requisitos` ni `parametros` | Importar/editar/validar/exportar ambos, con pestaña de requisitos | Cambia código | Hoy el editor los borraría al guardar |
| Fuente de planes | JSON en `public/planes/`; no `planesDeEstudio` | Igual | No cambia | Se mantiene la decisión |
| Gate de alta | `disponible` en `planes.json` | Igual; `requisitos` no gatea el alta | No cambia | No bloquear planes incompletos |

### 9.1 Qué NO cambia

- El mapa `usuarios.planes` y sus estados (`ingresante`, `activo`, `por_vencer`,
  `vencido`, `graduado`, `condicional`); cambian los umbrales, no los nombres.
- `planes.json` como catálogo y `disponible` como gate del alta.
- `planesPendientes` y su `jsonTexto`.
- La fuente de verdad de los planes: `public/planes/*.json`.
- La migración de usuarios de E3 y el esquema v2 ya aprobado.

## 10. Cambios concretos a `modelo-datos.md`

Orden aplicado en `modelo-datos.md` el 11/11/2026; se conserva como registro de los cambios.

1. **Encabezado:** agregar “Extensión v3 (11/11/2026): requisitos del plan, avance,
   historial, condicionalidad de cursada y parámetros académicos”. No cambiar “v2
   aprobado”.
2. **§1 Diagrama:** opcional, agregar `JSON -. "requisitos" .-> Cálculo` y
   `TA --> Cálculo`. No es imprescindible.
3. **§2 Estado de implementación:** agregar filas:
   - `requisitos` en JSON: **no implementado**, etapa P0.
   - `calcularAvancePlan()`: **no implementado**, etapa P0/P1.
   - `condicionCursada`: **no implementado**, previsión.
   - `ciclos`: **no existe**, previsión.
   - `trayectoriaAcademica`: **no existe**, sigue fuera de alcance.
   - `parametrosAcademicos.json`: **no existe**, etapa P0 junto con `requisitos`.
4. **§4.3 y §4.4:** reemplazar “todas las materias 00/0 acreditadas” por “todos los
   requisitos del año 0 cumplidos (obligatorios + mínimos de optativos)”.
5. **§7 Inscripción:** agregar el bloque `condicionCursada` de §7.1.
6. **§8:** reemplazar el bullet de `trayectoriaAcademica` por los esquemas de
   §6.1–§6.7; ajustar `resumenAcademico` según §6.8; agregar `ciclos/{anio}` según
   §7.2; agregar `tribunal` a `mesasExamen`; agregar `caracter` y `cursadaId` a
   `inscripcionesExamen`; reemplazar “2 años” por
   `cursada.vigenciaRegularAnios` y guardar `parametrosVersion`.
7. **§9.4:** agregar `requisitos` y `parametros` al ejemplo y a las reglas del
   formato. Mantener `equivale_a` y `anio_completo`.
8. **Nueva §9.8 “Requisitos del plan y avance”:** pegar §3 y §5 de este documento,
   adaptando el ejemplo.
9. **Nueva §9.9 “Año completo y elegibilidad”:** pegar §4; aclarar que
   `{anio_completo: N}` consulta requisitos y que la elegibilidad sigue usando
   `correlativas.cursar`.
10. **Nueva §9.10 “Parámetros académicos y vigencias”:** pegar §8; reemplazar los
    literales de 4 años de §4.3/§4.4 por `plan.aniosVencimiento` y
    `plan.umbralPorVencerMeses`; retirar `config/estadosPlanes` como fuente única y
    separar los parámetros técnicos (`aniosFiltroPrevios`) de los académicos.
11. **§10 Permisos:** agregar:
    - `trayectoriaAcademica`: bedel/coordinación/admin leen; estudiante no; escritura
      solo Functions/admin.
    - `resumenAcademico`: estudiante lee el propio; bedel/coordinación/admin leen
      todos; escritura solo Functions/admin.
    - `ciclos`: todos leen; coordinación/admin escriben.
    - `parametrosAcademicos.json`: no tiene reglas; es parte del bundle. Si se optara
      por Firestore, lectura autenticada y escritura solo admin.
12. **§11 Migración:** agregar el paso “cargar `requisitos` en los 7 JSON, con revisión
    humana; no inventar mínimos”. No hay migración de Firestore por esto.
13. **§12 Documentación relacionada:** enlazar este documento y
    `P0-plan-modelo-requisitos.md`.

### 10.1 Antes / después del JSON del plan

Antes (actual):

```json
{
  "plan": "662",
  "nombre": "662 Profesorado de Música",
  "formato": "objeto",
  "materias": {
    "662-0.1": { "id": "662-0.1", "anio": 0, "nombre": "Audioperceptiva" }
  },
  "disponible": true
}
```

Después (propuesto, aditivo):

```json
{
  "plan": "662",
  "nombre": "662 Profesorado de Música",
  "formato": "objeto",
  "materias": {
    "662-0.1": { "id": "662-0.1", "anio": 0, "nombre": "Audioperceptiva" }
  },
  "requisitos": [
    { "id": "R-0-01", "anio": 0, "tipo": "obligatorio", "minimo": 1,
      "candidatos": ["662-0.1"], "etiqueta": "Audioperceptiva" }
  ],
  "parametros": {
    "cursada": { "vigenciaRegularAnios": 2 },
    "plan": { "aniosVencimiento": 4 }
  },
  "disponible": true
}
```

`parametros` es opcional: si está ausente, el plan hereda el archivo global (§8).

## 11. Impacto en el Editor de Planes (Coordinación)

Sin esto, `requisitos` se pierde al abrir y guardar un borrador.

| Archivo / pieza | Hoy | Cambio propuesto |
|---|---|---|
| `src/composables/academico/useEditorPlanes.js` (importar, `:133-164`) | Solo lee `plan`, `nombre`, `disponible` y `materias`; ignora el resto | Leer `datos.requisitos` y `datos.parametros` a refs y normalizarlos |
| `useEditorPlanes.js` (`generarJSONDetalle`, `:375-409`) | Reconstruye el objeto sin `requisitos` ni `parametros` | Incluir ambos en la exportación |
| `src/utils/planes.js` (`normalizarMateriaObjeto`, `:128-145`) | Descarta `equivale_a` y campos desconocidos | Conservar `equivale_a`; conservar `requisitos` y `parametros` a nivel plan |
| `src/utils/validacionPlanes.js` (`validarMaterias`, `:162-171`) | No valida requisitos | Agregar `validarRequisitos(materias, requisitos)` y `validarParametrosPlan(parametros)` |
| `src/views/coordinacion/EditorPlanes.vue` | Lista de materias y editor de condiciones | Nueva pestaña/panel “Requisitos” por año y bloque “Parámetros del plan” |
| `src/components/ui/EditorCondicion.vue` | Edita `{anio_completo: N}` sin contexto | Mostrar resumen “Año N: X obligatorios + Y optativos = Z espacios” |
| Plantilla `662x` | Sin requisitos; `plan: "662Letra"`; candidatos con `662*` | Definir requisitos en la plantilla y copiarlos a las letras sustituyendo `*`; marcar `esPlantilla` |
| Tests | `planes`, `validacionPlanes`, `useEditorPlanes` no cubren requisitos | Agregar specs de normalización, validación, cálculo y round-trip |

### 11.1 UI mínima de requisitos

Para cada año, una tabla:

```text
Año 2 · 2 requisitos · 9 espacios
[R-2-01] Obligatorio  · 1 · [662-2.1]                 [editar] [eliminar]
[R-2-OPT] Optativo     · 2 de 4 · [2.5.1, 2.5.2, ...] [editar] [eliminar]
[+ Agregar requisito]
```

- Alta con `tipo`, `anio`, `minimo` y selección múltiple de materias.
- Validación en vivo: materia sin requisito, candidato repetido, mínimo inválido,
  candidato de otro año, `tipo` incompatible.
- Totales del plan: requisitos, espacios requeridos y espacios por año.
- Botón “Generar un obligatorio por materia” para arrancar un JSON incompleto; luego
  Coordinación fusiona grupos. No inventa optativos.
- Al publicar: `requisitos` inválido bloquea; `requisitos` ausente solo advierte (el
  plan puede seguir `disponible` sin avance).
- Bloque “Parámetros del plan”: solo las claves habilitadas (`cursada`,
  `plan.umbralPorVencerMeses`), con el valor global como placeholder y validación de
  rango. No se editan desde acá los parámetros globales.

## 12. Migración de los 7 planes

| Plan | Estado actual | Qué hacer para requisitos |
|---|---|---|
| `662` | 91 materias; `or` en 0.3/0.5/0.6, 1.2/1.3, 3.2/3.4/3.6; 5 seminarios optativos | Cargar los 8 grupos y los optativos; el mínimo lo define Coordinación. No inferir “todos obligatorios”. |
| `708` | 29 materias; sin optativos por nombre | Propuesta inicial: 29 obligatorios, sujeta a revisión. |
| `663` | Clave inválida `"663-"` (`:128`); equivalencia colgada `663-0.7.5` (`:48`); `1.1` sin correlativas | Corregir códigos antes de cargar requisitos; decidir los EDI `1.1`. |
| `664` | `or` de 7 EDI en `1.1` (`:129-147`) | Decidir si `1.1` es 1 de 7 (conmutable) o todos (7 obligatorios); cargar después. |
| `665` | Equivalencias colgadas `665-0.7.1` (`:54-57`); EDI | Corregir; decidir EDI; cargar requisitos. |
| `666` | `or` de 7 EDI en `1.1` (`:132-140`) | Igual que 664. |
| `662x` | Plantilla; `plan: "662Letra"`; auto-equivalencia (`:65`); equivalencias colgadas (`:86-95`) | Corregir `plan`, declarar `esPlantilla`, limpiar equivalencias y definir requisitos **en la plantilla**. No generar las letras todavía. |
| `662G` | No existe `662G.json`; el catálogo tiene el código | No crearlo por suposición. Si se recupera, cargarlo como plan nuevo. |

`disponible` no se toca en esta etapa. Hoy solo `662` y `708` están habilitados.

## 13. Riesgos y decisiones que quedan abiertas

1. **Versionado del plan.** Si se corrigen requisitos mientras hay estudiantes
   cursando, ¿el avance se recalcula con el JSON nuevo o queda con la versión de
   ingreso? La propuesta actual recalcula con el JSON vigente. Si debe ser estable,
   hace falta `version` en el plan y en `usuarios.planes[codigo]`.
2. **Requisitos transversales.** `anio: null` está permitido, pero no cuenta para
   ningún “año completo”. Confirmar si existen grupos de optativas que cruzan años.
3. **Mínimos concretos.** No son una decisión de modelo: los carga Coordinación en el
   editor. Hasta entonces, `calcularAvancePlan()` devuelve `valido: false` si faltan.
4. **EDI 663-666.** Sigue abierto si `1.1` exige uno o todos. El modelo soporta ambos;
   cambia el dato.
5. **Plantilla 662x.** Falta resolver su código canónico en `planes.json` y si las
   letras heredan requisitos o solo el tronco común.
6. **Historial real.** `trayectoriaAcademica` sigue fuera del alcance inmediato. El
   cálculo se puede entregar y probar con fixtures antes de que exista el dato.
7. **Alerta de vencimiento.** Queda para futuro; el modelo solo registra `vencida`.
8. **Auditoría del caso 1→2.** Una materia vieja que satisface dos nuevas debe quedar
   visible como advertencia, no silenciosa.
9. **Plazo de vigencia de la cursada.** Confirmar si se cuenta desde `fechaCursada` o
   desde el fin del ciclo en que se aprobó la cursada; el modelo usa la fecha exacta y
   el valor sale de `cursada.vigenciaRegularAnios`.
10. **Precedencia de acreditaciones.** Si hay promoción, final y equivalencia para la
    misma materia, la propuesta toma la aprobada más reciente. Confirmar si la regla
    académica es esa o “la mejor nota”.
11. **Docentes y tribunal.** `id` es opcional y `nombre` es snapshot obligatorio. Si
    se exige vincular siempre con un usuario/legajo, hay que validarlo al registrar.
12. **Umbral de promoción.** El modelo guarda la nota, pero no valida el mínimo para
    promocionar: es regla académica del plan, no del historial.
13. **Cambio de parámetros.** Subir `vigenciaRegularAnios` o `aniosVencimiento` no debe
    revivir datos históricos. Definir si el parámetro nuevo aplica solo a eventos
    nuevos (recomendado) o si se corre una migración explícita.
14. **Quién edita los parámetros.** El archivo global no lo edita Coordinación: requiere
    revisión y deploy. Si se necesita edición en runtime, se justifica la colección
    versionada de §8.6 y hay que definir aprobación y auditoría.
15. **Duplicación cliente/Functions.** Si ambos runtimes no comparten el archivo,
    cualquier copia manual vuelve al problema original. Debe verificarse en CI.

### 13.1 Qué se aprobó

Aprobado el 11/11/2026:

1. El formato `requisitos` con `tipo` explícito, `anio`, `minimo` y `candidatos`.
2. Que “año completo” se evalúe contra requisitos, no contra todas las materias.
3. Que el avance se mida en requisitos y los totales en espacios, sin horas.
4. La regla de equivalencias 1:1, con el caso 1→2 explícito y sin cadenas.
5. El historial con los seis casos de acreditación, vigencia de la cursada, docente de
   cursada y tribunal de 3 docentes; y la condicionalidad de cursada de §6 y §7.
6. El esquema de parámetros de §8: archivo estático versionado, overrides por plan y
   `resolverParametros()`, sin valores inventados donde hoy no hay definición.
7. Autorizar la modificación del Editor de Planes de Coordinación (§11), sin tocar
   todavía los JSON publicados.
8. Definir si los cambios de requisitos y de parámetros se aplican retroactivamente o
   exigen versionado del plan (riesgos 1 y 13 de §13).

## 14. Resumen

- La propuesta extiende `modelo-datos.md` sin romper el v2: agrega `requisitos`,
  cálculo de avance, historial concreto y condicionalidad de cursada.
- `requisitos` usa `tipo` explícito (`obligatorio`/`conmutable`/`optativo`), `anio`,
  `minimo` y `candidatos`; los mínimos son dato del plan, no constantes del código.
- “Año completo” se evalúa contra requisitos: obligatorios + mínimo de optativos.
- Todo se mide en espacios; se elimina la ambigüedad de horas/créditos.
- Equivalencias 1:1 por defecto; el caso 1→2 se declara con `equivale_a` y no se
  encadena.
- Historial: eventos de cursada, final y equivalencia; promoción sin final, final
  regular/libre, vigencia de la cursada regular según parámetro y equivalencia con nota
  de origen.
- Se guarda el docente de cursada y el tribunal completo (presidente + 2 vocales) del
  final.
- La condicionalidad vive en la inscripción; `fechaLimite` sale de `ciclos/{anio}` y
  al vencer la cursada no acredita (alerta futura).
- Los plazos y umbrales dejan de ser literales: `parametrosAcademicos.json` versionado,
  overrides por plan y `resolverParametros()`; las fechas ya comprometidas se congelan
  con `parametrosVersion`.
- El Editor de Coordinación debe importar, editar, validar y exportar `requisitos` y
  `parametros`; hoy los descartaría.
- Aplicado a `modelo-datos.md` (extensión v3). El código queda intacto hasta implementar.
