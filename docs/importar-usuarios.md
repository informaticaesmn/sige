# Importar usuarios

> **Estado (30/10/2026):** documento actualizado a **CSV v2** en la etapa E0 del
> [plan de carga de usuarios](plan-carga-usuarios-202610.md). El modelo de datos está en
> [modelo-datos.md](modelo-datos.md).
>
> **Datos actuales:** Firestore solo contiene los usuarios de prueba de `data/usuarios.csv`
> (9 filas, formato legacy). No hay datos reales.

## 1. Dos caminos de importación

| Camino | Rol / credenciales | Alcance | Sujeto a rules |
|---|---|---|---|
| **Carga in-app** (`CargaMasiva.vue` + `useImportarUsuarios.js`) | `coordinacion` (o `admin`) | **Solo estudiantes ingresantes** (`roles = ["estudiante"]`) | Sí |
| **Script** (`scripts/import-usuarios.js`) | Service account | Estudiantes vigentes, docentes, bedeles y coordinadores | No (bypasea rules) |

Ambos caminos comparten el mismo núcleo de validación (E2): normalización, planes con JSON,
fechas, duplicados y construcción de documentos. La diferencia es el origen de los datos y los
roles permitidos.

- La **carga in-app** no reemplaza usuarios existentes y no sirve para remediar casos puntuales:
  es una operación de **inicio de ciclo**.
- El **script** es la vía para cargas masivas que no sean de ingresantes y para pruebas con
  service account.

## 2. Fuente de verdad de los planes

- `public/planes/planes.json` es la **única fuente** de códigos y nombres. No se hardcodea un
  mapa de planes en la app ni en el script.
- `public/planes/{codigo}.json` contiene materias, años y correlatividades.
- Solo se puede dar de alta un plan cuyo JSON exista, se pueda normalizar y esté revisado. Si
  una fila referencia un plan no disponible, **no se escribe nada** y se reportan las filas y
  los planes causantes.

### Disponibilidad actual (30/10/2026)

| Plan | ¿JSON? | ¿Pregrado? | Se puede usar en altas |
|---|---|---|---|
| `662` | Sí | Sí (11 materias de año 0) | ✅ |
| `708` | Sí | No | ✅ (estado inicial `activo`) |
| `662G` | Sí, pero **no normalizable** (`Plan: "62G"`, array legacy, sin año 0, códigos duplicados, equivalencias/correlativas con `662` sin revisar) | No | ❌ bloqueado hasta revisión |
| Otros 34 planes de `planes.json` | No | — | ❌ bloqueados hasta cargar el JSON |

> Los usuarios de prueba ya se limpiaron (30/10/2026) para dejar solo los planes `662` y
> `708`. En Firestore v1 quedaron como nombres completos; en `data/usuarios.csv` como códigos.
> E3 normaliza ambos a la clave canónica. Si apareciera algún documento viejo con `664`, `666`
> o `662G`, la migración lo conserva como histórico, pero **no se puede usar en altas nuevas**
> hasta que el plan esté disponible.

## 3. CSV v2

### 3.1 Columnas

| Columna | Obligatoria | Descripción |
|---|---|---|
| `dni` | Sí | Documento sin puntos ni espacios. Único en el archivo y en Firestore. |
| `nombre` | Sí | Nombre/s. |
| `apellido` | Sí | Apellido/s. |
| `email` | Sí | Email lowercase. Único en el archivo y en Firestore. |
| `plan` | Condicional | Código(s) canónicos de plan (string), ej. `662`, `662G`. Obligatorio si el usuario es estudiante. Array JSON o lista separada por comas. No se aceptan nombres completos en v2. |
| `fecha_inscripcion` | Condicional | Obligatoria si hay planes. Un `AAAA-MM-DD` para todos los planes o un array paralelo al de `plan`. |
| `numero_legajo` | No | Si falta, se genera con el contador (formato previsto `AAAA-NNNN`, a confirmar en E5). |
| `roles` | Condicional | En la **carga in-app** no se pide: se fija `["estudiante"]`. Si viene, debe ser exactamente `["estudiante"]`. En el **script** es obligatoria y acepta todos los roles válidos. |

### 3.2 Formatos aceptados para arrays

```csv
"[""662"",""708""]"
```

o, alternativamente:

```csv
"662,708"
```

Para `fecha_inscripcion` se acepta una fecha única o un array con la misma cantidad de
elementos que `plan`:

```csv
"[""2026-03-02"",""2025-08-11""]"
```

### 3.3 Ejemplos

Carga in-app (solo estudiantes):

```csv
dni,nombre,apellido,email,plan,fecha_inscripcion,numero_legajo
37348389,María José,ORTEGA,majo@ejemplo.com,"[""662""]","2026-03-02",
30941843,Victoria,MACLEAN,prof.vmaclean@gmail.com,"[""662"",""708""]","[""2026-03-02"",""2025-08-11""]",
12345678,Juan,PEREZ,juan@ejemplo.com,"[""708""]","2026-03-02","2026-0007"
```

Script con roles (docentes, bedeles, estudiantes vigentes):

```csv
dni,nombre,apellido,email,roles,plan,fecha_inscripcion,numero_legajo
24109557,Adriana Edith,FALCON,adrianabusina@gmail.com,"[""bedel"",""docente"",""estudiante""]","[""708""]","2024-03-01",
98765432,Administrador,DEL SISTEMA,admin@esmn.com.ar,"[""admin""]",,,
```

### 3.4 Normalización

- `email`: trim + lowercase.
- `dni`: trim y eliminación de puntos/espacios.
- `roles`: trim + lowercase + sin duplicados.
- `plan`: trim de cada código; se conserva el código canónico (no se reemplaza por el nombre).
  Se acepta el alias legacy `62G` → `662G`; cualquier otro código debe existir en
  `planes.json`. Los nombres completos solo se aceptan al normalizar datos v1 de Firestore,
  no en CSV v2.
- `fecha_inscripcion`: `AAAA-MM-DD`; se convierte a `Timestamp` al construir el documento.
- Los encabezados se validan: si falta una columna obligatoria, el archivo completo se rechaza.

## 4. Validación y reglas de aborto

La regla general es **todo-o-nada**: se valida el archivo completo **antes** de escribir. Si
cualquier fila es inválida, no se escribe ningún documento.

Se rechaza la carga si:

1. Falta `dni`, `nombre`, `apellido` o `email`.
2. El email no tiene formato válido.
3. Un rol no es válido, o la carga in-app incluye roles distintos de `estudiante`.
4. Un estudiante no tiene al menos un plan; un no-estudiante tiene planes (advertencia en el
   script, error en la carga in-app de estudiantes).
5. Un plan no está en `planes.json`, no tiene JSON, no se puede normalizar o está bloqueado
   (`662G`).
6. Falta `fecha_inscripcion` para algún plan, la fecha no es válida o el array de fechas no
   coincide en longitud con el de planes.
7. Hay emails o DNI repetidos **dentro del archivo**.
8. Hay emails o DNI que ya existen en Firestore (pre-registro o usuario registrado).
9. `numero_legajo` tiene un formato inválido o, si se define como único, ya existe.

### 4.1 Duplicados en memoria

Antes de consultar Firestore se deduplican **email** y **DNI** dentro del CSV. Esto evita
lecturas innecesarias y, sobre todo, que dos `batch.set` al mismo `usuarios/{email}` se pisen
silenciosamente.

### 4.2 Duplicados en Firestore

- Se consulta por **chunks de 30** con `in` sobre `email` y, en una consulta separada, sobre
  `dni` (Firestore no permite combinar dos `in` en una sola consulta).
- Si un email ya existe como pre-registro (`usuarios/{email}`) o como usuario registrado
  (`usuarios/{uid}` con el campo `email`), se aborta la carga completa.
- **Nunca** se modifica un usuario ya registrado.

### 4.3 Costo estimado

Para N = 800 ingresantes: unas **854 lecturas** de validación (2 × ⌈800/30⌉ consultas `in`;
~800 coincidencias + ≤54 consultas vacías) y ~1.600 escrituras (`usuario` + `legajo` por fila,
más la auditoría). A los precios actuales de Firestore es despreciable; el objetivo es la
correctitud, no el costo.

## 5. Qué escribe una carga

Por cada fila válida, en un `writeBatch` de ≤500 **operaciones** (cada fila consume 2:
`usuario` + `legajo`, así que un lote alcanza ~250 filas):

1. `usuarios/{email}` con el shape v2:
   - `personaId` (UUID generado en el cliente),
   - `dni`, `nombre`, `apellido`, `email`,
   - `roles` (`["estudiante"]` en la carga in-app),
   - `estadoRegistro: "pendiente_registro"`,
   - `estadoUsuario: "activo"`,
   - `planes` como **mapa por código**,
   - `numeroLegajo`,
   - `creadoEl`.
2. `legajos/{personaId}` con los datos administrativos disponibles y el mismo `numeroLegajo`.
3. Al finalizar: `importaciones/{id}` con el hash del archivo, el usuario que ejecutó, totales y
   errores.

### 5.1 Estado inicial del plan

| Plan | Estado inicial |
|---|---|
| Con materias de año `0` (pregrado) | `ingresante` |
| Sin materias de año `0` | `activo` |

Cada entrada del mapa guarda: `id`, `nombre` (snapshot), `estado`, `fechaInscripcion`,
`vigente: true` y `origen: "carga_masiva"` (o `"script"`).

### 5.2 Lotes y fallos parciales

La validación es todo-o-nada, pero Firestore no ofrece una transacción de miles de documentos.
Las escrituras se parten en lotes de ≤500. Si un lote falla después de que otros ya se
confirmaron, el resultado informa **importados vs fallidos** y las filas afectadas; esos casos
se limpian a mano con el reporte (no se reintenta a ciegas).

## 6. Ejecución

### 6.1 Carga in-app

1. Entrar con un usuario `coordinacion` o `admin`.
2. Abrir la vista de carga masiva desde el menú de coordinación (o por URL).
3. Seleccionar el CSV v2 y previsualizar: filas válidas, con error y duplicadas.
4. Confirmar. Si hay un solo error, no se escribe nada.

### 6.2 Script

```bash
# Dry-run (por defecto): valida y muestra el diff, no escribe
node scripts/import-usuarios.js --dry-run

# Aplicar los cambios
node scripts/import-usuarios.js --apply
```

- `--dry-run` es el modo por defecto; `--apply` debe ser explícito.
- El script lee `./data/usuarios.csv` (no se versiona: ver `data/README.md`).
- El reporte por consola indica filas válidas, errores y planes bloqueados. No se debe
  versionar ningún archivo de salida con datos personales.

> **Estado:** `--dry-run`/`--apply` y el núcleo v2 son el objetivo de **E10**. Hasta entonces,
> `scripts/import-usuarios.js` sigue con el flujo v1 y escribe directamente.

## 7. Proceso de registro posterior

1. Los usuarios importados quedan con `estadoRegistro: "pendiente_registro"` y sin `uid`.
2. Se registran en la app con el email cargado.
3. La Cloud Function `registrarUsuario` crea la cuenta en Auth y migra el documento de
   `usuarios/{email}` a `usuarios/{uid}` en un `writeBatch`.
4. La migración **copia todos los campos**, incluidos `personaId`, `planes` y
   `numeroLegajo`; el legajo no se mueve.
5. `estadoRegistro` pasa a `"registrado"`.

## 8. Migración de los datos de prueba

`data/usuarios.csv` sigue en **formato legacy** (`dni,nombre,apellido,email,roles,plan`), pero
sus planes ya se limpiaron a los códigos con JSON (`662`, `708`). No se usa como entrada de la
carga in-app v2.

Para la transición:

1. E3 migra los documentos existentes con `scripts/migrar-usuarios-v2.js` (dry-run primero).
2. E10 adapta `scripts/import-usuarios.js` al núcleo v2 y permite un dry-run sobre el CSV de
   prueba.
3. Si se necesita volver a cargar el CSV legacy, se convierte primero a v2 o se usa el script
   con la compatibilidad que defina E10.

## 9. Consideraciones

- Los emails y DNI deben ser únicos por usuario.
- Los roles y emails se normalizan a minúsculas.
- `carrera = plan`: no hay un campo `carrera` independiente.
- Un usuario puede tener varios planes, cada uno con su fecha de inscripción y estado.
- Los planes sin JSON no se pueden asignar en altas nuevas.
- La fecha de importación y el `personaId` se registran automáticamente.
- No se versionan CSV ni reportes con datos personales.
