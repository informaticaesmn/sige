graph TD
  A[Firestore] --> B[Colecciones Raíz]
  A --> C[Subcolecciones (por usuario)]

  B --> B1[usuarios/{uid}]
  B --> B2[planes/{planId}]
  B --> B3[inscripcionesConfig/{id}]
  B --> B4[ofertaAcademica/{ciclo}]

  C --> C1[usuarios/{uid}/inscripciones/{idConfig}]
  C --> C2[usuarios/{uid}/inscripcionesConfirmadas/{id}]
  C --> C3[usuarios/{uid}/materiasAprobadas/{materiaId}]