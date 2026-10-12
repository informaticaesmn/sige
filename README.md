# SIGE - ESMN
<!--VERSION-->
Version actual: dev v0.7.17
<!--/VERSION-->

### Estamos utilizando para este desarrollo: 
- Vue 3.4.27 (Composition API, `<script setup>`)
- Vite 5.4.21
- TailwindCSS 3.4.3 (temas por rol con variables CSS)
- Vue Router 4.4.0
- Node.js v24.20.0
- GitHub (control de versiones con branches `dev`/`main`)
- Firebase 12.2.1 (Auth, Firestore Lite, Functions v2, Hosting)
- @vueuse/components 13.9.0 (v-on-click-outside)
- Heroicons 2.2.0
- Vercel (staging) / Firebase Hosting (producción)

### Documentación del proyecto
- [Agents.md](Agents.md) — Guía de estilo y convenciones
- [context.md](context.md) — Análisis completo del proyecto, arquitectura y plan de trabajo
- [NOTAS.md](NOTAS.md) — Notas de diseño sobre estructura de datos y planes de estudio
- [MIGRATION.md](MIGRATION.md) — Historial de migración de proyecto Firebase

## Porque estamos acá
Esta es una primera implementación de un pequeño

**S.I.G.E.**  
_Sistema Interno de Gestion Educativa para la Escuela Superior de Música de Neuquén_ 

> [Link de Firebase Hosting](https://sige-esmn.web.app) para la rama de producción

> [Link de Vercel](https://sige-esmn.git.dev-informaticaesmns-projects.vercel.app) para la rama de desarrollo

Desarrollado por personal de la escuela, para suplir la falta de gestion que ofrece el Consejo Provincial de Educación, institucion que debería proveernos de las herramientas de gestion necesaria, para una educación de nivel acorde a los tiempos que corren y con la tecnologia que implica.

## Migración de Proyecto Firebase

En noviembre de 2025 se realizó la migración del proyecto Firebase de `prueba-1.esmn` a `sige-esmn`. Para más detalles, ver [MIGRATION.md](MIGRATION.md).

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
        - [ ] Carga de la oferta academica anual desde un archivo CSV.
        - [ ] `Usuarios` (datos basicos)
        - [ ] Datos para la inscripcion de prueba Noviembre 2025
        
- __Segunda etapa__: Teniendo cargados los planes de estudio y el listado de usuarios activos la idea es ni bien se pueda, publicar y convocar al estudiantado a registrarse a la nueva app con la idea de realizar una prueba de inscripcion con los datos de la inscripcion 2025 que sirva de presentacion de la app y de tutorial interactivo de como se realizaran las inscripciones a partir de febrero 2026. 
Armar el paquete de oferta academica que se ofrece por cada ciclo, este proceso es crucial para que esta app resuelva las inscripciones a cursados y empiece a ser repositorio de la trazabilidad de los recoridos academicos de cada estudiante de la institución.
    - [ ] Armar el vinculo entre la propuesta academica y una UI para presentarla a cada usuario para poder realizar las inscripciones

## 🚧 Estado del Proyecto (v0.7.16)

| Área | Estado |
|------|--------|
| Auth (login, registro, reset, selección de rol) | ✅ Completo |
| Layouts dinámicos + theming por rol | ✅ Implementado |
| Router guard con protección de rutas | ✅ Implementado |
| Plan de estudio (JSON local) + correlativas | ✅ Vistas funcionales |
| Oferta académica + inscripciones (estructura) | 🚧 En desarrollo |
| Tableros por rol | 🚧 Estudiante (parcial), otros placeholders |
| Testing | ❌ Sin infraestructura (proponer Vitest) |
| Historial académico | ❌ No implementado |
| CI/CD | ⚠️ Deploys automáticos (Vercel + Firebase), sin tests |

**Problemas críticos conocidos** (ver [context.md](context.md) para detalle):
- `InscripcionesE.vue` tiene templates duplicados (rompe build)
- `DashboardE.vue` es dead code con imports rotos
- `firestore.rules` usa colección hardcodeada `inscripciones2026` (no coincide con `inscripciones20261`)

## 🧪 Testing

Actualmente **no existe infraestructura de testing**. Se propone instalar **Vitest + Vue Test Utils + happy-dom** para testear:
- Composables (`useAuth`, `useLayout`, `useOfertaAcademica`, `useInscripciones`)
- Guardia de navegación (mocking router + auth state)
- Componentes UI (`FormInput`, `FormCheckbox`)

Ver el plan detallado en [context.md#plan-de-trabajo](context.md).











