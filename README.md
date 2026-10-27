# SIGE — Sistema Interno de Gestión Educativa

<!--VERSION-->Versión actual: dev v0.8.4<!--/VERSION-->

**S.I.G.E.** es el _Sistema Interno de Gestión Educativa de la Escuela Superior de Música de Neuquén (ESMN)_.
Nace para tener los datos del estudiantado en un repositorio único y ordenado, y ser la fuente de datos de
procesos administrativos como inscripciones a cursados, mesas de examen y trazabilidad de la trayectoria académica.

- Producción (Firebase Hosting): <https://sige-esmn.web.app>
- Desarrollo (Vercel): <https://sige-esmn.vercel.app/>

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Vue 3 (`<script setup>`, Composition API) |
| Bundler | Vite 5 |
| Estilos | TailwindCSS + theming por rol con variables CSS |
| Ruteo | Vue Router 4, con guardia global `beforeEach` |
| Estado | Composables propios (`useXxx.js`, singletons a nivel de módulo) |
| Backend | Firebase: Auth, Firestore **Lite**, Cloud Functions v2 y Hosting |
| Iconos / utils | Heroicons 2, `@vueuse/components` |
| Testing | Vitest 2 + Vue Test Utils + Firebase Emulator Suite |
| CI/CD | GitHub Actions (build + tests) · deploy a Firebase Hosting desde `main` · Vercel desde `dev` |

Las versiones exactas están en `package.json`.

## Puesta en marcha

```bash
npm install
cp .env.example .env   # completar con las credenciales de Firebase
npm run dev
```

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo (Vite) |
| `npm run build` | Build de producción en `dist/` |
| `npm run preview` | Sirve localmente el build de producción |
| `npm run test:unit` | Suite unitaria (`tests/unit`); no necesita Firebase |
| `npm run test:integration` | Tests de integración sobre los emuladores de Firebase |
| `npm run test:ui` | Vitest en modo interfaz gráfica |
| `npm run test:coverage` | Tests + reporte de cobertura |

Versionado y publicación: `update-dev.ps1` (rama `dev`) y `update-main.ps1` (rama `main`) corren `test:unit` + `build` y
abortan si fallan; `update-dev` además hace el `npm version` del ciclo. Un push a `main` dispara el deploy a Firebase
Hosting **y de las reglas de `firestore.rules`** (paso `Deploy Firestore Rules`).

## Estado del proyecto

| Área | Estado |
|---|---|
| Auth (login, registro, reset de contraseña, selección de rol) | ✅ Completo |
| Layouts dinámicos + theming por rol | ✅ Implementado |
| Guardia de navegación con protección por `meta.role` | ✅ Implementado |
| Planes de estudio (JSON en `public/planes/`) + correlativas | ✅ Vistas funcionales |
| Oferta académica e inscripciones | 🚧 En desarrollo (carga de oferta in-app desde CSV, rol `coordinacion`) |
| Tableros por rol | 🚧 Estudiante parcial; Bedel/Docente/Admin son placeholders |
| Testing | ✅ 59 tests unitarios en 6 archivos |
| Historial académico (`trayectoriaAcademica`) | ❌ No implementado |

**Problemas abiertos**: el detalle y la prioridad están en [docs/contexto.md](docs/contexto.md#-problemas-identificados-pendientes).
Hoy **no hay bloqueantes del flujo principal**: el de `firestore.rules` (colección de inscripciones hardcodeada +
auto-confirmación por el OR de los `allow update`) se resolvió y deployó el 19/10/2026 con un wildcard de segmento
`{subcoleccion}` + `matches()`.

## Documentación

| Documento | Contenido |
|---|---|
| [AGENTS.md](AGENTS.md) | Reglas de estilo, convenciones y patrones obligatorios para toda tarea |
| [docs/contexto.md](docs/contexto.md) | Referencia técnica: modelo de datos, auth, layouts, cloud functions y problemas abiertos |
| [docs/notas.md](docs/notas.md) | Notas de diseño, ideas y roadmap |
| [docs/modelo-datos.md](docs/modelo-datos.md) | Diagrama de Firestore y propuesta de modelo de datos |
| [docs/importar-usuarios.md](docs/importar-usuarios.md) | Importación de usuarios desde CSV (`scripts/import-usuarios.js`) |
| [docs/importar-oferta.md](docs/importar-oferta.md) | Formato CSV de la oferta académica (carga in-app, rol `coordinacion`) |
| [docs/migracion-firebase.md](docs/migracion-firebase.md) | Historial de la migración de proyecto Firebase (noviembre 2025) |
| [docs/testing-setup.md](docs/testing-setup.md) | Referencia de instalación de Vitest + emuladores |

## Por qué estamos acá

Desarrollado por personal de la escuela para suplir la falta de herramientas de gestión que ofrece el Consejo
Provincial de Educación, institución que debería proveernos de las herramientas necesarias para una educación
de nivel acorde a los tiempos y a la tecnología disponibles.
