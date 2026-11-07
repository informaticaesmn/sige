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
- Bedel (y Coordinación y Admin por herencia): alta y baja SIEMPRE, incluso
  con la ventana cerrada y para estudiantes que no completaron su registro.
  Siempre con auditoría (quién, cuándo, motivo opcional). La baja no borra el
  documento.
- Pase entre comisiones: baja en A y alta en B en una sola operación atómica,
  marcada como pase con la secuencia de origen. Lo ejecuta el Bedel, y esa
  acción es la confirmación (no hay estado pendiente). El pedido de pase
  hecho por el estudiante desde la app queda para P8.
- Una sola inscripción activa por estudiante y materia (definir cómo se
  garantiza).

## 4. Elegibilidad (tres niveles, no mezclar)
1. Por ventana: qué planes y años pueden inscribirse. Es dato de la ventana,
   no del código ni de las rules. No puede basarse solo en
   `estado == "ingresante"` (el 0708 arranca "activo"). SE IMPLEMENTA.
2. Por plan: qué espacios corresponden al plan del estudiante (sale del JSON
   del plan). SE IMPLEMENTA en 2027.
3. Académica por correlativas según historial: PREVISTA, NO se implementa.
   Dentro del pregrado no hay correlativas.

## 5. Planes (JSON): hechos y dependencias
- 662 es el plan madre. Los planes con letra (662B, 662E, 662G...; cada letra
  es un profesorado con orientación en un instrumento) llevan en algunas
  materias un dato `equivale_a` con el código del espacio en el 662. El 662 y
  el 0708 NO pueden traerlo.
- Hay espacios optativos agrupados (ej.: al menos 2 de 5 talleres EDI) y
  obligatorios específicos por plan (en 662G, el taller de Guitarra).
- Códigos de materia `xxxx-AA-NN.N`: `AA = 00` es pregrado. Verificar si el
  formato sirve para planes con letra y para el 0708 (empieza en 0708-01).
- Estado de los JSON hoy: solo 3 cargados (662, 708 y 662G provisorio con
  códigos legacy "62G", sin año 0 y duplicados). Yo estoy preparando los de la
  mayoría de los planes con al menos el año 0, y acotando `planes.json` a los
  vigentes.
- Dependencia crítica (D8): si una fila de la carga masiva referencia un plan
  sin JSON válido, se ABORTA toda la carga. Todo plan con ingresantes en
  febrero debe tener JSON cargado y revisado.
- Cada JSON de febrero debe traer: año de cada materia, códigos normalizados,
  `equivale_a` (planes con letra), grupos optativos con su mínimo y
  obligatorios propios del plan.

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

## 7. Permisos de edición de datos personales
- Estudiante, docente y bedel NO modifican sus propios datos.
- Bedel modifica estudiantes (sobre docentes: sin decidir).
- Coordinación modifica estudiantes, docentes y bedeles, pero no los propios
  ni los de otros coordinadores.
- Admin: sin definir. Pendiente: múltiples roles y si contraseña/email son
  excepción vía Firebase Auth.
- Coordinación hereda los permisos del Bedel, y Admin los de Coordinación.
  Los componentes no deben depender del rol: visibilidad y acciones por
  permisos.

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
| P1 | Modelo: calendario, ventanas y oferta, compatible con la carga de Coordinador | Diciembre |
| P2 | Modelo: inscripciones (colección plana, `activa`/`baja`, auditoría, pase, conteo de cupo), rules, `esPrueba` | Diciembre |
| P3 | Coordinador: ver y editar la oferta (ocupación por secuencia, editar cupo/aula/horario/docente, agregar comisiones; no cambiar ni eliminar una secuencia con inscriptos activos) | Diciembre |
| P4 | Prueba en producción: carga masiva, carga de oferta, bloque de inscripciones, limpieza de `esPrueba` | Diciembre |
| P5 | Vista del Estudiante: oferta filtrada por plan, inscripción y baja | Febrero |
| P6 | Bedel: ficha del estudiante | Febrero |
| P7 | Bedel: secuencias, con alta, baja y pase | Febrero |
| P8 | Solicitudes: pedido de pase y corrección de datos | Posterior |

Notas por plan:
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
- Acotar `planes.json` a los planes vigentes.
- Revisar la planilla de inscripciones de los coordinadores y probar la
  exportación para generar datos de prueba.
- Probar la carga de oferta de Coordinador antes de P4.
- Revisión de planes por coordinadores: semana próxima.
- Cargar el calendario académico 2027 cuando se publique.

## 13. Preguntas abiertas globales
- ¿Cuántos planes con pregrado existen y cuáles tienen JSON válido?
- ¿Los optativos solo se informan o se valida el mínimo al inscribirse?
- ¿Los obligatorios específicos se sugieren o se exigen?
- ¿"equivale_a" sirve también para las equivalencias del trámite de pase?
- ¿Qué permisos tiene el Admin sobre datos personales? ¿Puede el Bedel
  modificar datos de docentes?
- Estudiantes condicionales: ¿cómo afectan la oferta?