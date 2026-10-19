# Estructura de Archivos CSV para Importación a Firestore

Este documento define el formato necesario para los archivos CSV que se usarán para poblar las colecciones de Firestore.

> **Estado (Oct 2026):** la oferta se carga **únicamente desde la app** (rol `coordinacion`):
> `src/views/coordinacion/CargaMasiva.vue` + `useCargaOferta.js` escriben `ofertaAcademica/{ciclo}` con el
> modelo real (`etapas → materias → comisiones`, ver sección 2) dentro de un `writeBatch`. El viejo script
> `scripts/importar-oferta.js` **se eliminó** (apuntaba a otra colección y duplicaba la lógica).
> Los planes y materias viven en los JSON de `public/planes/` (la sección 1 quedó obsoleta).
> Para la importación de usuarios, ver [importar-usuarios.md](importar-usuarios.md).

## Importante: Formatos de archivo

- **CSV**: Se usa únicamente para importación de datos desde Google Sheets u otras herramientas
- **JSON**: Es el formato nativo de almacenamiento en la aplicación y en Firestore
- El proceso de importación convierte automáticamente los CSV a JSON

## 1. Planes de Estudio y Materias (obsoleto: hoy son JSON)

Las colecciones `planesDeEstudio` y `materias` **nunca se implementaron**. Los planes y sus materias viven en
archivos JSON estáticos en `public/planes/` (`planes.json` con el catálogo y un archivo por plan, ej. `662.json`),
que son la fuente de verdad para la app y se consumen sin lecturas a Firestore. No hay CSV intermedio.

---

## 2. Carga de Oferta Académica (Secuencias)

Este archivo carga la oferta de un ciclo lectivo. Las materias referenciadas se resuelven por código contra los planes en `public/planes/`.

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

### Columnas opcionales (carga in-app)

La carga desde la app (`useCargaOferta.js`) acepta además estas columnas opcionales:

| Columna | Descripción |
|---|---|
| `materia_nombre` | Nombre de la materia. Si falta, se usa el código (`materia_codigo`). |
| `tipo` | Tipo de cursada (ej. `colectiva`, `individual`). Default: `colectiva`. |
| `etapa_nombre` | Nombre de la etapa de inscripción. Default: `Inscripciones`. |
| `etapa_descripcion` | Descripción de la etapa. |

Las filas se agrupan automáticamente en **etapas** por `etapa_nombre` + rango `periodo_inicio`/`periodo_fin`, y en **materias** por `materia_codigo`. `periodo_inicio` y `periodo_fin` son **obligatorios** (la vista del estudiante los usa para saber si la etapa está vigente).

---

## 3. Fuente de Verdad: Relación de Planes

La relación oficial entre códigos de planes y sus nombres completos se encuentra en el archivo `public/planes/planes.json`. Esta es la fuente de verdad que debe usarse en toda la aplicación para:

1. Mostrar nombres completos de planes en la interfaz
2. Validar códigos de planes en formularios
3. Generar listados consistentes

### Ejemplo del contenido de `public/planes/planes.json`:

```json
{
  "planes": [
    { "codigo": "662", "nombre": "662 Profesorado de Música" },
    { "codigo": "662G", "nombre": "662G Profesorado de Música con orientación en Guitarra" },
    { "codigo": "708", "nombre": "708 Técnico Superior en Sonido" }
    // ... más planes
  ]
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
  roles: ["estudiante"], // Puede incluir: "estudiante", "docente", "bedel", "coordinacion", "admin"
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

### Archivo `public/planes/{plan}.json`

Cada archivo representa un plan de estudio completo con todas sus materias (no es una colección de Firestore).

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

### Colección `ofertaAcademica/{ciclo}`

Un **documento único por ciclo** con toda la oferta. Ver el detalle de etapas/materias/comisiones en la sección 2.

```javascript
// Documento: 2026-1 (ID del documento = ciclo)
{
  nombreCiclo: "Ciclo 2026-1",
  actualizadoEn: "2026-01-15T10:00:00.000Z",
  etapas: [
    {
      nombre: "Inscripciones",
      descripcion: "",
      desde: "2026-02-01T00:00:00.000Z", // Timestamp
      hasta: "2026-02-07T23:59:59.999Z", // Timestamp
      materias: [
        {
          id: "AUD01",
          nombre: "Audioperceptiva I",
          tipo: "colectiva",
          comisiones: [
            { id: "0465", cupo: 20, horario: "Lun 16:30 a 18:30", aula: "Aula PB 01", docente: "Ceballos, O." }
          ]
        }
      ]
    }
  ]
}
```

---

## 5. Formato para arrays en Google Sheets

Los arrays (`roles`, `plan`) se exportan con comillas dobles envolviendo el campo y las comillas internas duplicadas.
El detalle y los ejemplos están en [importar-usuarios.md](importar-usuarios.md#exportación-desde-google-sheets): no hace falta mantenerlo duplicado en dos documentos.

---

## 6. Proceso de Importación

1. El equipo (coordinación/bedelía) crea los datos en Google Sheets usando los formatos CSV definidos
2. Se exportan los archivos CSV
3. Se cargan **desde la app** (rol `coordinacion`, `CargaMasiva.vue`, sujeto a las reglas de Firestore)
4. La aplicación accede a los datos directamente desde Firestore y los archivos JSON en `public/planes/`

Este proceso permite:
- Trabajar con herramientas familiares para el equipo (Google Sheets)
- Mantener una estructura de datos óptima para la aplicación
- Separar claramente la edición de datos de la estructura interna