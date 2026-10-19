# data/

Archivos de datos que consumen los scripts de importación.

⚠️ **No se versionan** (`.gitignore` → `data/*.csv`) porque contienen datos personales
(DNI, emails, docentes, horarios). Si clonás el repo, tenés que pedirlos aparte.

| Archivo | Lo consume | Formato documentado en |
| --- | --- | --- |
| `data/usuarios.csv` | `scripts/import-usuarios.js` | [docs/importar-usuarios.md](../docs/importar-usuarios.md) |

Los nombres de archivo están fijados en el código (`readFileSync`), así que si renombrás `usuarios.csv`
hay que actualizar el script correspondiente.

La **oferta académica** ya no se carga con un script: se sube el CSV **desde la app**
(rol `coordinacion`, `CargaMasiva.vue`). Su formato está en [docs/importar-oferta.md](../docs/importar-oferta.md),
pero el archivo no vive en `data/`.
