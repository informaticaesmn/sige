# CONTEXTO DEL PROYECTO

## 🎯 OBJETIVO PRINCIPAL
Generar una aplicación web de bajo costo y alta eficiencia que centralice y simplifique la Gestión Académica para la comunidad de la Escuela Superior de Música de Neuquén. La plataforma debe servir como una fuente única de verdad para los datos de estudiantes, oferta académica y trayectorias, accesible para los distintos roles dentro de la institución.

## 👥 STAKEHOLDERS (personas involucradas)
*   **Desarrollador Principal**: Genaro Villar (`InformaticaESMN`).
*   **Equipo de Pruebas (Testers)**:
    *   **Coordinadores Académicos**: Ramón Sarallegui, Facundo Gomez Saibene, Victoria Maclean.
    *   **Bedeles**: Adriana Falcón, Diego Price, Ana San Martin.
    *   **Estudiantes**: Majo Ortega (y otros a sumar).
*   **Usuarios Finales**:
    *   **Estudiantes**: (~800 activos) para consulta de datos, inscripciones, etc.
    *   **Bedeles**: Para la gestión diaria de la información estudiantil.
    *   **Administrativos/Secretaría**: Para gestión de equivalencias y títulos.
    *   **Coordinadores/Administradores**: Para la configuración de la oferta académica.
    *   **Docentes (a futuro)**: Para funciones como toma de asistencia o carga de notas.

## 🛠️ DECISIONES TÉCNICAS TOMADAS
### Stack elegido:
 
*   **Frontend**: Vue 3 (con Composition API y `<script setup>`), Vite, TailwindCSS.
*   **Backend & Base de Datos (BaaS)**: Firebase (Authentication y Firestore).
*   **Hosting**: Vercel para la rama `dev` (staging) y Firebase Hosting para `main` (producción).
*   **Control de Versiones**: Git, alojado en GitHub. manejado por dos script:
      - .update.dev.ps1 para la rama `dev`
      - .update.main.ps1 para la rama `main`
*   **Fuente de Datos Inicial**: Google Sheets, con exportación a JSON mediante Apps Script. o CSV con script de Node.js

### Arquitectura:
La aplicación sigue una arquitectura moderna basada en componentes y servicios desacoplados (BaaS - Backend as a Service).

1.  **Arquitectura Frontend (Vue 3)**:
    *   **Basada en Componentes**: La UI se construye con componentes reutilizables (`.vue`). Las vistas principales se encuentran en `src/views` y los componentes de UI reusables en `src/components`.
    *   **Lógica Desacoplada (Composables)**: Toda la lógica de negocio y la interacción con el backend se aísla en funciones "composables" (`src/composables`). Por ejemplo, `useAuth.js` maneja la autenticación y `useUsuarios.js` gestiona los datos de usuarios en Firestore.
    *   **Enrutamiento y Layouts**: Se utiliza `vue-router` para la navegación. La arquitectura de rutas define layouts dinámicos (`AdminLayout`, `EstudianteLayout`, etc.) que envuelven a las vistas hijas, permitiendo interfaces distintas con themes especificos (colores distintos) según el rol del usuario.
    *   **Gestión de Estado**: Se utiliza un enfoque de estado reactivo y descentralizado a través de los `composables`. Por ejemplo, `useAuth` expone un estado reactivo global para el usuario autenticado, evitando la necesidad de una librería de estado más compleja como Pinia por el momento.

2.  **Arquitectura Backend (Firebase)**:
    *   **Serverless**: No hay un servidor propio. La aplicación se comunica directamente desde el cliente a los servicios de Firebase.
    *   **Autenticación**: Firebase Authentication gestiona la identidad de los usuarios (login, registro, reseteo de contraseña).
    *   **Base de Datos (Firestore)**:
        *   **Modelo de Datos**: Es una base de datos NoSQL orientada a documentos. La colección principal es `usuarios`.
        *   **Identificadores**: Se sigue una estrategia de doble identificador:
            1.  **Pre-registro**: Los perfiles de los estudiantes se precargan en documentos cuyo ID es el `email` del estudiante.
            2.  **Registro Completo**: Cuando un usuario se registra, se crea un nuevo documento cuyo ID es el `uid` de Firebase Auth, se copian los datos del documento de pre-registro y este último se elimina. Esto se hace de forma atómica usando un `writeBatch` para garantizar la integridad.
        *   **Acceso a Datos**: Todas las lecturas y escrituras a Firestore están centralizadas en los `composables`, nunca directamente desde los componentes.
        mas detalle de la estructura de datos en [diagrama_v2.md](diagrama_v2.md)


## 🚀 ESTADO ACTUAL
### ✅ COMPLETADO:
*   Definición del stack tecnológico y la arquitectura base.
*   Estructura de layouts y theming con TailwindCSS para diferentes roles.
*   Mecanismo de importación de datos iniciales desde Google Sheets a Firestore.
*   Lógica de autenticación (Login/Logout) y estado de usuario reactivo.
*   Flujo de registro de usuarios con pre-aprobación y migración de datos.
*   Implementación de la vista "Seleccionar Rol" para usuarios con múltiples perfiles.

### 🚧 EN DESARROLLO:
*   Probar en un grupo mas amplio de la experiencia de usuario en los formularios de autenticación. Revisar la seguridad y todos los pasos que tienen que ver con el acceso y autenticación.
*   Construcción de los tableros principales para cada rol (Estudiante, Bedel, Admin).

### 📋 PENDIENTE:
*   **Funcionalidad Core**:
    *   Terminar de definir estructura de datos para los planes contemplando las correlativas.
    *   Módulo de inscripción a cursadas para estudiantes y confirmacion por partes del chequeo de correlativas de Bedelia.
    *   Visualización de trayectoria académica (materias aprobadas, estado).
    *   Carga de la trayectoria académica con todas los posibles procesos que llevan a la nota final: 
      - cursar y aprobar sin promocionar (nota menor a 7) -> presentarse a mesas con cararcter de "regular" por haber aprobado el cursado y desaprobar o aprobar.
      - cursar y promocionar (con eso ya tiene una nota final y materia aprobada)
      - presentarse a una mesa de examen en caracter de libre
      - obtener la materia aprobada por equivalencia: tener estudios previos en nuestra institucion, en otro plan o estudios previos en otras instituciones y presenta la documentacion.
*   **Administración**:
    *   Panel de administración para la gestión de usuarios y roles.
    *   Herramienta para configurar la oferta académica de cada ciclo lectivo.
*   **Mejoras y Refinamiento**:
    *   Implementación de un sistema de notificaciones en la UI.
    *   Optimización de consultas a Firestore y reglas de seguridad.

## 🧪 GUÍA DE TESTING
### Cómo probar la app:
1.  **Acceder al Entorno de Pruebas**: Navegar a la URL de Vercel (rama `dev`): https://sige-esmn-git-dev-informaticaesmns-projects.vercel.app
2.  **Casos de Prueba Sugeridos**:
    *   **Registro Exitoso**: Intentar registrarse con un email que SÍ esté en la lista de pre-aprobados. El sistema debería permitir el registro y redirigir al tablero correspondiente.
    *   **Registro Fallido (No Aprobado)**: Intentar registrarse con un email que NO esté en la lista. Se debe mostrar un mensaje de error claro indicando que debe contactar a Bedelía.
    *   **Login/Logout**: Iniciar sesión con una cuenta ya creada y luego cerrar sesión.
    *   **Protección de Rutas**: Intentar acceder a una ruta protegida (ej. `/estudiante`) sin haber iniciado sesión. El sistema debe redirigir a la página de login.
3.  **Reporte de Bugs**:
    *   Capturar la pantalla si es un error visual.
    *   Abrir la consola del navegador (F12), ir a la pestaña "Consola" y copiar cualquier mensaje de error en rojo.
    *   Enviar la información 
    
## ❓ DUDAS/PREGUNTAS ABIERTAS
*   **Escalabilidad de Firestore**: ¿Será necesario optimizar las consultas o cambiar el modelo de datos cuando se agreguen las inscripciones y las trayectorias académicas? ¿Cómo impactará en los costos?
*   **Gestión de Estado Compleja**: Si la aplicación crece, ¿será el enfoque actual con `composables` suficiente o se deberá migrar a una solución como Pinia para gestionar estados más complejos (ej. datos de inscripciones, oferta académica filtrada, etc.)?
*   **Seguridad**: ¿Las reglas de seguridad de Firestore actuales son suficientemente robustas? Necesitarán una revisión exhaustiva antes de pasar a producción.