---
name: Tests Unitarios
description: Usar cuando haya que correr, arreglar o escribir tests unitarios en SIGE (Vitest, tests/unit, mocks de Firebase/composables, vi.mock, cobertura)
---

# Tests Unitarios (Vitest)

## Comandos

- Suite: `npm run test:unit` (solo `tests/unit`)
- Un archivo: `npx vitest run tests/unit/composables/useAuth.spec.js`
- Watch / UI / cobertura: `npm run test:unit:watch` / `npm run test:ui` / `npm run test:coverage`
- Integración (emuladores Firebase): `npm run test:integration`

## Trampas conocidas (no re-descubrir)

- **Alias inexistente**: la única alias en `vitest.config.js` es `@` → `src`. **No existe `@composables`**. Un `vi.mock('@composables/...')` no matchea, se carga el módulo real y el test revienta después con `mockResolvedValue is not a function`. Usar siempre `vi.mock('@/composables/usuarios/useUsuarios.js', ...)`.
- El specifier de `vi.mock` debe resolver al mismo archivo que el import del composable (el import relativo `../usuarios/useUsuarios` y `@/...` resuelven al mismo módulo y matchean).
- **Orden**: `vitest.setup.js` hace `vi.resetModules()` en `afterEach` y `useAuth` ejecuta `checkAuthState()` al importarse. Configurar todos los mocks (`onAuthStateChanged.mockImplementation`, `obtenerUsuario.mockResolvedValue`) **antes** del `await import('@/composables/auth/useAuth.js')`.
- `clearMocks: true` y `restoreMocks: true` en `vitest.config.js`: los spies se limpian solos antes de cada test; re-setear implementaciones dentro de cada `it`.
- `isolate: false`: todos los archivos corren en el mismo worker. Los singletons a nivel de módulo (`useAuth`, `useLayout`) solo se reinician por `vi.resetModules()`.
- Mocks compartidos en `tests/unit/mocks/firebaseMocks.js`: `createMockUser`, `createMockFirestoreUser`, `mockAuth`, `resetAllFirebaseMocks`, `mockUseAuth`, `mockUseLayout`. Reutilizar antes que crear mocks nuevos.
- `global.console` está mockeado en `vitest.setup.js`: `console.error` no ensucia la salida de tests.

## Convención de retorno

- Todo composable expone `{ exito, datos, error }` (AGENTS.md §5). `toEqual({ exito: true, datos: undefined, error: undefined })` pasa con `{ exito: true }` porque `toEqual` ignora propiedades `undefined`: no agregar campos de más.

## Criterio de terminación

- `npm run test:unit` sin fallos **ni "Unhandled Errors"** de Vitest. `update-dev.ps1` aborta el versionado si los tests o el build fallan.
