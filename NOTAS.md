# Notas propias

## Cosas e ideas a implementar

- trabajar con dos branch:
    - ___main___ vinculado al hosting de Firebase ***Listo***
    - ___dev___ vinculado a un proyecto Vercel    ***Listo***
    - tendria que crear un tercer branch para la publicacion de paginas estaticas, via Github Pages?
- armar una vista para los nuevos inscriptos. Pregrado * (formulario de carga de preinscripcion) `descartado para 2026`

## cosas a tener en cuenta
- cambiar `todos los usuarios a DNI` ver de implementarlo Diciembre 2025 o Febrero 2026
- seguir trabajando en las `inscripciones a instrumento`.

## ideotas
 Tengo problemas para definir la estructura de la base de datos. con respecto a los planes de estudio y materias por varias razones:
 La escuela tiene muchos planes, casi todos basados en uno que es troncal que el 662 - Profesorado de Musica:
 Lista de Planes:
  - 662 -  Profesorado de Música
  - 662/letra (las letras vas desde la A hasta la Q) cada letra es un plan con orientacion en algun Instrumento (por ejemplo 662/J es el profesorado de Música con orientacion Piano)
  - 663 - Profesorado de Música con orientación en Direccion Coral
  - 664 - Profesorado de Música con orientación en Canto Lirico
  - 665 - Profesorado de Música con orientación en Direccion Orquestal
  - 666 - Profesorado de Música con orientación en Composición
  Despues vienen las carreras no docentes:
  - 389 - Cantante
  - 390 - Compositor
  - 391 - Director Coral
  - 392 - Director Orquestal
  - 393 - Instrumentista
  - 708 - Tecnico Superior en Sonido (esta es la unica que no comparte el tronco central de las materias del 662)

Esto hace que tenga que tener en cuenta previamente una lista de equivalencias entre materias para poder simplificar las inscripciones y que permita a estudiantes de diferentes planes acceder a las secuencias de los espacios comunes. (no se si soy claro).
- Creo que conviene desnormalizar el listado de matarias o inscripciones porque hay un consumo muy distinto desde la vista estudiante y la vista bedel.
- cargar el plan completo en en materias aprobadas (subcoleccion de usuarios [uid]) y usar para visibilizar las aprobadas y poder tener marcadas las habilitadas a cursar (o rendir) en base a las ya aprobadas. (esto lo tengo que charlar con la IA).
- que la subcoleccion materias aprobadas tengo codigo, nombre, fecha_cursado, fecha_aprobado, disponible(boolean) cargado en con alguna Function de Firebase. 
- La otra opcion es crear otra subcollecion de de materias disponibles a cursar o a rendir. (para inscripciones a cursados y a mesas).

- ir pensando que la vista Docente sea para ver sus secuencias y llevar la asistencia ( y la carga de notas?)

**Decisión Final sobre Estructura de Oferta (Oct 2025)**: Se optó por un modelo híbrido. Los planes de estudio viven en archivos JSON estáticos. La oferta académica de cada año se carga a una colección `ofertaAcademica_YYYY`, que contiene documentos por `materia` con una subcolección de `secuencias`. Se usa una colección `periodosInscripcion` para gestionar las fechas de apertura y cierre, vinculada a cada secuencia mediante un `periodoId`. Esto evita duplicar datos y facilita la gestión.
