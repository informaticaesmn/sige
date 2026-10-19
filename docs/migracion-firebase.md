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

- [`src/config/firebase.js`](../src/config/firebase.js) - Configuración del SDK de Firebase
- [`.env`](../.env) - Variables de entorno con las credenciales del nuevo proyecto (ver [`.env.example`](../.env.example))
- [`firebase.json`](../firebase.json) - Configuración de Firebase CLI
- [`.firebaserc`](../.firebaserc) - Configuración de proyectos Firebase (hoy: `sige-esmn`)

### 2. Funciones Cloud

- Se corrigió la región de las funciones de `southamerica-west1` a `southamerica-east1` para mantener consistencia
- Se desplegaron las funciones en el nuevo proyecto

### 3. Reglas de Firestore

- Se desplegaron las reglas de Firestore en el nuevo proyecto

### 4. GitHub Actions y Vercel

- Se requiere actualizar los secrets en GitHub para apuntar al nuevo proyecto
- Se requiere actualizar las variables de entorno en Vercel si se sigue utilizando

> ✅ **Resuelto (Oct 2026):** `.github/workflows/firebase-hosting-main.yml` ya deploya con
> el proyecto real (`sige-esmn`), igual que `.firebaserc`.
>
> ✅ **Resuelto (19/10/2026):** el secreto `FIREBASE_SERVICE_ACCOUNT_KEY` guardaba una clave del
> proyecto viejo (`firebase-adminsdk-9p782@prueba1-esmn`) — de ahí que los releases publicaran en
> `prueba1-esmn`. Se reemplazó por una clave nueva de `firebase-adminsdk-fbsvc@sige-esmn` con los
> roles `Firebase Hosting Admin` + `Firebase Rules Admin`, y el workflow ya publica hosting +
> `firestore.rules` en `sige-esmn` (run verde `39207423186`).

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

Para acceder al nuevo proyecto, se utilizan las variables de entorno típicas de Firebase:
- `VITE_FIREBASE_API_KEY` - API Key del proyecto (clave pública)
- `VITE_FIREBASE_AUTH_DOMAIN` - Dominio de autenticación
- `VITE_FIREBASE_PROJECT_ID` - ID del proyecto
- `VITE_FIREBASE_STORAGE_BUCKET` - Bucket de almacenamiento
- `VITE_FIREBASE_MESSAGING_SENDER_ID` - ID del remitente de mensajes
- `VITE_FIREBASE_APP_ID` - ID de la aplicación
- `VITE_FIREBASE_MEASUREMENT_ID` - ID de medición (opcional, para Analytics)

## Referencia

- Última versión con el proyecto anterior: `v1.0-firebase-viejo` (tag de Git)
- Primera versión con el nuevo proyecto: a partir de v0.7.5
- Repositorio original: [https://github.com/informaticaesmn/sige](https://github.com/informaticaesmn/sige)