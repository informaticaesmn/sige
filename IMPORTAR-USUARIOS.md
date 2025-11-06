# Importar Usuarios## Planes

Los estudiantes pueden tener uno o más planes. Se pueden especificar los códigos de plan de las siguientes maneras:

### Formato JSON (recomendado):
```csv
"[""662"",""PREGRADO""]"
```

### Formato separado por comas:
```csv
"662,PREGRADO"
```

### Planes disponibles

| Código | Nombre completo |
|--------|-----------------|
| 662 | 662 Profesorado de Música |
| 662A | 662A Profesorado de Música con orientación en Arpa |
| 662B | 662B Profesorado de Música con orientación en Canto |
| 662C | 662C Profesorado de Música con orientación en Clarinete |
| 662D | 662D Profesorado de Música con orientación en Composición |
| 662F | 662F Profesorado de Música con orientación en Dirección Coral |
| 662G | 662G Profesorado de Música con orientación en Guitarra |
| 662H | 662H Profesorado de Música con orientación en Fagot |
| 662J | 662J Profesorado de Música con orientación en Piano |
| 662K | 662K Profesorado de Música con orientación en Oboe |
| 662L | 662L Profesorado de Música con orientación en Instrumento de Cuerda |
| 662M | 662M Profesorado de Música con orientación en Instrumento de Percusión |
| 662N | 662N Profesorado de Música con orientación en Instrumento de Viento Metal |
| 662P | 662P Profesorado de Música con orientación en Instrumento de Viento Madera |
| 662Q | 662Q Profesorado de Música con orientación en Tuba |
| 662R | 662R Profesorado de Música con orientación en Trombón |
| 662S | 662S Profesorado de Música con orientación en Trompeta |
| 662T | 662T Profesorado de Música con orientación en Violín |
| 662U | 662U Profesorado de Música con orientación en Viola |
| 662V | 662V Profesorado de Música con orientación en Violoncello |
| 663 | 663 Profesorado de Música con orientación en Dirección Coral |
| 664 | 664 Profesorado de Música con orientación en Canto Lírico |
| 665 | 665 Profesorado de Música con orientación en Dirección Orquestal |
| 666 | 666 Profesorado de Música con orientación en Composición |
| 389 | 389 Cantante |
| 390 | 390 Compositor |
| 391 | 391 Director Coral |
| 392 | 392 Director Orquestal |
| 393 | 393 Instrumentista |
| 708 | 708 Técnico Superior en Sonido |
| PREGRADO | PREGRADO Programa Propedéutico

## Descripción

Este documento explica cómo importar usuarios al sistema SIGE desde un archivo CSV. El proceso crea documentos en la colección `usuarios` de Firestore con los datos básicos de los estudiantes, docentes y bedeles.

## Preparación

1. Asegúrate de tener un archivo `.env` con las variables de entorno del nuevo proyecto Firebase (`sige-esmn`)
2. Crea un archivo CSV con los datos de los usuarios siguiendo el formato especificado
3. Asegúrate de tener instaladas las dependencias necesarias:
   ```bash
   npm install
   ```

## Exportación desde Google Sheets

Para exportar correctamente los datos desde Google Sheets a CSV:

1. **Para campos array (roles, plan)**:
   - Usa comillas dobles para envolver todo el contenido del campo
   - Escapa las comillas dobles internas duplicándolas
   - Ejemplo: `"[\"estudiante\",\"docente\"]"`

2. **Formato recomendado**:
   - Usa el formato JSON para arrays: `"[\"valor1\",\"valor2\"]"`
   - Esto evita problemas de interpretación

3. **Alternativa más simple**:
   - Puedes usar valores separados por comas sin comillas: `valor1,valor2`
   - El script lo interpretará correctamente

## Formato del archivo CSV

El archivo CSV debe tener las siguientes columnas:

| Columna   | Descripción                           | Requerido |
|-----------|---------------------------------------|-----------|
| dni       | Documento de identidad                | Sí        |
| nombre    | Nombre/s del usuario                  | Sí        |
| apellido  | Apellido/s del usuario                | Sí        |
| email     | Correo electrónico institucional      | Sí        |
| roles     | Roles del usuario (formato JSON array)| Sí        |
| plan      | Código(s) del plan de estudio (solo para estudiantes)| Condicional |

### Ejemplo de contenido:

```csv
dni,nombre,apellido,email,roles,plan
37348389,Maria José,ORTEGA,majo_959@hotmail.com,"[""estudiante""]","[""708""]"
30941843,Victoria,MACLEAN,prof.vmaclean@gmail.com,"[""estudiante"",""docente""]","[""662"",""PREGRADO""]"
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
3. **Solo los usuarios con rol "estudiante" deben tener al menos un plan asignado**
4. **Los usuarios sin rol "estudiante" no deberían tener planes (se mostrará advertencia)**
5. **Los roles deben ser válidos** (estudiante, docente, bedel, admin)
6. **Los roles se normalizan automáticamente a minúsculas**
7. **Los códigos de plan se convierten automáticamente a nombres completos**
8. **Los estudiantes pueden tener múltiples planes**

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
- Los estudiantes pueden tener múltiples planes almacenados en un array
- Los códigos de plan se convierten automáticamente a nombres completos según la lista predefinida