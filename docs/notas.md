# Notas propias

> Notas de diseÃ±o, ideas y roadmap. Para el estado tÃ©cnico y los problemas abiertos, ver [contexto.md](contexto.md).

## Cosas e ideas a implementar

- trabajar con dos branch:
    - ___main___ vinculado al hosting de Firebase ***Listo***
    - ___dev___ vinculado a un proyecto Vercel    ***Listo***
    - tendria que crear un tercer branch para la publicacion de paginas estaticas, via Github Pages?
- armar una vista para los nuevos inscriptos. Pregrado * (formulario de carga de preinscripcion) `descartado para 2026`

## cosas a tener en cuenta
- cambiar `todos los usuarios a DNI` ***Listo***
- seguir trabajando en las `inscripciones a instrumento`.

## ideotas
 Tengo problemas para definir la estructura de la base de datos. con respecto a los planes de estudio y materias por varias razones:
 La escuela tiene muchos planes, casi todos basados en uno que es troncal que el 662 - Profesorado de Musica:
 Lista de Planes:
  - 662 -  Profesorado de MÃºsica
  - 662/letra (las letras vas desde la A hasta la Q) cada letra es un plan con orientacion en algun Instrumento (por ejemplo 662/J es el profesorado de MÃºsica con orientacion Piano)
  - 663 - Profesorado de MÃºsica con orientaciÃ³n en Direccion Coral
  - 664 - Profesorado de MÃºsica con orientaciÃ³n en Canto Lirico
  - 665 - Profesorado de MÃºsica con orientaciÃ³n en Direccion Orquestal
  - 666 - Profesorado de MÃºsica con orientaciÃ³n en ComposiciÃ³n
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

**DecisiÃ³n Final sobre Estructura de Oferta (Oct 2025)**: Se optÃ³ por un modelo hÃ­brido. Los planes de estudio viven en archivos JSON estÃ¡ticos. La oferta acadÃ©mica de cada aÃ±o se carga a una colecciÃ³n `ofertaAcademica_YYYY`, que contiene documentos por `materia` con una subcolecciÃ³n de `secuencias`. Se usa una colecciÃ³n `periodosInscripcion` para gestionar las fechas de apertura y cierre, vinculada a cada secuencia mediante un `periodoId`. Esto evita duplicar datos y facilita la gestiÃ³n.

> âš ï¸ **Superado (Oct 2026):** la oferta ya no se modela como documento por materia en `ofertaAcademica_YYYY`. El modelo vigente es un **documento Ãºnico por ciclo** en `ofertaAcademica/{ciclo}` (`etapas â†’ materias â†’ comisiones`), cargado desde la app por el rol `coordinacion` (`useCargaOferta.js`). Ver [contexto.md](contexto.md) e [importar-oferta.md](importar-oferta.md).



## RevisiÃ³n de cÃ³digo â€” pendientes (Oct 2026)

> El detalle de cada problema (con impacto, archivos y lÃ­neas) estÃ¡ en [contexto.md](contexto.md#-problemas-identificados-pendientes).
> AcÃ¡ queda solo lo que bloquea el flujo principal.

### ðŸ”´ Bloqueantes de producciÃ³n

- âœ… **`firestore.rules`** (arreglado y **deployado** el 19/10/2026): la regla de inscripciones estaba hardcodeada (`inscripciones2026`) y no matcheaba el nombre dinÃ¡mico que arma el cÃ³digo (`inscripciones20261`) â†’ inscripciones denegadas por permisos. AdemÃ¡s, los dos `allow update` se combinaban con OR, asÃ­ que un estudiante podÃ­a cambiarse el `estado` a `confirmada` solo. Ya no se deploya a mano: el workflow de `main` publica las reglas en cada release (ver el punto siguiente).
- Deploy de `main`: **resuelto el 19/10/2026**. El workflow corrÃ­a entero pero fallaba al publicar porque el secreto `FIREBASE_SERVICE_ACCOUNT_KEY` guardaba una clave del proyecto **viejo** (`firebase-adminsdk-9p782@prueba1-esmn`), que solo tenÃ­a permisos ahÃ­ (de ahÃ­ que los releases publicaran en `prueba1-esmn`). Errores exactos al publicar en `sige-esmn`: hosting â†’ `Failed to get Firebase project ...`; reglas â†’ `Request to https://firebaserules.googleapis.com/...:test had HTTP Error: 403, The caller does not have permission`. Se reemplazÃ³ el secreto por una clave nueva de `firebase-adminsdk-fbsvc@sige-esmn` + los roles `Firebase Hosting Admin` y `Firebase Rules Admin`. Run verde: [39207423186](https://github.com/informaticaesmn/sige/actions/runs/39207423186) (hosting + reglas).
- **`useOfertaAcademica.js`** (corregido el 18/10/2026): el `u//` de la primera lÃ­nea era un `ReferenceError` al importar el mÃ³dulo, por lo que `InscripcionesE.vue` se rompÃ­a al navegar; ademÃ¡s importaba del SDK completo de Firestore en lugar de `/lite`. El chunk de esa vista pasÃ³ de 488 kB a 5,6 kB.

### ðŸŸ¡ Para revisar

- `useLayout.js` resetea el layout en cada llamada (parpadeo de tema).
- `useAuth.js` no hace `unsubscribe` de `onAuthStateChanged`.
- `alert()` en `BarraApp.vue`, `ResetPassword.vue` y `SeleccionarRol.vue` (viola AGENTS Â§5).
- ConvenciÃ³n de error sin definir: `useInscripciones` lanza en "usuario no autenticado" en lugar de devolver `{ exito:false, error }` (viola AGENTS Â§5). ✅ Resuelto (Bloque 1/Paso 2): `useInscripciones` ahora devuelve `{ exito: false, error }` en lugar de lanzar.
- `.env` local escribe `VITE_FIREBASE_STORAGE_BUCKET="sige-esmn.firebasestore.app"` (le falta la `a`): el valor correcto es `sige-esmn.firebasestorage.app`, que es el que tiene el secreto del CI. Como la app no usa Firebase Storage, hoy no rompe nada, pero es una bomba de tiempo. ✅ Resuelto (Bloque 1/Paso 1): corregido a `sige-esmn.firebasestorage.app`.
- âœ… (19/10/2026) Los CSV con datos personales se sacaron del repo (ahora en `data/`, ignorado por git) y el workflow de deploy a Firebase Hosting ya apunta a `sige-esmn` (antes `prueba1-esmn`).


---

## OldAgents

> Contenido archivado desde `Agents.md` durante la reestructuraciÃ³n de documentaciÃ³n (Oct 2026).
> Estas secciones fueron removidas de Agents.md porque no son reglas universales aplicables a cada tarea.

### Firestore Lite vs Firestore (ex Â§7.2)

El archivo `src/config/firebase.js` inicializa Firestore con `getFirestore` desde `'firebase/firestore/lite'`. **Todos** los composables deben importar funciones desde `'firebase/firestore/lite'` para mantener consistencia y evitar incluir cÃ³digo de listeners en tiempo real innecesarios.

> Nota: Esta regla fue comprimida en una lÃ­nea dentro de Agents.md Â§4 (Firebase).

### Testing (ex Â§10)

- **Framework propuesto**: Vitest + Vue Test Utils (instalable como devDependency, compatible con Vite)
- **Estrategia**: Testear los composables (con mock de Firebase), la guardia de navegaciÃ³n (con mock de router y auth state), y los componentes UI crÃ­ticos (formularios, cards)
- **CI**: GitHub Actions que ejecuta tests en cada push a `dev`/`main`. Actualmente no existe infraestructura de testing â€” es un item pendiente crÃ­tico.

### Regla duplicada removida (ex Â§11 L123)

La lÃ­nea "Evita usar `alert()` o `console.log()` genÃ©ricos en componentes â€” usa el patrÃ³n `{ exito, error }` de los composables y muestra feedback en la UI" era un duplicado exacto de Â§5 (Manejo de Errores). Se eliminÃ³ la copia.

---

## OldContext

> Contenido archivado desde `context.md` durante la reestructuraciÃ³n de documentaciÃ³n (Oct 2026).
> Estas secciones fueron removidas porque no aportan reglas accionables para el agente de cÃ³digo.

### Objetivo Principal

Generar una aplicaciÃ³n web de bajo costo y alta eficiencia que centralice y simplifique la GestiÃ³n AcadÃ©mica para la comunidad de la Escuela Superior de MÃºsica de NeuquÃ©n. La plataforma debe servir como una fuente Ãºnica de verdad para los datos de estudiantes, oferta acadÃ©mica y trayectorias, accesible para los distintos roles dentro de la instituciÃ³n.

### Stakeholders

*   **Desarrollador Principal**: Genaro Villar (`InformaticaESMN`).
*   **Equipo de Pruebas (Testers)**:
    *   **Coordinadores AcadÃ©micos**: RamÃ³n Sarallegui, Facundo Gomez Saibene, Victoria Maclean.
    *   **Bedeles**: Adriana FalcÃ³n, Diego Price, Ana San Martin.
    *   **Estudiantes**: Majo Ortega (y otros a sumar).
*   **Usuarios Finales**:
    *   **Estudiantes**: (~800 activos) para consulta de datos, inscripciones, etc.
    *   **Bedeles**: Para la gestiÃ³n diaria de la informaciÃ³n estudiantil.
    *   **Administrativos/SecretarÃ­a**: Para gestiÃ³n de equivalencias y tÃ­tulos.
    *   **Coordinadores/Administradores**: Para la configuraciÃ³n de la oferta acadÃ©mica.
    *   **Docentes (a futuro)**: Para funciones como toma de asistencia o carga de notas.

### Decisiones TÃ©cnicas Tomadas

#### Stack elegido:

*   **Frontend**: Vue 3 (con Composition API y `<script setup>`), Vite, TailwindCSS.
*   **Backend & Base de Datos (BaaS)**: Firebase (Authentication y Firestore).
*   **Hosting**: Vercel para la rama `dev` (staging) y Firebase Hosting para `main` (producciÃ³n).
*   **Control de Versiones**: Git, alojado en GitHub. manejado por dos script:
      - .update.dev.ps1 para la rama `dev`
      - .update.main.ps1 para la rama `main`
*   **Fuente de Datos Inicial**: Google Sheets, con exportaciÃ³n a JSON mediante Apps Script. o CSV con script de Node.js

#### Arquitectura:

La aplicaciÃ³n sigue una arquitectura moderna basada en componentes y servicios desacoplados (BaaS - Backend as a Service).

1.  **Arquitectura Frontend (Vue 3)**:
    *   **Basada en Componentes**: La UI se construye con componentes reutilizables (`.vue`). Las vistas principales se encuentran en `src/views` y los componentes de UI reusables en `src/components`.
    *   **LÃ³gica Desacoplada (Composables)**: Toda la lÃ³gica de negocio y la interacciÃ³n con el backend se aÃ­sla en funciones "composables" (`src/composables`). Por ejemplo, `useAuth.js` maneja la autenticaciÃ³n y `useUsuarios.js` gestiona los datos de usuarios en Firestore.
    *   **Enrutamiento y Layouts**: Se utiliza `vue-router` para la navegaciÃ³n. La arquitectura de rutas define layouts dinÃ¡micos (`AdminLayout`, `EstudianteLayout`, etc.) que envuelven a las vistas hijas, permitiendo interfaces distintas con themes especificos (colores distintos) segÃºn el rol del usuario.
    *   **GestiÃ³n de Estado**: Se utiliza un enfoque de estado reactivo y descentralizado a travÃ©s de los `composables`. Por ejemplo, `useAuth` expone un estado reactivo global para el usuario autenticado, evitando la necesidad de una librerÃ­a de estado mÃ¡s compleja como Pinia por el momento.

2.  **Arquitectura Backend (Firebase)**:
    *   **Serverless**: No hay un servidor propio. La aplicaciÃ³n se comunica directamente desde el cliente a los servicios de Firebase.
    *   **AutenticaciÃ³n**: Firebase Authentication gestiona la identidad de los usuarios (login, registro, reseteo de contraseÃ±a).
    *   **Base de Datos (Firestore)**:
        *   **Modelo de Datos**: Es una base de datos NoSQL orientada a documentos. La colecciÃ³n principal es `usuarios`.
        *   **Identificadores**: Se sigue una estrategia de doble identificador:
            1.  **Pre-registro**: Los perfiles de los estudiantes se precargan en documentos cuyo ID es el `email` del estudiante.
            2.  **Registro Completo**: Cuando un usuario se registra, se crea un nuevo documento cuyo ID es el `uid` de Firebase Auth, se copian los datos del documento de pre-registro y este Ãºltimo se elimina. Esto se hace de forma atÃ³mica usando un `writeBatch` para garantizar la integridad.
        *   **Acceso a Datos**: Todas las lecturas y escrituras a Firestore estÃ¡n centralizadas en los `composables`, nunca directamente desde los componentes.
        mas detalle de la estructura de datos en [modelo-datos.md](modelo-datos.md)

### VisiÃ³n General del Proyecto

#### MisiÃ³n

Generar una aplicaciÃ³n web de bajo costo y alta eficiencia que centralice y simplifique la GestiÃ³n AcadÃ©mica para la comunidad de la Escuela Superior de MÃºsica de NeuquÃ©n (ESMN). La plataforma sirve como fuente Ãºnica de verdad para datos de estudiantes, oferta acadÃ©mica y trayectorias, accesible segÃºn el rol de cada usuario.

#### Arquitectura de Alto Nivel

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  Browser / SPA (Vue 3 + Vite + TailwindCSS)          â”‚
â””â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”˜
       â”‚                                     â”‚
       â–¼                                     â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”                   â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  Firebase Auth â”‚                   â”‚  Firestore Lite  â”‚
â”‚  (login,       â”‚â—„â”€â”€â”€ HTTPS â”€â”€â”€â”€â”€â”€â”€â–ºâ”‚  (usuarios,     â”‚
â”‚   registro,    â”‚     Callable      â”‚   ofertaAcad.,  â”‚
â”‚   reset)       â”‚                   â”‚   inscripciones)â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜                   â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
       â–²                                     â–²
       â”‚  HTTPS Callable                        â”‚ Firestore Lite SDK
       â–¼                                     â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”              â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  Cloud Function â”‚              â”‚  Static Assets     â”‚
â”‚  (registrarUsuario)â”‚              â”‚  (/public/planes/)â”‚
â”‚                  â”‚              â”‚  (JSON)            â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜              â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

#### Stack TecnolÃ³gico Detallado

| Capa | TecnologÃ­a | VersiÃ³n | Comentario |
|------|-----------|---------|------------|
| Framework | Vue | ^3.5.44 | Composition API, `<script setup>` |
| Bundler | Vite | ^6.4.5 | Build y dev server |
| CSS | TailwindCSS | ^3.4.3 | Theming con variables CSS |
| Routing | vue-router | ^4.6.4 | Guardia global `beforeEach` |
| Iconos | Heroicons | ^2.2.0 | Vue 24/outline y 16/solid |
| Utilidades | @vueuse/components | ^13.9.0 | `v-on-click-outside` |
| Auth | Firebase Auth | ^12.2.1 | Login, registro, reset |
| DB | Firestore (Lite) | via firebase ^12.2.1 | Lectura eficiente sin listeners |
| Functions | Firebase Functions v2 | ^6.6.0 | `registrarUsuario` callable |
| Hosting (prod) | Firebase Hosting | â€” | Rama `main` |
| Hosting (staging) | Vercel | â€” | Rama `dev` |
| Node.js | â€” | v24.x (LTS) | Runtime local y builds |

#### Estructura de Directorios

```
sige/
â”œâ”€â”€ public/                     # Assets estÃ¡ticos + datos JSON
â”‚   â”œâ”€â”€ planes/                 # Planes de estudio (662.json, 662G.json, 708.json, planes.json)
â”‚   â”œâ”€â”€ index.html              # (placeholder Firebase â€” no es el entry de la app)
â”‚   â”œâ”€â”€ _redirects              # SPA fallback
â”‚   â””â”€â”€ avatar.png
â”œâ”€â”€ src/
â”‚   â”œâ”€â”€ App.vue                 # Entry: <AppLoading/> + <router-view/> + <FooterApp/>
â”‚   â”œâ”€â”€ main.js                 # createApp + router, style.css importado primero
â”‚   â”œâ”€â”€ style.css               # Tailwind + themes + componentes genÃ©ricos
â”‚   â”œâ”€â”€ components/
â”‚   â”‚   â”œâ”€â”€ BarraApp.vue        # Nav dinÃ¡mica por rol + dropdown usuario + tÃ©rminos modal
â”‚   â”‚   â”œâ”€â”€ FooterApp.vue       # Footer con versiÃ³n, layout actual
â”‚   â”‚   â”œâ”€â”€ AppLoading.vue      # Spinner overlay durante init de auth
â”‚   â”‚   â”œâ”€â”€ legal/TerminosContenido.vue  # âš ï¸ Importado por BarraApp
â”‚   â”‚   â”œâ”€â”€ ui/                 # FormInput.vue, FormCheckbox.vue
â”‚   â”‚   â””â”€â”€ estudiante/         # PerfilCard, InscripcionesVigentesCard, MateriasAprobadasCard,
â”‚   â”‚                           #   PlanesEstudioCard, TablaPlanEstudio, DetalleMateria,
â”‚   â”‚                           #   BuscadorMaterias, CorrelativasList
â”‚   â”œâ”€â”€ composables/
â”‚   â”‚   â”œâ”€â”€ useLayout.js        # Theme + layout singleton (body class switching)
â”‚   â”‚   â”œâ”€â”€ auth/useAuth.js     # Auth singleton: login, logout, register, reset, checkAuthState
â”‚   â”‚   â”œâ”€â”€ usuarios/useUsuarios.js  # CRUD usuarios + migraciÃ³n emailâ†’uid + normalizaciÃ³n roles
â”‚   â”‚   â”œâ”€â”€ usuarios/useImportarUsuarios.js  # Carga masiva de usuarios desde CSV (rol coordinacion)
â”‚   â”‚   â”œâ”€â”€ inscripciones/
â”‚   â”‚   â”‚   â”œâ”€â”€ useOfertaAcademica.js  # Carga ofertaAcademica/{ciclo}
â”‚   â”‚   â”‚   â”œâ”€â”€ useCargaOferta.js      # Carga masiva de oferta desde CSV (rol coordinacion)
â”‚   â”‚   â”‚   â””â”€â”€ useInscripciones.js    # Crea/lee inscripciones subcolecciÃ³n
â”‚   â”‚   â””â”€â”€ academico/usePlanesEstudio.js  # Carga JSON local + procesa correlativas
â”‚   â”œâ”€â”€ config/firebase.js      # Inicializa Auth, Firestore Lite, Functions, Analytics
â”‚   â”œâ”€â”€ router/
â”‚   â”‚   â”œâ”€â”€ index.js            # Rutas + guardia beforeEach + routerInstance assignment
â”‚   â”‚   â””â”€â”€ routerInstance.js   # Singleton para evitar circular deps
â”‚   â”œâ”€â”€ layouts/                # AccesoLayout, EstudianteLayout, AdminLayout, BedelLayout, DocenteLayout, CoordinacionLayout
â”‚   â””â”€â”€ views/
â”‚       â”œâ”€â”€ auth/               # Login, Register, ResetPassword, SeleccionarRol, Terminos, PlanesEstudioPublico
â”‚       â”œâ”€â”€ estudiante/         # TableroE, InscripcionesE, HAcademico, OtrasFunciones, PlanesEstudioView
â”‚       â”œâ”€â”€ admin/              # TableroA
â”‚       â”œâ”€â”€ bedel/              # TableroB, ConfirmarInscripciones
â”‚       â”œâ”€â”€ docente/            # TableroD
â”‚       â””â”€â”€ coordinacion/       # TableroC, CargaMasiva
â”œâ”€â”€ codebase-functions/         # Cloud Functions v2 (registrarUsuario)
â”œâ”€â”€ firebase.json, firestore.rules, firestore.indexes.json
â”œâ”€â”€ vite.config.js, tailwind.config.js, postcss.config.js
â”œâ”€â”€ update-dev.ps1, update-main.ps1  # Scripts de versionado + deploy
â””â”€â”€ package.json (v0.7.26)
```

### GuÃ­a de Testing Manual

#### CÃ³mo probar la app:
1.  **Acceder al Entorno de Pruebas**: Navegar a la URL de Vercel (rama `dev`): https://sige-esmn.vercel.app/
2.  **Casos de Prueba Sugeridos**:
    *   **Registro Exitoso**: Intentar registrarse con un email que SÃ estÃ© en la lista de pre-aprobados. El sistema deberÃ­a permitir el registro y redirigir al tablero correspondiente.
    *   **Registro Fallido (No Aprobado)**: Intentar registrarse con un email que NO estÃ© en la lista. Se debe mostrar un mensaje de error claro indicando que debe contactar a BedelÃ­a.
    *   **Login/Logout**: Iniciar sesiÃ³n con una cuenta ya creada y luego cerrar sesiÃ³n.
    *   **ProtecciÃ³n de Rutas**: Intentar acceder a una ruta protegida (ej. `/estudiante`) sin haber iniciado sesiÃ³n. El sistema debe redirigir a la pÃ¡gina de login.
3.  **Reporte de Bugs**:
    *   Capturar la pantalla si es un error visual.
    *   Abrir la consola del navegador (F12), ir a la pestaÃ±a "Consola" y copiar cualquier mensaje de error en rojo.
    *   Enviar la informaciÃ³n

### Resumen de Estado (snapshot Oct 2026)

| CategorÃ­a | Estado |
|-----------|--------|
| CompilaciÃ³n (`vite build`) | âœ… Funcional |
| Tests | âœ… Funcional |
| Lint | âŒ No configurado |
| CI/CD | âš ï¸ Deploys automÃ¡ticos (`main` â†’ Firebase Hosting + reglas); el workflow corre tests, pero el deploy aÃºn no depende de ellos |
| Seguridad Firestore | âœ… Wildcard dinÃ¡mico + reglas de roles desplegadas (19/10/2026) |
| Componentes UI crÃ­ticos | âœ… Completados |
| Auth flow | âœ… Funcional (login, registro, reset, selecciÃ³n de rol) |
| Theming/Layout | âœ… Integrado con router guard |

---

## PlanDeTrabajo

> Contenido archivado desde `context.md` durante la reestructuraciÃ³n de documentaciÃ³n (Oct 2026).

### Estado Actual

#### âœ… COMPLETADO:
*   DefiniciÃ³n del stack tecnolÃ³gico y la arquitectura base.
*   Estructura de layouts y theming con TailwindCSS para diferentes roles.
*   Mecanismo de importaciÃ³n de datos iniciales desde Google Sheets a Firestore.
*   LÃ³gica de autenticaciÃ³n (Login/Logout) y estado de usuario reactivo.
*   Flujo de registro de usuarios con pre-aprobaciÃ³n y migraciÃ³n de datos.
*   ImplementaciÃ³n de la vista "Seleccionar Rol" para usuarios con mÃºltiples perfiles.

#### ðŸš§ EN DESARROLLO:
*   Probar en un grupo mas amplio de la experiencia de usuario en los formularios de autenticaciÃ³n. Revisar la seguridad y todos los pasos que tienen que ver con el acceso y autenticaciÃ³n.
*   ConstrucciÃ³n de los tableros principales para cada rol (Estudiante, Bedel, Admin).

#### ðŸ“‹ PENDIENTE:
*   **Funcionalidad Core**:
    *   Terminar de definir estructura de datos para los planes contemplando las correlativas.
    *   MÃ³dulo de inscripciÃ³n a cursadas para estudiantes y confirmacion por partes del chequeo de correlativas de Bedelia.
    *   VisualizaciÃ³n de trayectoria acadÃ©mica (materias aprobadas, estado).
    *   Carga de la trayectoria acadÃ©mica con todas los posibles procesos que llevan a la nota final:
      - cursar y aprobar sin promocionar (nota menor a 7) -> presentarse a mesas con cararcter de "regular" por haber aprobado el cursado y desaprobar o aprobar.
      - cursar y promocionar (con eso ya tiene una nota final y materia aprobada)
      - presentarse a una mesa de examen en caracter de libre
      - obtener la materia aprobada por equivalencia: tener estudios previos en nuestra institucion, en otro plan o estudios previos en otras instituciones y presenta la documentacion.
*   **AdministraciÃ³n**:
    *   Panel de administraciÃ³n para la gestiÃ³n de usuarios y roles.
    *   Herramienta para configurar la oferta acadÃ©mica de cada ciclo lectivo.
*   **Mejoras y Refinamiento**:
    *   ImplementaciÃ³n de un sistema de notificaciones en la UI.
    *   OptimizaciÃ³n de consultas a Firestore y reglas de seguridad.

### Dudas/Preguntas Abiertas

*   **Escalabilidad de Firestore**: Â¿SerÃ¡ necesario optimizar las consultas o cambiar el modelo de datos cuando se agreguen las inscripciones y las trayectorias acadÃ©micas? Â¿CÃ³mo impactarÃ¡ en los costos?
*   **GestiÃ³n de Estado Compleja**: Si la aplicaciÃ³n crece, Â¿serÃ¡ el enfoque actual con `composables` suficiente o se deberÃ¡ migrar a una soluciÃ³n como Pinia para gestionar estados mÃ¡s complejos (ej. datos de inscripciones, oferta acadÃ©mica filtrada, etc.)?
*   **Seguridad**: Â¿Las reglas de seguridad de Firestore actuales son suficientemente robustas? NecesitarÃ¡n una revisiÃ³n exhaustiva antes de pasar a producciÃ³n.

### Fases del Plan

#### Fase 1: CorrecciÃ³n de errores crÃ­ticos ðŸ”´

1. âœ… **Unificar `InscripcionesE.vue`** â€” Reemplazar con un Ãºnico `<template>` usando la lÃ³gica del segundo bloque (composables `useOfertaAcademica` + `useInscripciones`), eliminando cÃ³digo muerto.
2. âœ… **Eliminar `DashboardE.vue`** â€” hecho (Oct 2026): dead code no referenciado, eliminado.
3. âœ… **Normalizar imports Firestore** â€” Cambiar `'firebase/firestore'` â†’ `'firebase/firestore/lite'` en `useOfertaAcademica.js` e `useInscripciones.js`.
4. âœ… **Corregir `firestore.rules`** â€” Reemplazar `inscripciones2026` con wildcard `{inscripcionesCollectionId}`. Resolver conflicto de `allow update`.

#### Fase 2: Mejoras de calidad de cÃ³digo ðŸŸ¡

5. **Refactorizar `ResetPassword.vue`** â€” Usar `resetPassword` de `useAuth.js`. Reemplazar `alert()` con UI feedback.
6. **Consolidar `TerminosContenido.vue`** â€” Unificar las dos copias en `src/components/legal/`. ✅ Hecho (Bloque 1/Paso 3): única copia en `legal/`; imports verificados en `src/`.
7. **Limpiar `Register.vue`** â€” Remover import no usado. Arreglar redirecciÃ³n hardcodeada.
8. **Limpiar `BarraApp.vue`** â€” Reemplazar `alert()` en "Solicitar Baja".
9. **Refactorizar `useLayout.js`** â€” Mover `setLayout('acceso')` de mÃ³dulo a `App.vue`/`main.js`.

#### Fase 3: Testing ðŸ§ª

10. **Instalar Vitest + Vue Test Utils + happy-dom**.
11. **Escribir `vitest.config.js`** con alias `@` â†’ `src/`.
12. **Tests para `useLayout`**: `setLayout('estudiante')` â†’ verifica `currentLayout.value` y clase body.
13. **Tests para `useAuth`**: mock de Firebase Auth + Firestore, test de `loginFirebase`, `registrarUsuario`, `logoutFirebase`.
14. **Tests para guardia de navegaciÃ³n**: mock de router + auth state, verifica redirects por rol.
15. **Tests para componentes UI**: `FormInput`, `FormCheckbox`.
16. **CI con GitHub Actions**: workflow que corre `npx vitest run` en cada push.

#### Fase 4: Features pendientes ðŸ“‹

17. Implementar `HAcademico.vue` (historial acadÃ©mico).
18. Completar tableros de Bedel/Docente/Admin.
19. Sistema de notificaciones UI.

---

## Plan de ActualizaciÃ³n del Stack TecnolÃ³gico (Octubre 2026)

> Estado inicial: Node.js 24.x LTS ya implementado y validado (59/59 tests y build exitosos).
> A continuaciÃ³n se define la hoja de ruta para la modernizaciÃ³n gradual del stack.

### Matriz de Componentes y Complejidad

| Componente | VersiÃ³n actual | Objetivo sugerido | Complejidad | Riesgo |
|------------|----------------|-------------------|-------------|--------|
| **Vue Core** | `^3.4.27` | `^3.5.x` | ðŸŸ¢ Baja | MÃ­nimo (100% retrocompatible) |
| **Vue Router** | `^4.4.0` | `^4.5.x` | ðŸŸ¢ Baja | MÃ­nimo |
| **@vueuse/components** | `^13.9.0` | `^13.9.x` / `^14.x` | ðŸŸ¢ Baja | MÃ­nimo |
| **Vite** | `^5.3.1` (5.4.21) | `^6.x` | ðŸŸ¡ Media | Medio (plugins y config) |
| **@vitejs/plugin-vue** | `^5.0.5` | `^6.x` | ðŸŸ¡ Media | Vinculado a Vite 6 |
| **Vitest** | `^2.1.9` | `^3.x` / `^4.x` / `^5.x` | ðŸ”´ Alta | Alto (comportamiento de mocks) |
| **jsdom** | `^25.0.1` | `^26.x+` | ðŸŸ¡ Media | Medio (APIs de Storage/DOM) |
| **Firebase Web SDK** | `^12.2.1` | `^13.x` | ðŸŸ¡ Media | Medio (preservar imports /lite) |
| **firebase-admin** | `^12.7.0` | `^13.x` / `^14.x` | ðŸŸ¡ Media | Medio (Auth types en CF) |
| **firebase-functions** | `^6.6.0` | `^7.x` | ðŸŸ¡ Media | Medio (Cloud Functions v2) |
| **firebase-tools (CLI)** | `^13.0.0` | `^13.35.x` / `^14.x` | ðŸŸ¢ Baja | Bajo |
| **Tailwind CSS** | `^3.4.3` | `^4.x` | ðŸ”´ Alta | Alto (cambio de config JS a @theme) |
| **ESLint (RaÃ­z)** | No configurado | Flat Config v9 | ðŸŸ¡ Media | Bajo (mejora calidad de cÃ³digo) |

---

### Fases de EjecuciÃ³n

#### ðŸš€ FASE 1: Core Seguro (Riesgo Bajo)
* **Alcance**:
  - Actualizar `vue` a `^3.5.x` (motor de reactividad optimizado, utilidades nativas).
  - Actualizar `vue-router` a la Ãºltima `^4.x` estable (`^4.5.x`).
  - Actualizar `firebase-tools` a la Ãºltima versiÃ³n compatible.
  - Actualizar dependencias de soporte sin breaking changes (`@vueuse/components`).
* **ValidaciÃ³n**:
  - `npm run test:unit` (59/59 âœ…).
  - `npm run build` (compilaciÃ³n sin warnings ni regresiones).

#### ðŸ§ª FASE 2: Toolchain de Build y Testing (Riesgo Medio / Alto)
* **Alcance**:
  - Migrar `vite` de 5.x a 6.x y `@vitejs/plugin-vue` acorde.
  - Migrar `vitest` (y plugins de coverage/ui) de 2.x a versiÃ³n moderna (3+).
  - Actualizar `jsdom` si es requerido.
* **Riesgos y atenciÃ³n**:
  - Vitest 2 estÃ¡ en EOL. Versiones 3+ alteraron el orden de resoluciÃ³n de mocks (`vi.mock` y `vi.resetModules`).
  - Requiere auditar exhaustivamente los mocks de Firebase Auth y Firestore en `tests/unit/composables/useAuth.spec.js` y `router/auth-guard.spec.js`.

#### â˜ï¸ FASE 3: Backend & Firebase Services (Riesgo Medio)
* **Alcance**:
  - Evaluar Firebase Web SDK v13 en el frontend.
  - Actualizar `firebase-admin` y `firebase-functions` en `codebase-functions/`.
* **Riesgos y atenciÃ³n**:
  - Mantener la convenciÃ³n de `firebase/firestore/lite` en todos los composables.
  - Probar `registrarUsuario` en emuladores locales antes de desplegar.

#### ðŸŽ¨ FASE 4: UI & Estilos (Riesgo Alto - Postergada)
* **Alcance**:
  - MigraciÃ³n de TailwindCSS v3 a v4.
* **Riesgos y atenciÃ³n**:
  - Tailwind v4 elimina `tailwind.config.js` y migra toda la configuraciÃ³n a `@theme` en CSS.
  - SIGE implementa 5 temas por rol con selectores de body (`.theme-estudiante`, etc.) y variables CSS personalizadas.
  - Mantener en Tailwind v3 hasta que la funcionalidad y tableros restantes estÃ©n completados.
