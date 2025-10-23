# Estructura de Archivos CSV para Importación a Firestore

Este documento define el formato necesario para los archivos CSV que se usarán para poblar las colecciones de Firestore.

## 1. Carga Inicial: Planes de Estudio y Materias

Este es el primer y más importante paso. La información de este archivo llenará las colecciones `planesDeEstudio` y `materias`.

**Nombre del archivo:** `planes-y-materias.csv`

### Columnas Requeridas

| Nombre de Columna | Descripción |
|---|---|
| `plan_codigo` | **Texto.** El código único para el plan de estudio. Ej: `TAP2018`, `FOBA-NMP2023`. |
| `plan_nombre` | **Texto.** El nombre completo del plan de estudio. Ej: "Tecnicatura Superior en Arreglos Musicales 2018". |
| `plan_resolucion`| **Texto.** El número de resolución oficial del plan. Ej: "RES-1234/18". |
| `materia_codigo` | **Texto.** El código único y oficial de la materia. Ej: `AUD01`, `INS2`. |
| `materia_nombre` | **Texto.** El nombre completo de la materia. Ej: "Audioperceptiva I". |
| `materia_anio` | **Número.** El año o nivel al que pertenece la materia dentro del plan. Ej: `1`, `2`, `3`. |
| `materia_correlativas_codigos` | **Texto.** Una lista de `materia_codigo` (de la misma columna) separados por comas, indicando las materias que se deben tener aprobadas para cursar esta. Dejar en blanco si no tiene. Ej: `AUD01,INS1`. |

### Ejemplo de Contenido

```csv
plan_codigo,plan_nombre,plan_resolucion,materia_codigo,materia_nombre,materia_anio,materia_correlativas_codigos
FOBA-NMP2023,Formación Básica para Músicos Populares 2023,RES-567/23,AUD01,Audioperceptiva I,1,
FOBA-NMP2023,Formación Básica para Músicos Populares 2023,RES-567/23,INS01,Instrumento Armónico I,1,
FOBA-NMP2023,Formación Básica para Músicos Populares 2023,RES-567/23,AUD02,Audioperceptiva II,2,AUD01
TAP2018,Tecnicatura en Arreglos Populares,RES-987/18,ARR01,Arreglos I,1,
TAP2018,Tecnicatura en Arreglos Populares,RES-987/18,ARR02,Arreglos II,2,ARR01
```

---

## 2. Carga de Oferta Académica (Secuencias)

Este archivo se usará para cargar la oferta de un ciclo lectivo específico, una vez que los planes y materias ya existan en la base de datos.

**Nombre del archivo:** `oferta_academica.csv`

### Columnas Requeridas

| Nombre de Columna | Descripción |
|---|---|
| `ciclo_lectivo` | **Texto.** El ciclo para el cual es válida esta oferta. Ej: `2026-1`. |
| `materia_codigo` | **Texto.** El código de la materia a la que pertenece esta secuencia. Debe coincidir con un `materia_codigo` del archivo anterior. |
| `secuencia_codigo` | **Texto/Número.** El código único de la secuencia (comisión). Ej: `0465`, `1224`. |
| `cupo` | **Número.** La cantidad máxima de estudiantes para esta secuencia. |
| `horario` | **Texto.** El día y la hora. Ej: "Lun 16:30 a 18:30". |
| `aula` | **Texto.** El nombre o número del aula. Ej: "Aula PB 01". |
| `docente_nombre` | **Texto.** El nombre del docente a cargo. |
| `periodo_inicio` | **Fecha (YYYY-MM-DD).** Primer día de inscripción para esta secuencia. |
| `periodo_fin` | **Fecha (YYYY-MM-DD).** Último día de inscripción para esta secuencia. |

### Ejemplo de Contenido

```csv
ciclo_lectivo,materia_codigo,secuencia_codigo,cupo,horario,aula,docente_nombre,periodo_inicio,periodo_fin
2026-1,AUD01,0465,20,"Lun 16:30 a 18:30","Aula PB 01","Ceballos, O.",2025-11-01,2025-11-07
2026-1,AUD01,0463,20,"Mar 11:00 a 13:00","Aula PB 05","Ceballos, O.",2025-11-01,2025-11-07
2026-1,ARR02,1224,15,"Mar 12:30 a 13:50","Aula PB 18","Suarez, M.",2025-11-08,2025-11-14
```
