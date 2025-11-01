# SIGE - ESMN
<!--VERSION-->
Version actual: dev v0.7.4
<!--/VERSION-->

### Estamos utilizando para este desarrollo: 
- Vue 3
- Vite
- Tailwindcss 3
- VueRouter
- Node.js
- GitHub
- Firebase Auth
- Firebase Firestore
- Firebase Functions
- Firebase Hosting
- Heroicons
- Vercel

## Porque estamos acá
Esta es una primera implementación de un pequeño

**S.I.G.E.**  
_Sistema Interno de Gestion Educativa para la Escuela Superior de Música de Neuquén_ 

> [Link de Firebase Hosting](https://prueba1-esmn.web.app) para la rama de producción

> [Link de Vercel](https://sige-esmn.vercel.app) para la rama de desarrollo 

Desarrollado por personal de la escuela, para suplir la falta de gestion que ofrece el Consejo Provincial de Educación, institucion que debería proveernos de las herramientas de gestion necesaria, para una educación de nivel acorde a los tiempos que corren y con la tecnologia que implica.

## Funciones y etapas
Esta pequeña app está pensada para ir sumando funcionalidades por etapas siendo estas:
- __Primer etapa__: Desarrollo de UI, integración con el sistema de Google Cloud, Firebase y que pueda dar un manejo claro para tener los datos del estudiantado en un repositorio unico y ordenado que sea fuente de datos para cualquier proceso administrativo que se requiera.
    - [x] Diseño de un `login`
    - [x] Vinculo de login con el servicio de `Autenticación` de Firebase.
    - [x] Vinculo del registro de cada usuario con los datos existentes proporcionados por Bedelia.
    - [x] Que el usuario puedo gestionar su propio `Registro`.
    - [x] Que el usuario pueda blanquear/resetear su `contraseña` de manera autonoma.
    - [x] Que sea vean los `terminos y condiciones` de uso antes del registro.
    - [ ] Armado de un `TableroE.vue` claro con todos sus datos. Prioridad para Estudiantes, luego Bedeles.
    - [ ] Carga de los datos existentes:
        - [x] Carga de los `planes` de estudio y con su logica de correlativas
        - [x] Armar el paquete de `oferta académica` que se ofrece por cada ciclo, este proceso es crucial para que esta app resuelva las inscripciones a cursados y empiece a ser repositorio de la trazabilidad de los recoridos academicos de cada estudiante de la institución.
        - [ ] Carga de la oferta académica anual desde un archivo CSV.
        - [ ] `Usuarios` (datos basicos)
        - [ ] Datos para la inscripcion de prueba Noviembre 2025
        
- __Segunda etapa__: Teniendo cargados los planes de estudio y el listado de usuarios activos la idea es ni bien se pueda, publicar y convocar al estudiantado a registrarse a la nueva app con la idea de realizar una prueba de inscripcion con los datos de la inscripcion 2025 que sirva de presentacion de la app y de tutorial interactivo de como se realizaran las inscripciones a partir de febrero 2026. 
Armar el paquete de oferta academica que se ofrece por cada ciclo, este proceso es crucial para que esta app resuelva las inscripciones a cursados y empiece a ser repositorio de la trazabilidad de los recoridos academicos de cada estudiante de la institución.
    - [ ] Armar el vinculo entre la propuesta academica y una UI para presentarla a cada usuario para poder realizar las inscripciones
    - [ ] Probar toda las funcionalidades activas para poder encarar las inscripciones 2026 con esta app.
- __Tercer y demas etapas__ por ver... hay muchas ideas que plasmar. Acá me tienen que ayudar a escribir

### Notas e Ideas
> Hay un archivo con [notas e ideas](NOTAS.md) que se van generando en el equipo de trabajo reunido para pensar en este sistema 

<br><br><br><p align="right"> <i>Genaro Villar   </i></p>
































