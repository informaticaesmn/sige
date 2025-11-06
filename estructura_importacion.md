# Estructura de Archivos CSV para Importación a Firestore

Este documento define el formato necesario para los archivos CSV que se usarán para poblar las colecciones de Firestore.

## Importante: Formatos de archivo

- **CSV**: Se usa únicamente para importación de datos desde Google Sheets u otras herramientas
- **JSON**: Es el formato nativo de almacenamiento en la aplicación y en Firestore
- El proceso de importación convierte automáticamente los CSV a JSON

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
| `equivale_a` | **Texto.** Código de la materia equivalente en otro plan. Ej: `662-1.1`. Dejar en blanco si no tiene equivalencia. |

### Ejemplo de Contenido

```csv
plan_codigo,plan_nombre,plan_resolucion,materia_codigo,materia_nombre,materia_anio,materia_correlativas_codigos,equivale_a
FOBA-NMP2023,Formación Básica para Músicos Populares 2023,RES-567/23,AUD01,Audioperceptiva I,1,,662-1.1
FOBA-NMP2023,Formación Básica para Músicos Populares 2023,RES-567/23,INS01,Instrumento Armónico I,1,,662-1.2.1
FOBA-NMP2023,Formación Básica para Músicos Populares 2023,RES-567/23,AUD02,Audioperceptiva II,2,AUD01,662-1.3
TAP2018,Tecnicatura en Arreglos Populares,RES-987/18,ARR01,Arreglos I,1,,662-3.4
TAP2018,Tecnicatura en Arreglos Populares,RES-987/18,ARR02,Arreglos II,2,ARR01,662-3.5
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

---

## 3. Fuente de Verdad: Relación de Planes

La relación oficial entre códigos de planes y sus nombres completos se encuentra en el archivo `public/planes/planes.json`. Esta es la fuente de verdad que debe usarse en toda la aplicación para:

1. Mostrar nombres completos de planes en la interfaz
2. Validar códigos de planes en formularios
3. Generar listados consistentes

### Ejemplo del contenido de `public/planes/planes.json`:

```json
{
  "planes": {
    "662": "662 Profesorado de Música",
    "662G": "662G Profesorado de Música con orientación en Guitarra",
    "708": "708 Técnico Superior en Sonido",
    "PREGRADO": "PREGRADO Programa Propedéutico"
    // ... más planes
  }
}
```

---

## 4. Estructura de Colecciones en Firestore

### Colección `usuarios`

Cada documento representa a un usuario del sistema con su información personal y académica.

```javascript
{
  dni: "37348389",
  nombre: "Maria José",
  apellido: "ORTEGA",
  email: "majo_959@hotmail.com",
  roles: ["estudiante"], // Puede incluir: "estudiante", "docente", "bedel", "admin"
  planes: [
    "662 Profesorado de Música",
    "PREGRADO Programa Propedéutico"
  ],
  estado: "activo", // Valores posibles: "pendiente_registro", "activo", "egresado", "ausente", "de_baja"
  fechaImport: "2025-11-06T10:00:00.000Z",
  creadoEl: "2025-11-06T10:00:00.000Z",
  actualizadoEl: "2025-11-06T15:30:00.000Z"
}
```

**Notas sobre el estado:**
- `pendiente_registro`: Usuario importado pero aún no se ha registrado en la aplicación
- `activo`: Usuario registrado y cursando actualmente
- `egresado`: Usuario que ha completado todos los requisitos de al menos un plan
- `ausente`: Usuario que ha abandonado temporalmente pero puede regresar
- `de_baja`: Usuario dado de baja definitivamente

Los usuarios pueden cambiar entre estados, incluyendo de `egresado` a `activo` si comienzan un nuevo plan.

### Colección `planes`

Cada documento representa un plan de estudio completo con todas sus materias.

```javascript
{
  plan: "662",
  nombre: "662 Profesorado de Música",
  materias: {
    "662-1.1": {
      nombre: "Audioperceptiva I",
      nombre_c: "Audio I",
      cursada: "anual",
      anio: 1,
      equivale_a: "662-1.1" // Referencia a materia equivalente (en este caso, sí misma)
    },
    // ... más materias
  }
}
```

### Colección `ofertaAcademica_2026`

Cada documento representa una materia en la oferta académica con sus secuencias.

```javascript
// Documento: 662-1.1 (ID del documento)
{
  materiaId: "662-1.1",
  nombre: "Audioperceptiva I",
  nombre_c: "Audio I",
  cursada: "anual",
  planId: "662"
}

// Subcolección `secuencias`:
// Documento: 0465 (ID del documento)
{
  id: "0465",
  horario: "Lun 16:30 a 18:30",
  aula: "Aula PB 01",
  docente: "Ceballos, O.",
  periodoId: "feb-2026-colectivas"
}
```

---

## 5. Formato para Arrays en Google Sheets

Para obtener el formato correcto en CSV al exportar desde Google Sheets:

### Opción 1 (recomendada - separada por comas):
En la celda de Google Sheets:
```
662,PREGRADO
```

Resultado en CSV:
```
662,PREGRADO
```

### Opción 2 (formato JSON):
En la celda de Google Sheets:
```
["662","PREGRADO"]
```

Resultado en CSV:
```
"""662"",""PREGRADO"""
```

El script de importación maneja ambos formatos correctamente.

---

## 6. Proceso de Importación

1. Los bedeles crean los datos en Google Sheets usando los formatos CSV definidos
2. Se exportan los archivos CSV
3. Un script de importación convierte los CSV a JSON y los carga en Firestore
4. La aplicación accede a los datos directamente desde Firestore y los archivos JSON en `public/planes/`

Este proceso permite:
- Trabajar con herramientas familiares para los bedeles (Google Sheets)
- Mantener una estructura de datos óptima para la aplicación
- Separar claramente la edición de datos de la estructura interna