# SIGE: decisiones vigentes y planes de trabajo (nov 2026)

> Fuente de decisiones del proyecto. Si un plan o un código contradice este
> archivo, el que está mal es el plan. El modelo de datos definitivo vive en
> `docs/modelo-datos.md`, que se actualiza al cerrar cada plan de modelo.

## 0. Reglas de trabajo para el agente
- Cada plan es chico, se hace en una sola sesión y termina con
  `modelo-datos.md` al día.
- En los planes, separar siempre lo VERIFICADO (con archivo y línea) de lo
  SUPUESTO. No afirmar nada que no se haya leído.
- Todo cambio al modelo va como propuesta ("Decisiones para mí") hasta que
  yo lo apruebe. No inventar reglas: lo que falte va a "Preguntas abiertas".
- Ante duda, abortar y reportar. Nunca escrituras parciales.
- Pensar en costo de lecturas. Evitar Cloud Functions si no hacen falta.
- Verificar las cuotas gratuitas vigentes (no suponerlas).
- Yo pienso en SQL: explicar lo propio de Firestore con analogías SQL.

## 1. Contexto y escala
- Ciclo terciario: unos 800 estudiantes. Ciclo lectivo = año calendario.
- Febrero 2027 (primera implementación real): solo espacios COLECTIVOS.
  - Participan: ingresantes a pregrado de los planes con pregrado (662 y
    variantes con letra) y estudiantes de 1.er año del plan 0708.
  - Otros años se suman gradualmente en 2027 (1.° y tal vez 2.°). En 2028:
    ingresantes, 3.° y 4.° faltantes e inscripciones de instrumento desde SIGE.
- Escala: pregrado 2026 tuvo unos 260 preinscriptos y 177 efectivos (sin el
  0708). Plan 0708: 82 preinscriptos y 59 efectivos. Techo 2027: unos 260
  estudiantes. 2028: 800.
- Secuencias en febrero 2027 (según 2026): unas 30 de pregrado (cupos 6 a 40)
  y 11 del 0708 (casi todas de 35, algunas de 15; los coordinadores no
  cargaron cupo). Año completo 2026: 314 colectivas y 380 de instrumento.
- Código de secuencia: texto numérico de 3 o 4 dígitos, con subsecuencia por
  coma ("544,1"). Cada subsecuencia es una secuencia distinta.

## 2. Flujo previo a la inscripción
Preinscripción online (fuera de SIGE) → inscripción presencial con
documentación → yo cargo en SIGE solo a los confirmados → inscripción a
cursadas. Los errores de datos personales los corrijo en una planilla ANTES
de la carga masiva. El trámite de corrección de datos (P8) cubre solo errores
posteriores a la carga.

## 3. Inscripciones: reglas de negocio (cerradas)
- Modalidad directa, sin confirmación del Bedel. Estados: `activa` | `baja`.
- Cupo ORIENTATIVO: se avisa, no se bloquea. Puede faltar (el 0708 no tiene
  cupos cargados): se muestra "sin cupo definido".
- El cupo ocupado se CALCULA (inscripciones activas de la secuencia), no se
  guarda. Una baja libera el lugar.
- Ventanas de inscripción: duran 3 o 4 días, abren 9:00 y cierran 22:00. A los
  estudiantes se les avisa 20:00, pero el cierre real es 22:00, impuesto por
  las rules con hora del servidor (nunca solo en el cliente).
- Estudiante: se inscribe en las ventanas abiertas que le corresponden y
  puede dar de baja SOLO su propia inscripción y SOLO antes del cierre de la
  ventana. Cerrada la ventana, debe ir a Bedelía (por ahora).
- Bedel: alta y baja SIEMPRE, incluso con la ventana cerrada y para
  estudiantes sin registro completo, con auditoría (quién, cuándo, motivo
  opcional). Admin accede por esAdmin(). Herencia Coordinación→Bedel: no
  se implementa (ver §7).
- Pase entre comisiones: baja en A y alta en B en una sola operación atómica,
  marcada como pase con la secuencia de origen. Lo ejecuta el Bedel, y esa
  acción es la confirmación (no hay estado pendiente). El pedido de pase
  hecho por el estudiante desde la app queda para P8.
- Una sola inscripción activa por estudiante y materia (definir cómo se
  garantiza).
- Condicionalidad de cursada: es exclusiva de la cursada y dura como máximo
  la cursada. Si al terminar no se levantó la condición, el estudiante
  pierde el cursado aunque haya aprobado el espacio; no hay prórroga.
  Quién la resuelve y con qué auditoría: a definir.

## 4. Elegibilidad (tres niveles, no mezclar)
1. Por ventana: qué planes y años pueden inscribirse. Es dato de la ventana,
   no del código ni de las rules. No puede basarse solo en
   `estado == "ingresante"` (el 0708 arranca "activo"). SE IMPLEMENTA.
2. Por plan: qué espacios corresponden al plan del estudiante (sale del JSON
   del plan). SE IMPLEMENTA en 2027.
3. Académica por correlativas según historial: PREVISTA, NO se implementa.
   Dentro del pregrado no hay correlativas.

## 5. Planes (JSON): hechos y dependencias

### Estado actual
- JSON cargados en `public/planes`: 662, 663, 664, 665, 666, 708 y 662x
  (7 en total). 662x es un archivo TEMPORAL, no un plan definitivo, y
  existe hasta generar los 662Letra. No es asignable a estudiantes.
- Todos los planes tienen pregrado (materias con año 00), con la única
  excepción del 0708.
- `planes.json` está acotado a los planes vigentes. Verificado: 29
  entradas; incluye las 18 letras (662A a 662Q, con Ñ) y NO incluye 662x.
  `disponible: true` solo en 662, 663, 664, 665, 666 y 708.
- Estoy preparando los JSON de la mayoría de los planes, con al menos el
  año 0.
- Dependencia crítica (D8): si una fila de la carga masiva referencia un
  plan sin JSON válido, se ABORTA toda la carga. Todo plan con ingresantes
  en febrero debe tener JSON cargado y revisado.
- Cada JSON de febrero debe traer: año de cada materia, códigos
  normalizados, requisitos (ver abajo) y `equivale_a` donde corresponda.
- Circuito de planes: editor (`planesPendientes`, con revisión y
  comentarios) → coordinador marca "listo" → exportación del JSON validado
  (`exportarDetalle` por plan, que ya valida y bloquea con errores:
  `useEditorPlanesVista.js:543-573`; `exportarJSONValidado` para la generación
  por letra sigue pendiente, P0b) → yo lo copio a `public/planes`.
  La app en ejecución lee solo los estáticos. `planesPublicados` queda
  inactivo y documentado (sin botón ni seed).
- Verificado: el editor guarda en Firestore (`planesPendientes`) y los
  estáticos se copian a mano; el navegador no escribe en `public/planes`.
  Los planes generados salen del editor por exportación, no por escritura
  directa.
- El cambio de rol (rolActivo) es solo visual; router y rules operan con
  la unión de roles. (Esta línea también está en §7, podés dejarla solo
  allí.)

### Códigos y equivalencias
- Formato de código de materia en SIGE: `{plan}-{año}.{n}[.{sub}]` (por
  ejemplo `662-0.1`, `708-1.1`). Año 0 = pregrado. El plan 0708 se llama
  `708` en los JSON.
- DECIDIDO: los códigos de SIGE son propios e independientes de los
  oficiales de las resoluciones (por ejemplo 6620101), que contienen
  errores y rectificatorias. Lo que identifica a una materia entre ambos
  mundos es su NOMBRE: debe coincidir. Los coordinadores definen en los
  JSON las relaciones entre requisitos y equivalencias. Una revisión
  completa de los planes se prevé para 2028.
- `equivale_a` existe en los JSON de 662, 663 a 666 y 662x. Es una relación
  entre planes, no una jerarquía: 662Letra, 663, 664, 665 y 666 comparten
  algunos espacios que no están en el 662 (662Letra y 665 son muy
  similares), por eso algunos `equivale_a` apuntan a otros planes. "662 es
  el plan madre" es una simplificación. Evaluar aparte (no bloquea
  febrero). Confirmado (18/11/2026): no es un error; para emparejar
  espacios vale el nombre del espacio (la denominación debe coincidir).
- El doble cómputo de `662` (`662-0.3.1 → 662-0.1` y `0.3.2 → 0.2`) son
  **errores de carga** (confirmado 18/11/2026): corregir las equivalencias.
- Un espacio puede tener distinto año en distintos planes (siempre
  obligatorios, con correlativas ya chequeadas).

### Requisitos del plan (ver plan P0)
- El plan se describe como lista de requisitos con `minimo` y `candidatos`:
  obligatorio = grupo de 1; conmutable ("o este o este otro") = grupo de 2
  con mínimo 1; optativo = grupo de N con mínimo M (por ejemplo, 2 de 5
  talleres EDI, o 1 obligatorio más 2 optativos, o 3 optativos, según el
  plan).
- Un espacio es obligatorio u optativo según el plan, nunca ambos. Los
  conmutables no cruzan años.
- Lo acreditado de más no reemplaza a otro, pero queda en el historial.
- El avance se mide en requisitos cumplidos, se calcula al leer y no se
  guarda.
- El formato `requisitos` YA está implementado (ver `src/utils/requisitos.js`
  y `P0-plan-modelo-requisitos.md`). Solo el 708 es válido y completo; 662 a 666
  están incompletos. Antes de febrero se completan al menos los requisitos
  de pregrado y de 1.er año. Los seminarios son espacios optativos de 3.º o
  4.º año (no hay seminarios en pregrado) y no importan para 2027. Los EDI
  son de pregrado, obligatorios en algunos planes y optativos en otros: los
  mínimos los definen los coordinadores al revisar los planes.
- Estado del P0 (18/11/2026): el código está cerrado (E1 advertencias de
  doble cómputo, E2 validación agregada y gate de exportación, E3
  normalización que conserva `requisitos`/`equivale_a`, E4 auditoría). Falta
  E5: cargar y corregir los requisitos con aprobación de Coordinación.
  Defectos por plan en `informe-auditoria-planes.md`.
- El editor ya edita requisitos y candidatos (`EditorRequisitos.vue`,
  montado en `EditorPlanes.vue:383`), valida el plan completo y bloquea la
  exportación con errores. La revisión de coordinadores puede empezar ya: lo
  que falta no es editor, es el dato aprobado.
- En 2027 el estudiante ve solo sus cursadas activas (según las
  inscripciones). En los optativos el sistema informa el mínimo y permite
  inscribirse o cursar más espacios que el mínimo (no bloquea el exceso).
  El avance NO se muestra. Se revisa a futuro.
- Los mínimos se miden en espacios (nada en la escuela se calcula por horas
  ni créditos).
- Los planes con requisitos incompletos siguen `disponible: true`
  (confirmado 18/11/2026); Coordinación carga los requisitos de pregrado.

### Planes 662 con letra (plantilla 662X)
- Hay 18 planes activos, 662A a 662Q incluida la 662Ñ (lista en
  `planes.json`). Son idénticos en materias, correlativas y demás, salvo el
  instrumento en las materias específicas. Hoy no existen los JSON 662A a 662Q; se generan en P0b.
- Se mantienen desde una plantilla "662X" (`esPlantilla: true`), editada
  desde el editor de planes de Coordinación. Nunca es asignable a
  estudiantes: se excluye de listados, carga masiva (que la rechaza) e
  inscripción.
- Una tabla (`letra`, `instrumento`, `nombreCompleto`, `activo`) alimenta la
  generación de un plan por letra. El instrumento no se extrae parseando el
  nombre.
- Los planes generados son de solo lectura (salvo una opción explícita de
  "desvincular de la plantilla"). Si hay que corregir algo, se corrige la
  plantilla y se regenera.
- Antes de propagar: mostrar diferencias y pedir confirmación, validar los 18
  resultados y abortar todo si falla alguno, no cambiar ni borrar códigos ya
  usados, y registrar quién, cuándo y versión.
- La plantilla se arma en el formato de requisitos de P0 (ya implementado).
  Hoy `662x` no tiene requisitos: cargarlos es parte de P0b. No se generan
  archivos hasta que P0 cierre los datos (E5).
- Dependencia: verificar dónde guarda hoy el editor de planes (Firestore o
  archivos estáticos). De eso depende que la generación automática sea viable.
- Riesgos: la Ñ en ids, nombres de archivo, claves y comparaciones (probar
  explícitamente; si falla, usar un identificador interno sin Ñ); nombres
  inconsistentes en `planes.json` (Viola/Violín/Violonchelo/Contrabajo/Saxo
  con "Instrumento de", y los demás sin).
- Preguntas abiertas: ¿qué materias cambian además del instrumento
  fundamental (por ejemplo, el taller obligatorio de cada orientación)?
  ¿Los optativos son iguales en todas las letras?
- Revisión de coordinadores: que revisen un solo plan representativo (por
  ejemplo, el 662G) y no los 18; la revisión se traslada después a la
  plantilla.

## 6. Usuarios y modelo (decisiones vigentes)
- `usuarios`: DNI, nombre y apellido son campos de esta colección (fuente
  principal). El buscador del Bedel NO lee `legajos` para el perfil mínimo.
- Roles: array, un usuario puede tener varios.
- `legajos/{personaId}`: un legajo por persona, vinculado por `personaId`
  (estable; no depende de email ni uid). Documento pesado y sensible: se lee
  solo cuando se pide.
- Desnormalización aprobada: nombre del plan, plan y `numeroLegajo`. Puede
  hacer falta el plan también en el historial académico.
- El estado del usuario vive solo en `usuarios`. El estado por plan vive en
  `usuarios.planes` (decidido en el plan de carga de usuarios); no se mueve a
  legajos.
- Estados por plan: ingresante, activo, por_vencer, vencido, graduado,
  condicional. En 2027 el estado se asigna al cargar (planes 66x con
  pregrado: ingresante; 0708: activo). NO hay lógica de transición en 2027.
- Pendiente a futuro: la regla "ingresante pasa a activo al acreditar todas
  las materias 00" es incorrecta con optativos; debe ser obligatorios más el
  mínimo de cada grupo optativo.
- Cupo, horario y aula de la secuencia: desnormalizar donde sea más eficiente
  (decide el agente con costos).
- "Condicional" tiene dos significados que no se mezclan: (a) de plan, por
  equivalencias pendientes (estado en usuarios.planes); (b) de cursada, por
  deber el final de una correlativa: el estudiante debe resolverlo antes de
  que termine el período de esa cursada o pierde la posibilidad de acreditar
  el espacio. (b) es previsión, no se implementa en febrero.

## 7. Permisos de edición de datos personales
- Estudiante, docente y bedel NO modifican sus propios datos.
- Bedel modifica estudiantes (sobre docentes: sin decidir).
- Coordinación modifica estudiantes, docentes y bedeles, pero no los
  propios ni los de otros coordinadores. Son unos 10 usuarios (5 o 6
  activos).
- Admin: 3 usuarios, que además tienen los roles coordinacion y docente.
  La herencia de permisos (Coordinación hereda de Bedel, Admin de
  Coordinación) es previsión y NO se implementa.
- Verificado: el guard del router usa `includes` sobre el array de roles;
  las rules leen roles con `get()` a `usuarios` (cada `get()` cuenta como
  lectura). El cambio de rol (rolActivo) es solo visual.
- Estudiante: ve solo lo propio y genera sus inscripciones. Las
  solicitudes de actualización y de otros trámites quedan para P8.
- Combinación NO soportada: bedel + estudiante (cómo evitarla al dar de
  alta: pendiente). El rol docente se activa más adelante (no en 2027); al
  hacerlo, revisar las rules para docente+estudiante, docente+coordinacion
  y admin+coordinacion+docente.

## 8. Propuestas de modelo (a verificar y aprobar en P1 y P2)
1. Calendario del ciclo (`ciclos/{año}`): inicio y fin del año escolar y de
   cada cuatrimestre. Hoy no existe; lo cargo yo al publicarse el calendario
   (antes de las inscripciones). Cada secuencia indica `anual`, `1c` o `2c`;
   un espacio cerró cuando la fecha de fin de su período es anterior a hoy.
2. Oferta en un documento por ventana de inscripción (apertura, cierre,
   planes y años habilitados, secuencias anidadas). Comparar con un documento
   por ciclo y uno por secuencia, con números. Firestore cobra por documento
   leído, no por tamaño.
3. Inscripciones en una colección plana de nombre fijo, un documento por
   inscripción: `personaId`, `ciclo`, `ventanaId`, `secuencia`, `estado`,
   auditoría, `origen` (directa | pase) y secuencia de origen. Reemplaza las
   subcolecciones de nombre dinámico. Evita el índice inverso (escribir en
   dos lugares) a esta escala.
4. Cupo ocupado: comparar `count()` contra contador guardado (verificar
   tarifa vigente). Inclinación: conteo calculado.
5. NO agregar campo de modalidad ahora (si falta, se entiende `directa`).
   NO crear la colección de pedidos de preferencias.
6. Campo `esPrueba: true` en usuarios e inscripciones, para borrar solo los
   datos de prueba en producción.
7. Cada rule que lea otro documento (por ejemplo, la ventana) cuenta como
   lectura: el agente debe estimar ese costo.
8. P2 debe comparar custom claims contra `get()` para leer roles en las
   rules (costo de lecturas por inscripción).

## 9. Carga de la oferta y de usuarios
- La oferta se carga SOLO desde la vista de Coordinador (ya existe, sin
  probar). No hay script para esto.
- Usuarios: carga masiva in-app solo para el rol estudiante (ingresantes) y
  script operativo para el resto. Validar todo el archivo antes de escribir;
  si hay duplicados de email, abortar y reportar; nunca tocar un usuario ya
  registrado.
- Riesgo de calendario: el estudiante debe completar su registro (crear su
  contraseña) para inscribirse. Mitigación: el Bedel puede inscribirlo.

## 10. Instrumentos
- 2027: se resuelven presencialmente con planillas. Yo las consolido (Google
  Sheets + script) y cargo un CSV/JSON con un SCRIPT operativo (credenciales
  de servicio). No hay vista de importación. Es posterior y omitible.
- Yo filtro antes a los estudiantes que no existan en SIGE y los doy de alta
  primero. Si el script encuentra uno, ABORTA toda la carga y reporta.
- El script escribe en el mismo modelo de inscripciones que las directas y
  debe replicar las validaciones de la app. Formato de entrada compatible con
  2028.
- 2028: inscripción por preferencias (el estudiante elige 3 secuencias
  ordenadas y un algoritmo asigna, con propuesta revisable por el Bedel). Es
  otro plan; no se diseña el algoritmo ahora. La reasignación de secuencias
  vacías entre etapas queda descartada.

## 11. Planes de trabajo
Cada plan: entregable `docs/planes-implementacion/plan-<tema>.md`, máximo
~180 líneas. El plan es solo lectura de código (la implementación va en sus
etapas). Con VERIFICADO/SUPUESTO, "Preguntas abiertas" y "Decisiones para mí".
Un plan por sesión.

Tamaño: si el plan supera ~180 líneas, NO lo recortes ni lo entregues
completo: detenete y proponé cómo dividirlo (títulos y alcance de cada parte)
antes de escribir.

Etapas: todo plan termina en etapas numeradas (E1, E2...) que yo pueda
entregar una por una al agente de implementación. Cada etapa lleva: objetivo,
archivos a tocar o crear, pasos, qué NO se toca, lecturas de Firestore que
realiza y verificación (incluidos los tests). Cada etapa debe poder
ejecutarse sin leer el resto del plan.

Resumen final (máximo ~10 líneas): decisiones tomadas, decisiones pendientes
de mi aprobación y datos que necesitás de mí.

| # | Plan | Para cuándo |
|---|------|-------------|
| P0 | Requisitos: auditoría de JSON y completar requisitos (formato ya implementado) | Código cerrado; falta E5 (datos) |
| P0b | Editor con requisitos, plantilla 662X y generación por letra; incluye `exportarJSONValidado`. Depende de P0 | Plan listo; implementar tras P0-E5 |
| P1 | Modelo: calendario, ventanas y oferta, compatible con la carga de Coordinador | Diciembre |
| P2 | Modelo: inscripciones (colección plana, `activa`/`baja`, auditoría, pase, conteo de cupo), rules, `esPrueba` | Diciembre |
| P3 | Coordinador: ver y editar la oferta (ocupación por secuencia, editar cupo/aula/horario/docente, agregar comisiones; no cambiar ni eliminar una secuencia con inscriptos activos) | Diciembre |
| P4 | Prueba en producción: carga masiva, carga de oferta, bloque de inscripciones, limpieza de `esPrueba` | Diciembre |
| P5 | Vista del Estudiante: oferta filtrada por plan, inscripción y baja | Febrero |
| P6 | Bedel: ficha del estudiante | Febrero |
| P7 | Bedel: secuencias, con alta, baja y pase | Febrero |
| P8 | Solicitudes: pedido de pase y corrección de datos | Posterior |

Notas por plan:
- P0: código cerrado (E1-E4); E5 es carga de datos con revisión de
  Coordinación, y el editor ya sirve para esa revisión. Detalle en
  `P0-plan-modelo-requisitos.md` e `informe-auditoria-planes.md`.
- P0b: plan escrito en `plan-planes-letra.md` (5 etapas). Puede implementarse
  antes de E5, pero la generación real aborta hasta que la plantilla tenga
  requisitos aprobados.
- P1: describir qué estructura escribe hoy la carga de oferta, qué pasa al
  recargar (reemplaza, fusiona o duplica), cómo corregir la oferta sin vista
  de edición, y qué cambiaría en ese componente (solo como propuesta).
  Incluir la oferta por plan vía `equivale_a`, elegibilidad por ventana y qué
  lee la rule para verificarla. Listar (sin diseñar) qué decidir hoy para no
  cerrar las preferencias de 2028.
- P3: reutilizar componentes con la vista de Secuencias del Bedel. Hasta que
  exista, el listado de la oferta cargada hace de chequeo.
- P5: ver la oferta, inscribirse y dar de baja antes del cierre.
- P6: buscador por DNI, apellido o nombre (lee solo `usuarios`) y tres
  botones; cada uno lee su colección solo al elegirlo: inscripciones
  vigentes, historial académico (general o por plan) y legajo.
- P7: buscador por código (id directo), materia o docente, limitado al ciclo
  vigente, con día, horario y aula en el listado. Estudiantes y notas se leen
  bajo demanda. Las etapas de notas (lectura, edición con auditoría,
  importación omitible) se planifican aparte, después de febrero.
- Previsión (sin implementar): elegibilidad por correlativas en 2028;
  extensión a Coordinador y Admin; vista histórica de secuencias y notas de
  ciclos anteriores.

## 12. Mis tareas (fuera de los planes)
- Preparar y subir los JSON de la mayoría de los planes, con al menos el
  año 0 listo.
- Revisar la planilla de inscripciones de los coordinadores y probar la
  exportación para generar datos de prueba.
- Probar la carga de oferta de Coordinador antes de P4.
- Revisión de planes por coordinadores: semana próxima.
- Cargar el calendario académico 2027 cuando se publique.

## 13. Preguntas abiertas globales
- ¿Los obligatorios específicos se sugieren o se exigen?
- ¿"equivale_a" sirve también para las equivalencias del trámite de pase?
- ¿Qué permisos tiene el Admin sobre datos personales? ¿Puede el Bedel
  modificar datos de docentes?
- Estudiantes condicionales: ¿cómo afectan la oferta?