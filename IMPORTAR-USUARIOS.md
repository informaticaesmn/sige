# Importar Usuarios## Planes

Para los estudiantes, se puede especificar el código del plan:
- `662` para Profesorado de Música
- `666` para Profesorado en Composición
- `708` para Tecnicatura en Sonido
- `662G` para variantes especiales

El script formateará automáticamente estos códigos a nombres completos:
- `662` → `662-Profesorado de Música`
- `708` → `708-Tecnicatura en Sonido`
- etc.

## Descripción

Este documento explica cómo importar usuarios al sistema SIGE desde un archivo CSV. El proceso crea documentos en la colección `usuarios` de Firestore con los datos básicos de los estudiantes, docentes y bedeles.

## Preparación

1. Asegúrate de tener un archivo `.env` con las variables de entorno del nuevo proyecto Firebase (`sige-esmn`)
2. Crea un archivo CSV con los datos de los usuarios siguiendo el formato especificado
3. Asegúrate de tener instaladas las dependencias necesarias:
   ```bash
   npm install
   ```

## Formato del archivo CSV

El archivo CSV debe tener las siguientes columnas:

| Columna   | Descripción                           | Requerido |
|-----------|---------------------------------------|-----------|
| dni       | Documento de identidad                | Sí        |
| nombre    | Nombre/s del usuario                  | Sí        |
| apellido  | Apellido/s del usuario                | Sí        |
| email     | Correo electrónico institucional      | Sí        |
| roles     | Roles del usuario (formato JSON)      | Sí        |
| plan      | Código del plan de estudio (solo para estudiantes)| Condicional |

### Ejemplo de contenido:

```csv
dni,nombre,apellido,email,roles,plan
37348389,Maria José,ORTEGA,majo_959@hotmail.com,"[""estudiante""]",708
30941843,Victoria,MACLEAN,prof.vmaclean@gmail.com,"[""estudiante"",""docente""]",662
12345678,Bedel,DE PRUEBA,bedel@esmn.com.ar,"[""bedel""]",
```

## Roles disponibles

Los roles deben ser uno o más de los siguientes:
- `estudiante`
- `docente`
- `bedel`
- `admin`

## Reglas de validación

El script aplica las siguientes reglas de validación:

1. **Todos los usuarios deben tener**: DNI, nombre, apellido y email
2. **Los emails deben tener formato válido**
3. **Solo los usuarios con rol "estudiante" deben tener un plan asignado**
4. **Los usuarios sin rol "estudiante" no deberían tener plan (se mostrará advertencia)**
5. **Los roles deben ser válidos** (estudiante, docente, bedel, admin)
6. **Los roles se normalizan automáticamente a minúsculas**
7. **Los códigos de plan se convierten automáticamente a nombres completos según la lista predefinida**

## Ejecución

1. Crea tu archivo CSV con los datos de los usuarios (puedes usar `usuarios.csv` como plantilla)
2. Ejecuta el script de importación:
   ```bash
   node scripts/import-usuarios.js
   ```

## Proceso de registro

Una vez importados los usuarios:
1. Los usuarios tendrán el estado `pendiente_registro`
2. Podrán registrarse en la aplicación usando el email proporcionado
3. Durante el registro, se les pedirá crear una contraseña
4. El sistema migrará su documento de `usuarios/{email}` a `usuarios/{uid}` automáticamente

## Consideraciones

- Los emails deben ser únicos por usuario
- Los roles se normalizan a minúsculas automáticamente
- Todos los datos se almacenan en minúsculas para mantener consistencia
- La fecha de importación se registra automáticamente
- Si hay errores en la validación, el script se detendrá y mostrará los detalles
- El campo campus ha sido eliminado del formato de importación
- Los códigos de plan se convierten automáticamente a nombres completos según la lista predefinida