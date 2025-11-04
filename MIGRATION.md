# Migración de Proyecto Firebase

## Resumen

Este documento registra la migración del proyecto Firebase de `prueba-1.esmn` a `sige-esmn` realizada en noviembre de 2025. Esta migración fue necesaria porque no se podía cambiar el nombre de un proyecto Firebase una vez creado, y era necesario tener un nombre de proyecto más apropiado para producción.

## Proyecto Anterior

- **Nombre del proyecto**: prueba-1.esmn
- **Propósito**: Proyecto de desarrollo y pruebas
- **Estado**: En desuso
- **Fecha de descontinuación**: Noviembre 2025

## Proyecto Nuevo

- **Nombre del proyecto**: sige-esmn
- **Propósito**: Proyecto de producción
- **Fecha de creación**: Noviembre 2025

## Cambios Realizados

### 1. Configuración de Firebase

Se actualizaron las configuraciones en los siguientes archivos:

- [src/config/firebase.js](file:///C:/Users/Usuario/Documents/ProyectosDev/sige/src/config/firebase.js) - Configuración del SDK de Firebase
- [.env](file:///C:/Users/Usuario/Documents/ProyectosDev/sige/.env) - Variables de entorno con las credenciales del nuevo proyecto
- [firebase.json](file:///C:/Users/Usuario/Documents/ProyectosDev/sige/firebase.json) - Configuración de Firebase CLI
- [.firebaserc](file:///C:/Users/Usuario/Documents/ProyectosDev/sige/.firebaserc) - Configuración de proyectos Firebase

### 2. Funciones Cloud

- Se corrigió la región de las funciones de `southamerica-west1` a `southamerica-east1` para mantener consistencia
- Se desplegaron las funciones en el nuevo proyecto

### 3. Reglas de Firestore

- Se desplegaron las reglas de Firestore en el nuevo proyecto

### 4. GitHub Actions y Vercel

- Se requiere actualizar los secrets en GitHub para apuntar al nuevo proyecto
- Se requiere actualizar las variables de entorno en Vercel si se sigue utilizando

## Instrucciones para Futuras Migraciones

1. Crear un nuevo proyecto Firebase con el nombre deseado
2. Actualizar las configuraciones en el código fuente
3. Migrar los datos de Firestore si es necesario
4. Volver a desplegar las funciones Cloud
5. Actualizar las reglas de Firestore
6. Actualizar los secrets en GitHub y variables de entorno en otros servicios
7. Probar completamente la aplicación con el nuevo proyecto
8. Actualizar la documentación

## Datos de Acceso al Nuevo Proyecto

```
apiKey: "AIzaSyCTbIaaKSq-jT4bdTRMaW783qi7cW0GS0g"
authDomain: "sige-esmn.firebaseapp.com"
projectId: "sige-esmn"
storageBucket: "sige-esmn.appspot.com"
messagingSenderId: "475513552201"
appId: "1:475513552201:web:340cedb7379f546aa4ae98"
measurementId: "G-VTNFE6QK0G"
```

## Referencia

- Última versión con el proyecto anterior: `v1.0-firebase-viejo` (tag de Git)
- Primera versión con el nuevo proyecto: a partir de v0.7.5

## Contacto

Para cualquier duda sobre esta migración, contactar al equipo de desarrollo.