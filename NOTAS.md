# Notas propias

## Cosas e ideas a implementar

- trabajar con dos branch:
    - ___main___ vinculado al hosting de Firebase
    - ___dev___ vinculado a un proyecto Vercel      
- armar una vista para los nuevos inscriptos. Pregrado * (formulario de carga de preinscripcion)

## cosas a tener en cuenta
- cambiar todos los usuarios a DNI ver de implementarlo Diciembre 2025 o Febrero 2026
- seguir trabajando en las inscripciones a instrumento.


```mermaid
graph TD
  A[Firestore] --> B[colecciones raíz]
  A --> C[subcolecciones]
  B --> B1[usuarios]
  B --> B2[planes]
  B --> B3[inscripcionesConfig]
  B --> B4[ofertaAcademica]
  C --> C1[usuarios/{uid}/inscripciones]
  C --> C2[usuarios/{uid}/inscripcionesConfirmadas]
  C --> C3[usuarios/{uid}/materiasAprobadas]
```