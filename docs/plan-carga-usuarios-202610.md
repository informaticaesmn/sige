# Plan: carga de usuarios, legajo digital y estados académicos

> **Estado:** plan aprobado (30/10/2026) y en ejecución por etapas. E0 y E1 completadas.
> **Alcance:** tres flujos de carga de usuarios (masiva de ingresantes, alta individual de
> estudiantes y alta individual de docentes), el modelo de datos que los soporta (legajo
> digital, planes por usuario y estados) y el diseño —sin implementación— del cálculo de
> estados derivados.
> **Fuera de alcance:** cálculo automático de `por_vencer`/`vencido`, revisión y carga de los
> planes JSON faltantes, rediseño de las vistas de Bedel, cambio de email de usuarios
> registrados, creación de cuentas de Auth desde la app y solicitudes de actualización de
> legajo por parte del estudiante. Ver §10.

---

## 0. Resumen ejecutivo

- La carga masiva de ingresantes **ya existe**; este plan la endurece (solo estudiantes,
  fecha de inscripción obligatoria, aborto total si falta un JSON de plan, detección de
  duplicados y previsualización) en lugar de reescribirla.
- El alta individual **no existe**: se construye una base compartida (composable +
  formulario) y dos puntos de entrada independientes, sin acoplarlos a las vistas actuales
  de Bedel.
- `perfiles` **no existe** en la implementación. Se crea como **legajo digital** (`legajos`),
  vinculado por un `personaId` estable, independiente de la migración `email→uid`.
- Se separan tres conceptos hoy mezclados: **registro** (`estadoRegistro`), **estado del
  usuario** (`estadoUsuario`) y **estado por plan** (`planes[planId].estado`).
- Los estados `por_vencer` y `vencido`, y el paso `ingresante → activo`, **se diseñan pero
  no se implementan** en este plan. El modelo queda preparado para calcularlos sin migrar
  datos.

---

## 1. Punto de partida verificado

| Pieza | Estado real (30/10/2026) |
|---|---|
| `usuarios` | Pre-registro con ID = `email` (lowercase), `estado: 'pendiente_registro'`, campos `dni, nombre, apellido, email, roles[], planes[]` (array de nombres). Post-registro pasa a `usuarios/{uid}` con `uid` y `actualizadoEn`. |
| `perfiles` | **No existe.** El modelo v2 lo reemplaza por `legajos` (legajo digital). `PerfilCard.vue` lee `carrera` y `legajo`, pero nadie los escribe. |
| Carga masiva | **Existe** (`CargaMasiva.vue` + `useImportarUsuarios.js`): CSV, valida todo antes de escribir, `writeBatch` en lotes de ≤500. También hay `scripts/import-usuarios.js` con service account. |
| Alta individual | **No existe** (ni estudiante ni docente). |
| Rules de `usuarios` | `create`: admin, o coordinación sin poder otorgar `admin`/`coordinacion`. **Bedel no puede crear.** Bedel solo actualiza usuarios con rol `estudiante` y sin tocar `roles`. |
| Custom claims | Se setean en `registrarUsuario`. `actualizarRoles()` escribe solo Firestore y **no sincroniza claims** (deuda aparte). |
| Planes | `public/planes/planes.json` lista **37** planes; solo **3** tienen JSON (`662`, `662G`, `708`). Solo **2** son utilizables (`662`, `708`); `662G` está bloqueado. |
| Lectura del plan del usuario | `TableroE.vue` y `PlanesEstudioView.vue` leen `user.plan` (singular); la importación escribe `planes` (plural). **Hoy un estudiante importado no ve sus planes.** |
| Tests | `test:unit` 72/72, `test:integration` 13/13, `build` OK, `lint` 0 errores / 534 warnings. |

> **Datos actuales (30/10/2026):** Firestore solo contiene los **9 usuarios de prueba**
> cargados desde `data/usuarios.csv`. No hay datos reales. El CSV de prueba sigue en formato
> legacy (`roles` + `plan` array). Los planes de esos usuarios ya se limpiaron para dejar solo
> `662` y `708`: en Firestore v1 como nombres completos, en el CSV como códigos. E3 los
> normaliza a la clave canónica.

---

## 2. Decisiones cerradas

### D1 — Legajo digital (ex "Perfiles")

- Se crea la colección **solo con datos administrativos** (fecha de nacimiento, domicilios,
  teléfonos, documentación, etc.). No duplica los datos de acceso de `usuarios`.
- **Nombre recomendado:** colección `legajos`, nombre funcional **"Legajo digital"**.
  - Se descarta `perfiles`: colisiona con el "perfil" de la UI (`PerfilCard`, futura ruta
    `/perfil`) y es ambiguo.
  - `legajos` describe el expediente administrativo y es el término institucional.
  - Para evitar ambigüedad, el **número** se llama siempre `numeroLegajo`; nunca "legajo" a
    secas.
- **Vínculo con Usuarios:** `personaId` (UUID) generado en el pre-registro.
  - `usuarios/{docId}.personaId` ↔ `legajos/{personaId}`.
  - No depende de `email` ni de `uid`: la migración `email→uid` copia el campo y el legajo
    no se toca. Un futuro cambio de email tampoco lo afecta.
  - Alternativa considerada: `legajos/{dni}` (más simple, sin campo extra). Se descarta
    porque el DNI es PII en el ID del documento, puede corregirse y obligaría a mover el
    legajo.
- **Permisos:** bedel, coordinación y admin pueden crear/actualizar el legajo. El estudiante
  **no** (queda previsto para una futura solicitud de actualización, sin planificarla acá).

### D2 — El alta individual crea pre-registro

- Se mantiene el patrón actual: se crea `usuarios/{email}` con
  `estadoRegistro: 'pendiente_registro'`. La persona crea su contraseña al confirmar el
  registro (Cloud Function `registrarUsuario`).
- **No** se crean cuentas en Auth desde la app en este plan.
- Los custom claims siguen saliendo de `roles` del pre-registro al registrarse.

### D3 — Campos

- **Obligatorios:** `dni`, `nombre`, `apellido`, `email`, `roles`, `planes` (al menos uno si
  es estudiante) y `fechaInscripcion` por plan.
- **Carrera = plan.** No existe un campo `carrera` separado. Un usuario puede tener varios
  planes.
- **`numeroLegajo`:** se genera en la carga masiva de ingresantes; el bedel también puede
  generarlo/editarlo individualmente.
- **Campos extra** (foto de identificación, QR de validación, documentación): fuera de
  alcance, pero el legajo queda abierto (`documentacion[]`, `datosAdministrativos{}`).

### D4 — Permisos de creación individual

| Rol que crea | Puede crear |
|---|---|
| Admin | cualquier rol (`estudiante`, `docente`, `bedel`, `coordinacion`, `admin`) |
| Coordinación | `estudiante`, `docente`, `bedel` (nunca `admin` ni `coordinacion`) |
| Bedel | solo `estudiante` (pre-registro) |
| Estudiante | nada |

### D5 — Unicidad de DNI

- Sí: se valida con query **antes** de crear (`where('dni','==', dni)`), además de la
  unicidad de email.
- Estimación de lecturas en §7.

### D6 — Duplicados de email en carga masiva

- Si un email ya existe (pre-registro o registrado): **abortar toda la carga y reportar**.
- Nunca se toca un usuario ya registrado (respeta F2-2 de `docs/contexto.md`).

### D7 — Carga masiva in-app solo para ingresantes

- La carga in-app acepta **solo rol `estudiante`**. El resto de las cargas (bedeles,
  docentes, estudiantes vigentes) se hace con el script de service account.
- **Mejora propuesta:** un único núcleo de validación puro compartido por la app y el
  script (E2), más un registro de auditoría `importaciones/{id}` (quién, cuándo, hash del
  archivo, totales y errores). Ver E5.

### D8 — Planes sin JSON: bloquear toda la carga

- Los JSON de planes son la fuente de verdad de correlatividades. Solo se puede dar de alta
  un plan cuyo JSON exista y esté revisado.
- Si una fila referencia un plan sin JSON: **no se escribe nada** y se reportan filas y
  planes causantes.
- Mismo criterio en el alta individual (ver §6, "por qué no tratarla distinto").
- Revisión/carga de los planes faltantes: fuera de alcance.

### D9 — Carga masiva de ingresantes in-app; el resto por script

- Confirmado.

### D10 — Acceso a las vistas nuevas

- Solo por URL, **sin botón temporal**. Las vistas de Bedel se rediseñan en otra
  conversación (vista centrada en un estudiante por nombre/apellido/DNI; vista de
  secuencias). No planificarlas acá.

### D11 — Códigos de plan: código oficial como string

- El código canónico es el de `public/planes/planes.json`, **siempre como string**:
  `662`, `708`, `662G`, `662A`, etc. No se deriva ni se trunca.
- `62G` es un **alias legacy** de `662G` (aparece en el JSON viejo). Se acepta al leer datos
  históricos, pero nunca se escribe como código canónico.
- El código identifica el plan; el nombre es solo para mostrar y se resuelve desde
  `planes.json` (en v2 se puede guardar como snapshot en `planes[codigo].nombre`).
- Los planes de orientación (`662A`…`662X`) comparten entre sí un tronco común y solo cambian
  la materia de instrumento fundamental; **no son idénticos al `662` sin orientación**. La
  identidad sigue siendo el código oficial; si se quiere evitar duplicar 24 JSON, se compone
  `tronco común de orientaciones + instrumento` al cargar (ver §9 de `modelo-datos.md`).
- El apóstrofo de Google Sheets es una solución de planilla, no del modelo: la columna debe
  formatearse como texto y el CSV debe exportar el código entre comillas.

### Modelo de estados

1. **Registro** (`estadoRegistro`): `pendiente_registro` | `registrado`. Vive en el usuario.
2. **Estado del usuario** (`estadoUsuario`): `activo` | `inactivo`. Vive en el usuario,
   separado del registro.
   - **`inactivo-graduado` sobra:** la graduación es por plan. Un usuario graduado de un plan
     puede seguir activo por otro plan o por su rol docente. No se agrega.
   - **Recomendación:** guardarlo como decisión administrativa (suspensión, desvinculación),
     no derivarlo silenciosamente de los planes. Para evitar contradicciones, la UI muestra
     un aviso cuando `estadoUsuario = inactivo` y hay planes `vigentes` en estados
     académicos activos; la fuente de verdad académica son los planes. Alternativa
     considerada: derivarlo siempre; se descarta porque no cubre desvinculaciones sin
     cambio de plan. Detalle en §4.4.
3. **Estado por plan** (`planes[planId].estado`): `ingresante`, `activo`, `por_vencer`,
   `vencido`, `graduado`, `condicional`.

**Significado (cerrado):**

| Estado | Significado |
|---|---|
| `ingresante` | Cursando el pregrado del plan. Se mantiene hasta completar **todas** las materias de pregrado (no dura un año fijo). Solo en planes con pregrado. |
| `activo` | Cursando con regularidad, ya fuera del pregrado, o inscripto en un plan sin pregrado. |
| `por_vencer` | Aviso previo al vencimiento (umbral configurable, ver §11). |
| `vencido` | Más de 4 años desde la última materia acreditada. |
| `graduado` | Egresó del plan. |
| `condicional` | Viene de otra institución; cursa algunos espacios hasta que se definan las equivalencias. Al confirmarse pasa a `activo`. |

### Pregrado

- Regla: **toda materia con año `00` es de pregrado**. En los JSON actuales el año se
  escribe `0` (clave `plan-0.N`), no `AA=00` (ver Anexo A).
- Un plan es "sin pregrado" si su JSON no tiene ninguna materia de año 0. No se hardcodea
  `708`: se detecta del JSON.
- En planes sin pregrado, el estado inicial es `activo` (nunca `ingresante`), tanto en la
  carga masiva como en el alta individual.

### Estado inicial al dar de alta

| Flujo | Estado inicial |
|---|---|
| Carga masiva de ingresantes | `ingresante` si el plan tiene pregrado; `activo` si no. Se calcula, no se elige. |
| Alta individual (estudiante) | El operador elige **uno** de: `ingresante` (solo planes con pregrado), `activo` (año posterior o plan sin pregrado) o `condicional` (pase/equivalencia). Obligatorio y coherente con el plan. |

### Vencimiento

- `por_vencer` y `vencido` **no se cargan a mano**: se calculan.
- `ingresante` queda exento.
- `vencido`: más de 4 años desde la última materia acreditada.
- `por_vencer`: umbral configurable, **no definido** (ver §11). No se asume que coincida
  con el filtro de 3 años.
- La **fecha de inscripción al plan es obligatoria** y se guarda por plan (ver §4.2).

### Regla de abandono en primer año

- **Provisoria.** No se incorpora al modelo. El diseño no depende de ella: un abandono se
  expresaría cambiando `estado`/`vigente` del plan o `estadoUsuario`, sin migrar datos.
- Queda en §11.

---

## 3. Modelo de datos propuesto

### 3.1 Documento `usuarios/{docId}`

`docId` = `email` (pre-registro) o `uid` (registrado).

```js
{
  // Identidad
  personaId: "3f2a...uuid",        // estable; nunca cambia con email/uid
  dni: "37348389",                 // string normalizado (sin puntos ni espacios)
  nombre: "María José",
  apellido: "ORTEGA",
  email: "majo@ejemplo.com",       // lowercase

  // Acceso
  roles: ["estudiante"],           // lowercase, sin duplicados
  estadoRegistro: "pendiente_registro" | "registrado",
  uid: "<uid>",                    // solo post-registro
  estadoUsuario: "activo" | "inactivo",
  estadoUsuarioActualizadoEn: Timestamp,
  motivoEstado: "",                // opcional, para inactivo

  // Académico
  planes: {
    "662": {
      id: "662",
      nombre: "662 Profesorado de Música",  // snapshot para mostrar sin leer planes.json
      estado: "ingresante",                 // los 6 valores de §2
      fechaInscripcion: Timestamp,          // obligatoria
      vigente: true,                        // false cuando el plan se cierra/cambia
      origen: "carga_masiva" | "alta_individual" | "pase" | "script",
      // Campos previstos para el cálculo (no se escriben en este plan):
      ultimaAcreditacion: Timestamp | null,
      estadoCalculadoEn: Timestamp | null
    }
  },

  // Legajo: solo el número; el resto vive en legajos/{personaId}
  numeroLegajo: "2026-0001" | null,

  creadoEl: Timestamp,
  actualizadoEn: Timestamp
}
```

Notas:
- `estadoRegistro` reemplaza al actual `estado` (que hoy significa "pendiente de registro").
- `planes` pasa de **array de nombres** a **mapa por código de plan**.
- `personaId` se genera en el cliente (`crypto.randomUUID()`) al crear el pre-registro.
- No se guarda `carrera`: carrera = plan.
- `nombre` dentro de cada plan es un snapshot; si cambia el catálogo, se puede refrescar sin
  romper la lectura.

### 3.2 Planes del usuario: comparación de estructuras

| Criterio | A) Array de objetos | B) Mapa por código de plan | C) Subcolección `usuarios/{docId}/planes/{planId}` |
|---|---|---|---|
| Acceso a un plan | `find()` en cada lectura | `planes["662"]` directo | `getDoc()` extra |
| Actualizar un plan | reescribir el array completo | `updateDoc({ 'planes.662.estado': ... })` atómico | `updateDoc()` del doc hijo |
| Rules | difícil validar cada elemento (sin loops) | valida mapa y campos conocidos; keys dinámicas | bloque de match propio, más simple |
| Query "todos los vencidos" | `array-contains` sobre campo derivado | requiere campo derivado `estadosPlanes[]` | `collectionGroup('planes').where('estado','==','vencido')` ✅ |
| Migración `email→uid` | copia el campo tal cual | copia el campo tal cual | **hay que copiar la subcolección** (la CF actual no lo hace) |
| CSV / importación | parseo de array | armado de mapa por código | N escrituras extra |
| Costo de lectura del usuario | 1 doc | 1 doc | 1 doc + 1 query |

**Recomendación: B (mapa por código).** Mantiene la migración actual sin cambios y permite
actualizaciones atómicas por plan. Para consultas transversales ("todos los por vencer"),
agregar un campo derivado `estadosPlanes: ["por_vencer"]` (o `tienePlanPorVencer: true`)
mantenido por el mismo proceso que calcule los estados. La opción C se reserva para si el
volumen o las consultas lo justifican; hoy no.

### 3.3 Legajo digital: `legajos/{personaId}`

```js
{
  personaId: "3f2a...uuid",
  numeroLegajo: "2026-0001",
  usuarioDocId: "email-o-uid",     // referencia informativa, puede cambiar
  dni: "...", nombre: "...", apellido: "...",   // snapshot
  fechaNacimiento: Timestamp | null,
  domicilios: [
    { tipo: "real"|"legal", calle, numero, piso, depto, localidad, provincia, cp }
  ],
  telefonos: [{ tipo: "fijo"|"celular", numero, whatsapp: true }],
  datosAdministrativos: {},        // extensible
  documentacion: [                 // previsto, no implementado
    { tipo: "dni_frente"|"dni_dorso"|"partida"|"foto", estado, url, validadoEn, validadoPor }
  ],
  creadoEl, actualizadoEn, actualizadoPor
}
```

- **Un legajo por persona**, no por plan.
- El vínculo es `usuarios.personaId`, no el email ni el uid.
- Se crea en el mismo `writeBatch` que el pre-registro (carga masiva y alta individual).
- Se lee de forma esporádica (ficha del estudiante), así que el `getDoc` extra no es un
  problema.
- `numeroLegajo` vive acá como fuente única; si una lista necesita mostrarlo sin abrir el
  legajo, se evalúa denormalizarlo en `usuarios` (decisión futura).

### 3.4 Catálogo de planes y detección de pregrado

- Fuente: `public/planes/planes.json` (código y nombre) + `public/planes/{codigo}.json`
  (materias y correlatividades).
- Funciones puras nuevas en `src/utils/planes.js`:
  - `normalizarPlanJson(json, codigo)` → `{ disponible, codigo, plan, nombre, formato,
    materias: { id: { anio, nombre, cursada, correlativas } }, motivo }`. No lanza
    excepciones; si no puede normalizar devuelve `disponible: false` y un `motivo`.
    Soporta los dos formatos actuales (objeto y array legacy).
  - `anioDeMateria(id)` → año (`0` = pregrado). Acepta `plan-A.N`, `plan-AA-NN` y legacy.
  - `tienePregrado(plan)` → `true` si existe alguna materia con año `0`.
  - `estadoInicialDePlan(plan)` → `ingresante` | `activo` | `null` (no disponible).
  - `catalogoDePlanes()` / `esPlanDisponible(codigo)` → catálogo explícito de códigos con
    JSON revisado (para validar D8). Hoy: `662` y `708`.
  - En E2 se suma `resolverCodigoPlan(valor)` (o equivalente): acepta el código canónico, el
    alias legacy `62G` → `662G` y, solo para datos v1, el nombre completo
    (`"662 Profesorado de Música"` → `662`). Devuelve `{ codigo, nombre }` desde `planes.json`.
- El código canónico es el oficial de `planes.json`, siempre string (D11). No se trunca a
  `62G` ni se deriva del nombre.
- Si el JSON no se puede normalizar, el `plan` interno no coincide con el código del archivo
  (o con su alias legacy), hay materias sin año o códigos duplicados, el plan se considera
  **no disponible** y bloquea la carga.

### 3.5 CSV v2 (carga masiva de ingresantes)

```csv
dni,nombre,apellido,email,plan,fecha_inscripcion,numero_legajo
37348389,María José,ORTEGA,majo@ejemplo.com,"[""662""]","2026-03-02",
30941843,Victoria,MACLEAN,prof.vmaclean@gmail.com,"[""662"",""708""]","[""2026-03-02"",""2025-08-11""]",
12345678,Juan,PEREZ,juan@ejemplo.com,"[""708""]","2026-03-02","2026-0007"
```

- `roles` no se pide: la carga in-app fija `estudiante` (D7). Si la columna viene, debe ser
  exactamente `["estudiante"]` o la fila se rechaza.
- `fecha_inscripcion`: un solo `AAAA-MM-DD` (aplica a todos los planes de la fila) o un
  array paralelo al de `plan`. Obligatoria.
- `numero_legajo`: opcional; si falta, se genera.
- Validación: archivo completo **antes** de escribir (D8). Cualquier fila inválida, plan sin
  JSON, email/DNI duplicado (en el archivo o en Firestore) → no se escribe nada.

### 3.6 Máquina de estados (solo lo decidido)

```
carga masiva:   plan con pregrado → ingresante
                plan sin pregrado  → activo

alta individual: operador elige ingresante | activo | condicional
                 (ingresante solo si el plan tiene pregrado)

condicional --(equivalencias confirmadas)--> activo
ingresante  --(todas las materias 00 acreditadas)--> activo   [calculado, fuera de alcance]
activo      --(> 4 años sin acreditar)--> vencido             [calculado, fuera de alcance]
activo      --(umbral configurable)--> por_vencer             [calculado, fuera de alcance]
cualquiera  --(egreso)--> graduado                            [quién/cuándo: abierto]
```

- No se inventan otras transiciones. Las que faltan están en §11.
- `vigente: false` cierra una entrada de plan sin necesidad de un séptimo estado.

### 3.7 "Condicional" que termina cambiando de plan

| | A) Modificar la entrada existente | B) Cerrar la anterior y agregar una nueva |
|---|---|---|
| Datos | Se cambia `estado` y, si corresponde, el código del plan (hay que borrar y recrear la clave) | Vieja: `vigente: false`; nueva: entrada con su propio estado y fecha |
| Historial | Se pierde el plan original y su fecha | Se conserva |
| `fechaInscripcion` | Se pisa (¿con cuál?) | La vieja conserva la original; la nueva usa la fecha real de cambio |
| Consultas | Una sola entrada | Hay que filtrar `vigente == true` para el estado actual |
| Rules | Update de un campo | Update + create |
| Riesgo | Bajo, pero destructivo | Bajo; más datos |

**Recomendación: B.** Cerrar la entrada condicional (`vigente: false`, conservando su
`estado` y `fechaInscripcion`) y agregar la nueva con su fecha real. El estado académico
"actual" se calcula solo sobre entradas `vigente: true`. Así el historial sobrevive y no
hace falta un estado `cerrado`.

---

## 4. Diseño del cálculo de estados derivados (sin implementar)

### 4.1 `ingresante → activo`

- Condición: todas las materias de pregrado del plan (año `0`) están acreditadas.
- Fuente de acreditación: `trayectoriaAcademica` (`estudianteId`, `materiaId`, `resultado`,
  `fecha`), según `docs/modelo-datos.md`.
- Opciones:
  - **(a) Derivar al leer:** el tablero del estudiante calcula contra su historial. Simple y
    siempre consistente; imposible de usar en listas y caro si se repite.
  - **(b) Guardar y actualizar con un trigger:** al escribir en `trayectoriaAcademica`, una
    Cloud Function recalcula el estado del plan y lo guarda. Consultas y rules leen el campo.
- **Recomendación: (b) con trigger** (no programado: el evento ya existe). Agregar una
  reconciliación periódica de respaldo.

### 4.2 `por_vencer` / `vencido`

- Base: `vencido` si pasaron más de 4 años desde la última acreditación.
- Fuente: la `fecha` más reciente de `trayectoriaAcademica` con resultado aprobatorio, para
  ese plan.
- Opciones:
  - **(a) Derivar al leer:** consistente, sin escrituras; requiere leer el historial de cada
    estudiante y no permite consultar "todos los por vencer".
  - **(b) Guardar + proceso programado:** un job (Cloud Scheduler + Function) recalcula
    `planes[planId].estado` y `ultimaAcreditacion`, y actualiza un campo derivado
    `estadosPlanes[]` para consultas. Barato de leer y consultable; consistencia eventual
    (depende de la frecuencia del job).
- **Recomendación: (b)**, con `ultimaAcreditacion` denormalizado por plan. Para la ficha de
  un estudiante puntual se puede ofrecer un cálculo on-demand como respaldo.

### 4.3 Validación del pre-filtro de 3 años

La propuesta es: si `fechaInscripcion` tiene menos de 3 años, no leer el historial.

**No es correcta en general.** Casos que la rompen:

1. **Equivalencias con fechas anteriores a la inscripción:** un estudiante que ingresa en
   2026 con materias acreditadas en 2019 quedaría `vencido` el primer día (más de 4 años
   desde 2019), pero el pre-filtro no lo detecta porque la inscripción es reciente.
2. **Cambio de plan / reinscripción:** la nueva `fechaInscripcion` reinicia el pre-filtro,
   pero el historial (y la última acreditación) puede ser viejo.
3. **Reingreso después de un período sin cursar:** misma situación.
4. **Planes sin pregrado:** si nunca acreditó nada, no hay "última acreditación"; hay que
   definir el fallback (¿`fechaInscripcion`?).
5. **Varios planes:** el reloj es por plan, no por usuario; el pre-filtro debe evaluarse por
   entrada de plan.

**Corrección propuesta:** guardar `ultimaAcreditacion` por plan (actualizada por el trigger
de `trayectoriaAcademica`). Entonces el job lee solo `usuarios` (1 lectura por estudiante) y
calcula sin historial. Si se insiste en no denormalizar, el pre-filtro solo es válido si se
**ignoran o se clampan** las fechas de equivalencias a la fecha de inscripción, lo que cambia
la regla de negocio. No se recomienda.

### 4.4 `estadoUsuario`: guardado vs derivado

- **Guardado:** permite representar suspensión o desvinculación sin tocar planes; requiere
  que alguien lo mantenga y puede contradecir los planes.
- **Derivado:** sin contradicciones, pero no cubre decisiones administrativas y complica las
  consultas.
- **Recomendación:** guardar `estadoUsuario` como decisión administrativa y **no** crear
  `inactivo-graduado`. La UI muestra `estadoAcademico` calculado (a partir de los planes
  `vigentes`) y advierte si contradice `estadoUsuario`. No se auto-escribe uno a partir del
  otro.

### 4.5 Parámetros configurables

- `config/estadosPlanes` (o equivalente):
  - `umbralPorVencerMeses` (sin definir; ver §11).
  - `aniosVencimiento` = 4.
  - `aniosFiltroPrevios` = 3 (solo si se usa el pre-filtro; con `ultimaAcreditacion` no hace
    falta).
- No hardcodear umbrales en el código.

---

## 5. Matriz de permisos (rules objetivo)

| Acción | Admin | Coordinación | Bedel | Estudiante |
|---|---|---|---|---|
| Leer `usuarios` | Todos | Todos | Todos | Solo el propio |
| Crear `usuarios` | Cualquier rol | `estudiante`, `docente`, `bedel` | Solo `estudiante` (pre-registro) | — |
| Editar `roles` | ✅ | ❌ | ❌ | ❌ |
| Editar datos no-roles de un estudiante | ✅ | ✅ | ✅ | Solo el propio, sin `roles` |
| Crear/actualizar `legajos` | ✅ | ✅ | ✅ | ❌ (futuro: solicitud) |
| Leer `legajos` | ✅ | ✅ | ✅ | ❌ (futuro: el propio) |
| Escribir `ofertaAcademica` | ✅ | ✅ | ❌ | ❌ |
| Escribir `importaciones` (auditoría) | ✅ | ✅ | ❌ | ❌ |

Validaciones mínimas en `create` de `usuarios`:
- `estadoRegistro == 'pendiente_registro'` y `uid` ausente.
- `personaId` presente y con formato UUID.
- `email` igual al ID del documento (cuando el ID es email).
- `roles` no vacío; coordinación no puede incluir `admin`/`coordinacion`.
- Bedel: `roles == ['estudiante']`.
- Si `roles` incluye `estudiante`, `planes` es un mapa no vacío.

Limitación: rules no puede iterar mapas; la validación profunda (coherencia estado/plan,
fechas, planes con JSON) es del cliente + tests. Las rules son la última barrera, no la
única.

---

## 6. Costo de las validaciones de unicidad (D5)

### Alta individual

| Operación | Lecturas | Escrituras |
|---|---|---|
| `where('email','==',email)` (limit 1) | 1 (mínimo 1 aunque no haya match) | — |
| `where('dni','==',dni)` (limit 1) | 1 | — |
| Contador de legajo (transacción) | 1 | 1 |
| `usuarios` + `legajos` | — | 2 |
| **Total** | **~3** | **~3** |

### Carga masiva (N = 800 ingresantes)

| Estrategia | Consultas | Lecturas aproximadas |
|---|---|---|
| 1 query por fila y por campo | 1.600 | ~1.600 (mínimo 1 por query vacía) |
| Chunks de 30 con `in` | 2 × ⌈800/30⌉ = 54 | ~800 (matches) + ≤54 (vacías) ≈ **854** |
| `getDocs` de toda la colección | 1 | ~total de usuarios (crece con la base, no con el lote) |

- **Recomendación:** chunks de `in` de 30 sobre `email` y sobre `dni` (dos consultas
  separadas; Firestore no permite combinar dos `in` en una). Escala con el tamaño del lote,
  no con el total histórico.
- Antes de consultar, deduplicar **en memoria** el archivo (email y DNI repetidos dentro del
  CSV). Eso evita lecturas y, sobre todo, evita que dos `batch.set` al mismo `usuarios/{email}`
  se pisen silenciosamente.
- Escrituras: 1 por usuario + 1 por legajo (si se crea) + 1 por el registro de auditoría.
- **Costo monetario:** del orden de 1.000 lecturas y 1.600 escrituras por carga anual; a los
  precios actuales de Firestore es **despreciable (centavos)**. El problema no es el costo,
  es la correctitud (duplicados y aborto total).

---

## 7. Etapas de implementación

> Convención: una etapa = un commit pequeño (`feat:`, `fix:`, `refactor:`, `docs:`) lanzado
> con `update-dev.ps1` (que corre unit + build). `lint` e `integration` se corren a mano
> antes de cada commit. Antes de tocar `tests/`, cargar la skill **`testing`**.

### E0 — Contrato de datos y documentación (bloqueante)

**Objetivo:** dejar aprobado el shape de §3 y la matriz de §5 antes de escribir código.

> **Estado:** ✅ **Completada (30/10/2026).** Documentos actualizados; no se tocó código ni
> colecciones.

**Pasos**
1. Revisar y aprobar este documento.
2. Actualizar `docs/modelo-datos.md`: `legajos`, `planes` como mapa, `estadoRegistro`,
   `estadoUsuario`, estados por plan.
3. Actualizar `docs/contexto.md`: modelo de datos, composables y estado de implementación.
4. Actualizar `docs/importar-usuarios.md`: CSV v2 y reglas de aborto.

**Archivos:** `docs/modelo-datos.md`, `docs/contexto.md`, `docs/importar-usuarios.md`.
**Colecciones:** ninguna.
**Verificación:** revisión conjunta; el documento no se contradice con `firestore.rules` ni
con el CSV de §3.5.
**Depende de:** nada.

---

### E1 — Utilidades de planes y detección de pregrado

**Objetivo:** una única forma de leer un plan JSON y decidir si tiene pregrado.

> **Estado:** ✅ **Completada (30/10/2026).** `src/utils/planes.js` normaliza el formato
> actual (`662`, `708`) y el legacy, detecta pregrado y expone un catálogo explícito con
> solo `662` y `708`. `662G` queda fuera a propósito: su JSON interno declara `Plan: "62G"`,
> no tiene año 0 (pregrado), tiene códigos de materia duplicados y sus equivalencias y
> correlativas con `662` todavía no están revisadas. 13 tests nuevos; suite 72/72 en verde.

**Pasos**
1. Crear `src/utils/planes.js` con las funciones de §3.4.
2. Soportar los dos formatos actuales y reportar el que no se pueda normalizar.
3. Test unitario con fixtures de `662`, `708` y `662G` (incluido el caso legacy).
4. Test explícito: `708` → sin pregrado; `662` → 11 materias de pregrado; `662G` → marcado
   como no disponible.

**Archivos:** `src/utils/planes.js` (nuevo), `tests/unit/utils/planes.spec.js` (nuevo).
**Colecciones:** ninguna.
**Verificación:** `npm run test:unit`; los tests validan el catálogo disponible y que `662G`
queda como no disponible.
**Depende de:** E0.

---

### E2 — Validación compartida v2 + CSV v2

**Objetivo:** un solo núcleo puro para validar usuarios, planes y fechas, usable por la app
y por el script.

**Pasos**
1. Crear `src/utils/validacionUsuarios.js` con:
   - `normalizarEmail`, `normalizarDni`, `normalizarRoles`, `normalizarFecha`.
   - `resolverCodigoPlan(valor, planesJson)`: código canónico, alias `62G` → `662G` y nombre
     completo v1 → código. Devuelve `{ codigo, nombre }` o error.
   - `validarDatosUsuario(datos, { rolesPermitidos, catalogoPlanes })`.
   - `construirDocumentoUsuario(datos)` (nuevo shape, `personaId` y `planes` mapa).
   - `construirLegajo(datos)`.
2. Crear `src/utils/csv.js` v2: `parsearCSVUsuarios(texto)` con columnas de §3.5, arrays
   paralelos y validación de encabezados.
3. Refactorizar `useImportarUsuarios.js` y `scripts/import-usuarios.js` para usar el núcleo.
4. Eliminar el mapa de planes hardcodeado del script (leer `planes.json`).
5. Tests: fila válida, rol no estudiante, plan sin JSON, fecha inválida, array desparejo.

**Archivos:** `src/utils/validacionUsuarios.js` (nuevo), `src/utils/csv.js`,
`src/composables/usuarios/useImportarUsuarios.js`, `scripts/import-usuarios.js`,
`tests/unit/utils/validacionUsuarios.spec.js` (nuevo).
**Colecciones:** ninguna.
**Verificación:** tests nuevos + los 59 existentes; `npm run build`.
**Depende de:** E1.

---

### E3 — Migración de shape y compatibilidad de lectores

**Objetivo:** que la app lea el nuevo `usuarios` sin romper, y migrar el usuario de prueba.

**Pasos**
1. `useUsuarios.obtenerUsuario`: normalizar `estadoRegistro` (compatibilidad con `estado`
   viejo) y `planes` (si viene array de strings, convertirlo a mapa mínimo). El array puede
   traer códigos (`"662"`), nombres completos (`"662 Profesorado de Música"`) o el alias
   legacy (`"62G"`): siempre se escribe el código canónico (`662G`) como clave del mapa.
2. Unificar `user.plan` → `user.planes` en `TableroE.vue`, `PlanesEstudioView.vue`,
   `PlanesEstudioCard.vue` y `PerfilCard.vue`.
3. Script `scripts/migrar-usuarios-v2.js` (dry-run por defecto): agrega `personaId`,
   convierte `planes`, renombra `estado` → `estadoRegistro`, crea `legajos` vacío si
   corresponde.
4. Correr el script contra el emulador y contra el usuario real (con backup previo).

**Archivos:** `src/composables/usuarios/useUsuarios.js`, `src/views/estudiante/TableroE.vue`,
`src/views/estudiante/PlanesEstudioView.vue`,
`src/components/estudiante/PlanesEstudioCard.vue`,
`src/components/estudiante/PerfilCard.vue`, `scripts/migrar-usuarios-v2.js` (nuevo).
**Colecciones:** `usuarios`, `legajos`.
**Verificación:** `npm run test:unit`; `npm run build`; login del usuario real y ver sus
planes; dry-run con diff impreso.
**Depende de:** E2.

---

### E4 — Rules y tests de integración

**Objetivo:** reflejar la matriz de permisos y el nuevo modelo en `firestore.rules`.

**Pasos**
1. `usuarios`: bedel puede `create` solo `roles == ['estudiante']` y
   `estadoRegistro == 'pendiente_registro'`; coordinación sigue sin poder crear
   `admin`/`coordinacion`; admin sin cambios.
2. Validaciones mínimas de §5 (`personaId`, `planes` mapa, `email` = docId).
3. Nueva regla `legajos/{personaId}`: read/write para bedel, coordinación y admin.
4. Nueva regla `importaciones/{id}`: write para coordinación y admin.
5. Tests de integración: bedel crea estudiante ✅ / docente ❌ / admin ❌; coordinación crea
   docente ✅; admin crea admin ✅; bedel actualiza legajo ✅; estudiante no ✅.

**Archivos:** `firestore.rules`, `tests/integration/firestore-rules.spec.js`.
**Colecciones:** `usuarios`, `legajos`, `importaciones`.
**Verificación:** `npm run test:integration` (Java 21).
**Depende de:** E0. Puede ir en paralelo con E2/E3.

---

### E5 — Carga masiva de ingresantes (in-app)

**Objetivo:** cargar un ciclo completo de ingresantes de forma segura y auditable.

**Pasos**
1. Cambiar el flujo a "solo estudiantes" y CSV v2.
2. Validar el archivo completo antes de escribir: roles, planes con JSON, fechas,
   duplicados en memoria.
3. Chequear duplicados en Firestore por chunks de `in` (email y DNI).
4. Si algo falla: abortar todo y reportar filas, planes y motivos.
5. Previsualización en `CargaMasiva.vue`: válidas / con error / duplicadas.
6. Generar `numeroLegajo` (contador transaccional) y crear `usuarios` + `legajos` en lotes
   de ≤500; reportar importados vs fallidos si un lote falla.
7. Registrar auditoría en `importaciones/{id}` (hash del archivo, usuario, totales, errores).
8. Actualizar `docs/importar-usuarios.md`.

**Archivos:** `src/composables/usuarios/useImportarUsuarios.js`,
`src/views/coordinacion/CargaMasiva.vue`, `src/utils/validacionUsuarios.js`,
`docs/importar-usuarios.md`, `tests/unit/composables/useImportarUsuarios.spec.js`.
**Colecciones:** `usuarios`, `legajos`, `importaciones`, `contadores`.
**Verificación:** unit tests (válido, inválido, duplicado, plan sin JSON, fecha faltante,
lote parcial); manual en emulador con 3 filas; `npm run build`.
**Depende de:** E2, E3, E4.

---

### E6 — Base del alta individual (composable + formulario)

**Objetivo:** un solo motor para las altas de estudiante y docente.

**Pasos**
1. `src/composables/usuarios/useAltaUsuario.js`: valida, chequea duplicados (email y DNI),
   genera `personaId` y legajo, y escribe `usuarios` + `legajos` en un batch.
2. `src/components/ui/FormSelect.vue` (nuevo; hoy no hay select reutilizable).
3. `src/components/usuarios/FormAltaUsuario.vue`: campos de §3.1, selector de planes
   (desde `planes.json`), fecha por plan, estado por plan, errores.
4. Validaciones de coherencia: `ingresante` solo en planes con pregrado; `condicional`
   permitido; estado obligatorio; al menos un plan si es estudiante.
5. Tests unitarios del composable: inválido no escribe; duplicado no escribe; estado
   incoherente rechazado; válido escribe un batch.

**Archivos:** `src/composables/usuarios/useAltaUsuario.js` (nuevo),
`src/components/ui/FormSelect.vue` (nuevo),
`src/components/usuarios/FormAltaUsuario.vue` (nuevo),
`tests/unit/composables/useAltaUsuario.spec.js` (nuevo).
**Colecciones:** `usuarios`, `legajos`.
**Verificación:** `npm run test:unit`; montaje en emulador.
**Depende de:** E2, E3, E4.

---

### E7 — Alta individual de estudiante (Bedel)

**Objetivo:** alta de un estudiante suelto (pase, equivalencia, inscripción tardía).

**Pasos**
1. Vista `src/views/bedel/AltaEstudiante.vue` que envuelve el formulario con rol fijo
   `estudiante`. **No** depende de `TableroB.vue`.
2. Ruta `/bedel/alta-estudiante` (solo por URL, sin botón).
3. Test de integración: el bedel puede crear el pre-registro y su legajo; no puede crear
   docente/bedel/admin.
4. Prueba manual: alta → aparece `usuarios/{email}` + `legajos/{personaId}`; el estudiante se
   registra y el doc migra a `uid` sin perder `personaId`.

**Archivos:** `src/views/bedel/AltaEstudiante.vue` (nuevo), `src/router/index.js`.
**Colecciones:** `usuarios`, `legajos`.
**Verificación:** integration + manual.
**Depende de:** E6.

---

### E8 — Alta individual de docente (Coordinación)

**Objetivo:** alta de docentes con los datos base y el modelo extensible.

**Pasos**
1. Vista `src/views/coordinacion/AltaDocente.vue` con el mismo formulario y rol fijo
   `docente`.
2. Ruta `/coordinacion/alta-docente` (solo por URL).
3. Test de integración: coordinación crea docente ✅; sigue sin poder crear
   `admin`/`coordinacion`.
4. Prueba manual con un usuario que sea estudiante y docente (ambos roles).

**Archivos:** `src/views/coordinacion/AltaDocente.vue` (nuevo), `src/router/index.js`.
**Colecciones:** `usuarios`, `legajos`.
**Verificación:** integration + manual.
**Depende de:** E6. Puede ir en paralelo con E7.

---

### E9 — Legajo digital: actualización por Bedel

**Objetivo:** que el bedel pueda ver y actualizar el legajo (D1).

**Pasos**
1. `src/composables/usuarios/useLegajo.js`: `obtenerLegajo(personaId)`,
   `actualizarLegajo(personaId, datos)`.
2. Vista mínima `/bedel/legajo/:personaId` (solo por URL) con los campos de §3.3.
3. Tests unitarios del composable; test de integración de rules (bedel ✅, estudiante ❌).
4. No incluir la solicitud de actualización del estudiante (solo dejar el campo previsto).

**Archivos:** `src/composables/usuarios/useLegajo.js` (nuevo),
`src/views/bedel/Legajo.vue` (nuevo), `src/router/index.js`.
**Colecciones:** `legajos`.
**Verificación:** unit + integration + manual.
**Depende de:** E4. La UI puede posponerse al rediseño de Bedel si se prefiere; rules y
composable no.

---

### E10 — Script de importación fuera de la app (v2)

**Objetivo:** cargas masivas de bedeles, docentes y estudiantes vigentes con service account.

**Pasos**
1. Adaptar `scripts/import-usuarios.js` al shape v2 y al núcleo de E2.
2. `--dry-run` obligatorio por defecto; `--apply` explícito.
3. Mismo criterio de aborto (planes con JSON, duplicados, fechas).
4. Generar legajo y `personaId`.
5. Reporte por consola y archivo de resumen (sin datos personales en git).

**Archivos:** `scripts/import-usuarios.js`, `scripts/firebaseNode.js` (si hace falta),
`docs/importar-usuarios.md`.
**Colecciones:** `usuarios`, `legajos`, `contadores`.
**Verificación:** dry-run sobre `data/usuarios.csv` de prueba; apply en emulador; diff.
**Depende de:** E2, E3.

---

### E11 — Cierre y verificación integral

**Objetivo:** dejar `dev` consistente y documentado.

**Pasos**
1. `npm run lint` (0 errores; las warnings actuales no bloquean).
2. `npm run test:unit`.
3. `npm run test:integration`.
4. `npm run build`.
5. Actualizar `docs/contexto.md` (composables, modelo, backlog F2-2 y claims).
6. Revisar que `firestore.rules` y los docs no se contradigan.

**Archivos:** `docs/contexto.md`, `docs/modelo-datos.md`.
**Verificación:** los cuatro comandos en verde.
**Depende de:** todas.

---

## 8. Impacto en lo existente / migración

| Elemento | Cambio |
|---|---|
| `usuarios.estado` | Renombrar a `estadoRegistro` (`pendiente_registro` \| `registrado`). Compatibilidad temporal en `obtenerUsuario`. |
| `usuarios.planes` | De array de nombres a mapa por código con `estado`, `fechaInscripcion`, `vigente`, `origen`. |
| `usuarios` (nuevo) | `personaId`, `estadoUsuario`, `numeroLegajo`. |
| `legajos` | Colección nueva, ID = `personaId`. |
| CSV | Columnas `fecha_inscripcion` y `numero_legajo`; `roles` deja de pedirse en la carga in-app. |
| `firestore.rules` | Bedel crea estudiante; `legajos`; `importaciones`; validaciones de create. |
| `useImportarUsuarios.js` | Nuevo shape, CSV v2, duplicados, aborto, legajo, auditoría. |
| `scripts/import-usuarios.js` | Núcleo compartido, `--dry-run`, shape v2. |
| `useUsuarios.js` | Normalización de `estadoRegistro` y `planes`; búsqueda por email/DNI. |
| `TableroE.vue`, `PlanesEstudioView.vue`, `PlanesEstudioCard.vue`, `PerfilCard.vue` | Leer `user.planes` (mapa) y no `user.plan`. |
| `usePlanesEstudio.js` | Reutilizar el normalizador de E1; detectar pregrado. |
| `docs/importar-usuarios.md` | CSV v2 y reglas de aborto. |
| `docs/modelo-datos.md`, `docs/contexto.md` | Modelo nuevo y estado de implementación. |
| Tests | Unitarios nuevos (planes, validación, alta, legajo) e integración de rules. |

**Migración de datos:** solo hay **9 usuarios de prueba** en Firestore (ninguno real). El
riesgo es bajo. Aun así:
1. Backup de `usuarios` (export o script que imprima el doc actual).
2. Correr `scripts/migrar-usuarios-v2.js` en dry-run y revisar el diff.
3. Aplicar, verificar login y planes.
4. Recién después habilitar la carga masiva v2.

**Cambio de email (futuro, no planificado):**
- Post-registro el ID es `uid`; el email es solo un campo → cambiar el email no mueve el doc
  ni el legajo. Hay que actualizar el email en Auth y en Firestore (batch).
- Pre-registro el ID es el email → cambiarlo exige crear el doc nuevo y borrar el viejo; el
  `personaId` se conserva y el legajo no se toca.
- Esta es la razón principal por la que el vínculo del legajo **no** es el email.

---

## 9. Fuera de alcance / a futuro

- **Cálculo automático** de `por_vencer`/`vencido` y del paso `ingresante → activo` (§4).
- Job programado (Cloud Scheduler + Function) y trigger sobre `trayectoriaAcademica`.
- Revisión y carga de los **34 planes JSON faltantes**; normalización de `662G`.
- App para coordinadores/jefes de área para revisar y cargar planes.
- **Rediseño de las vistas de Bedel** (vista centrada en estudiante y vista de secuencias).
- Cambio de email de un usuario registrado.
- Solicitud de actualización de legajo por parte del estudiante.
- Creación de cuenta de Auth desde la app (D2 = pre-registro).
- Foto de identificación, QR de validación y documentación del legajo.
- Sincronización de custom claims al editar roles (`actualizarRoles`).
- Corrección de datos de estudiantes ya registrados (la hace el Bedel; fuera de estos flujos).
- Notificaciones por email (invitaciones, avisos de vencimiento).
- Migración de datos históricos reales (**no hay datos reales**; solo 9 usuarios de prueba).
- `inactivo-graduado` (descartado: la graduación es por plan).
- Regla de abandono en primer año (provisoria; §11).

---

## 10. Preguntas abiertas

1. **Umbral de `por_vencer`:** ¿cuántos meses antes de los 4 años? ¿Se mide desde la última
   acreditación o desde la inscripción? Queda como parámetro (`umbralPorVencerMeses`).
2. **`graduado`:** ¿quién y cuándo lo marca? ¿Lo calcula el sistema al aprobar la última
   materia del plan o lo confirma una persona?
3. **Equivalencias:** ¿quién las confirma y dispara `condicional → activo`? ¿Bedel,
   coordinación, jefe de área?
4. **`estadoUsuario = inactivo`:** ¿quién lo setea, con qué motivo y qué efecto tiene (por
   ejemplo, impedir el login)? ¿Se permite reactivar?
5. **Abandono en primer año:** ¿tiene un estado propio? ¿Quién lo marca? Hoy no se modela
   para no bloquear un cambio futuro.
6. **Formato canónico de códigos de materia:** los JSON usan `plan-A.N` (ej. `662-0.1`), no
   `xxxx-AA-NN.N`. ¿Se normalizan los JSON al formato nuevo o el parser acepta ambos?
   (Ver Anexo A.)
7. **`662G`:** su JSON tiene `Plan: "62G"` (sin el `6`), códigos sin prefijo de plan, **no
   tiene año 0** y tiene 4 códigos duplicados (`62G.1.1`, `62G.2.1`, `62G.3.1`, `62G.4.1`).
   **Decisión E1:** queda bloqueado hasta que se normalice, se le agregue pregrado y se
   revisen equivalencias y correlativas con `662`. El normalizador lo reporta como no
   disponible; no se usa en altas.
8. **`numeroLegajo`:** ¿único global o por plan/año? ¿Formato (`AAAA-NNNN`)? ¿Se conserva al
   cambiar de plan?
9. **Dos entradas del mismo plan:** el mapa por código no permite dos planes iguales
   simultáneos. ¿Puede pasar (reinscripción al mismo plan)? Si sí, hay que agregar un
   `entradaId`.
10. **`condicional`:** ¿siempre implica un plan nuevo, o puede aplicarse a un plan existente?
11. **`fechaInscripcion` anterior al alta:** ¿se permite (pases/equivalencias)? Si sí, la
    validación no debe exigir que sea ≥ hoy.
12. **`trayectoriaAcademica`:** `docs/modelo-datos.md` la describe, pero **no está
    implementada**. ¿Se implementa antes del cálculo de estados? ¿Qué valor exacto de
    `resultado` significa "aprobada"?
13. **Sin acreditaciones:** para un plan sin pregrado y sin ninguna materia aprobada, ¿el
    reloj de vencimiento arranca en `fechaInscripcion` o no vence hasta la primera
    acreditación?
14. **`estadoUsuario` derivado vs guardado:** la recomendación es guardarlo como decisión
    administrativa. ¿Confirmás, o preferís derivarlo siempre de los planes + rol docente?
15. **Alta individual y legajo:** ¿los datos administrativos (fecha de nacimiento, domicilio,
    teléfono) se cargan en el mismo formulario del alta o en un segundo paso?
16. **Legajo vacío:** ¿se crea siempre en la carga masiva, aunque no haya datos
    administrativos, o solo cuando hay datos?
17. **Nombre de la colección:** se propone `legajos` ("Legajo digital"). ¿Se confirma?
18. **`inactivo` y planes activos:** si un usuario está `inactivo` pero tiene un plan
    `activo`, ¿prevalece el estado del usuario o se muestra una advertencia? (Recomendación:
    advertencia, no bloqueo.)

---

## Anexo A. Verificación de los 3 JSON de planes

Verificado el 30/10/2026 contra `public/planes/`:

| Archivo | Plan interno | Materias | Años (cantidad) | ¿Pregrado (año 0)? | Formato |
|---|---|---|---|---|---|
| `662.json` | `662` | 91 | 0:11, 1:18, 2:16, 3:24, 4:22 | **Sí (11)** | `662-A.N[.M]` |
| `708.json` | `708` | 29 | 1:12, 2:10, 3:7 | **No** | `708-A.N` |
| `662G.json` | `62G` ⚠️ | 58 | 1:14, 2:15, 3:15, 4:14 | **No** ⚠️ | array legacy, `Cod: "A.N"`, `PCod: "62G.A.N"` |

**Conclusiones:**

1. El formato que describiste (`xxxx-AA-NN.N`) **no es el que usan los archivos**. El actual
   es `{plan}-{año}.{número}[.{subnúmero}]` para `662`/`708`, y un array legacy para
   `662G`. La equivalencia es: **año `0` = `AA=00` = pregrado**. El parser debe aceptar
   ambos y, si se adopta el formato nuevo, normalizar los JSON.
2. `708` no tiene materias de año 0 → **sin pregrado**, como esperabas. La detección por
   ausencia de año 0 funciona.
3. `662` tiene 11 materias de pregrado (`662-0.1` a `662-0.6.3`).
4. **`662G` es una excepción:** su `Plan` interno es `62G`, que es un **alias legacy** de
   `662G`, no un código canónico. Sus códigos no llevan prefijo de plan y **no tiene año 0**,
   aunque `planes.json` lo describe como una orientación del 662 (que sí tiene pregrado). Se
   considera **no disponible** hasta que se revise y normalice a `662G`.
5. `planes.json` lista **37 planes**; solo **3** tienen JSON. Faltan 34, entre ellos
   `662A`–`662X`, `663`–`666`, `709`, `389`–`393`.
6. Hay inconsistencias de nombres entre `planes.json`, `docs/importar-usuarios.md` y
   `scripts/import-usuarios.js` (por ejemplo, `662B`: "Clarinete" en `planes.json`,
   "Canto" en el script; `662E`, `662I`, `662O` figuran con orientaciones distintas).
   Conviene unificar la fuente en `planes.json` y borrar el mapa hardcodeado (E2).
7. **Código canónico (D11):** se mantiene el código oficial de `planes.json` como string
   (`662G`, `662A`, …). No se trunca a `62G`. Las 24 orientaciones comparten entre sí un
   tronco común (no son idénticas al `662` sin orientación) y solo cambian la materia de
   instrumento; si se quiere evitar duplicar JSON, se compone `tronco común + instrumento`.

---

## Anexo B. Esquema resumido

```
usuarios/{email | uid}
├── personaId ──────────────► legajos/{personaId}
├── dni, nombre, apellido, email
├── roles[]
├── estadoRegistro: pendiente_registro | registrado
├── estadoUsuario: activo | inactivo
├── numeroLegajo?
└── planes: {
      "<codigo>": {
        id, nombre, estado, fechaInscripcion, vigente, origen,
        ultimaAcreditacion?, estadoCalculadoEn?
      }
    }

legajos/{personaId}
├── numeroLegajo
├── datos personales y administrativos
├── domicilios[], telefonos[]
└── documentacion[] (previsto)

importaciones/{id}   (auditoría, opcional pero recomendado)
├── tipo, usuario, archivoHash
└── totalFilas, importados, errores, creadoEn

contadores/legajos   (secuencia de números de legajo)
└── valor
```

---

## Anexo C. Checklist de verificación por etapa

| Etapa | Comando / prueba |
|---|---|
| E1 | `npm run test:unit` (planes: 662 pregrado, 708 sin pregrado, 662G no disponible) |
| E2 | `npm run test:unit` + `npm run build` |
| E3 | `npm run test:unit` + `npm run build` + dry-run del script de migración |
| E4 | `npm run test:integration` |
| E5 | unit + manual en emulador (3 filas, una con plan sin JSON, una duplicada) + `build` |
| E6 | `npm run test:unit` |
| E7 | integration (bedel) + manual (alta → registro → migración a uid) |
| E8 | integration (coordinación) + manual (usuario estudiante+docente) |
| E9 | unit + integration + manual |
| E10 | dry-run + apply en emulador |
| E11 | `npm run lint` + `test:unit` + `test:integration` + `build` |
