# data/

Archivos de datos que consumen los scripts de importación.

⚠️ **No se versionan** (`.gitignore` → `data/*.csv`) porque contienen datos personales
(DNI, emails, docentes, horarios). Si clonás el repo, tenés que pedirlos aparte.

| Archivo | Lo consume | Formato documentado en |
| --- | --- | --- |
| `data/usuarios.csv` | `scripts/import-usuarios.js` | [docs/importar-usuarios.md](../docs/importar-usuarios.md) |
| `data/oferta-terciario.csv` | `scripts/importar-oferta.js` | [docs/importar-oferta.md](../docs/importar-oferta.md) |

Los nombres de archivo están fijados en el código (`readFileSync` / `CSV_FILE_PATH`),
así que si los renombrás hay que actualizar el script correspondiente.
