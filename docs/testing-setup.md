# Configuración de Testing en SIGE

Esta documentación describe la configuración inicial de testing para el proyecto SIGE, que utiliza Vitest, Vue Test Utils y Firebase Emulator Suite.

> **Estado (Oct 2026):** la configuración ya está implementada en el repo y la corre el CI. Lo que hay que saber:
> - **Unitarios**: `npm run test:unit` → `vitest run tests/unit` (config: `vitest.config.js`).
> - **Integración**: `npm run test:integration` → `firebase emulators:exec --only firestore,auth --project demo-sige "vitest run --config vitest.integration.config.js"`.
>   Necesita **Java 21** instalado (el emulador de Firestore es un jar y `firebase-tools` 15
>   ya no acepta versiones anteriores a 21). Sin Java falla con `Could not spawn 'java -version'`;
>   con una versión vieja falla con `firebase-tools no longer supports Java version before 21`.
>   En CI lo provee `actions/setup-java` (Temurin 21).
> - Este documento es la guía de **instalación desde cero** y tiene partes obsoletas: `initializeTestApp`
>   (§9) ya no existe en `@firebase/rules-unit-testing` v5 (su `RulesTestContext` solo tiene
>   `firestore/database/storage`, no `.auth()`) y las variables `VITE_*_EMULATOR*` (§6) no las lee la app.
> - Estado real y trampas de mocks: [contexto.md](contexto.md) y `.opencode/skills/testing/SKILL.md`.

## 1. Prerrequisitos

### Node.js
- **Versión requerida**: Node.js v24 (LTS) (acorde al proyecto y Cloud Functions)
- Verifica tu versión con:
  ```bash
  node --version
  ```

### Gestor de paquetes
- **npm** (incluido con Node.js) o **pnpm** (recomendado)
- Si usas pnpm:
  ```bash
  npm install -g pnpm
  ```

### Firebase CLI
- Necesario para emular Firestore y Auth:
  ```bash
  npm install -g firebase-tools
  ```

## 2. Instalación de Dependencias

Ejecuta los siguientes comandos para instalar las dependencias de testing:

```bash
# Vitest (framework de testing)
npm install -D vitest @vitest/ui @vitest/coverage-v8

# Vue Test Utils (testing de componentes Vue 3)
npm install -D @vue/test-utils@next

# Firebase Rules Unit Testing (testing de reglas de Firestore)
npm install -D @firebase/rules-unit-testing firebase-tools

# JSDOM (entorno de prueba para componentes del DOM)
npm install -D jsdom

# Mocking de variables de entorno
npm install -D dotenv
```

> **Nota**: Si usas pnpm, reemplaza `npm install -D` por `pnpm add -D`.

## 3. Configuración de Vitest

### Archivo `vitest.config.js`

```javascript
/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.js'],
    clearMocks: true,
    restoreMocks: true,
    isolate: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'src/main.js',
        'src/router/',
        'src/App.vue',
        'src/style.css',
        'tests/',
        '**/*.config.js',
      ],
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
```

### Archivo `vitest.setup.js`

```javascript
import { vi } from 'vitest'
import { config } from '@vue/test-utils'
import dotenv from 'dotenv'

// Cargar variables de entorno desde .env
dotenv.config()

// Configuración global de Vue Test Utils
config.global.mocks = {
  $env: process.env,
}

// Resetear módulos después de cada test
// CRÍTICO: Los composables useAuth y useLayout son singletons a nivel de módulo
afterEach(() => {
  vi.resetModules()
})

// Mock de console para evitar logs en tests
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}
```

> **Importante**: El uso de `vi.resetModules()` en `afterEach` es esencial porque los composables `useAuth.js` y `useLayout.js` son singletons a nivel de módulo. Esto asegura que el estado se reinicie entre tests.

## 4. Scripts en `package.json`

Añade los siguientes scripts a tu `package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test:unit": "vitest run",
    "test:integration": "vitest run tests/integration",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage"
  }
}
```

### Descripción de los scripts

| Script | Descripción |
|--------|-------------|
| `test:unit` | Ejecuta todos los tests unitarios en modo CI (salida única) |
| `test:integration` | Ejecuta solo los tests de integración |
| `test:ui` | Inicia la interfaz gráfica de Vitest para desarrollo interactivo |
| `test:coverage` | Ejecuta tests con reporte de cobertura de código |

## 5. Configuración de Firebase Emulator

### Actualización de `firebase.json`

El archivo `firebase.json` ya incluye la configuración básica de emuladores. Asegúrate de que tenga la siguiente estructura:

```json
{
  "functions": [
    {
      "source": "codebase-functions",
      "codebase": "codebase-functions",
      "ignore": [
        "node_modules",
        ".git",
        "firebase-debug.log",
        "firebase-debug.*.log",
        "*.local"
      ]
    }
  ],
  "firestore": {
    "database": "(default)",
    "location": "southamerica-east1",
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "hosting": {
    "public": "dist",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  },
  "emulators": {
    "auth": {
      "port": 9099
    },
    "firestore": {
      "port": 8080
    },
    "functions": {
      "port": 5001
    },
    "hosting": {
      "port": 5000
    },
    "ui": {
      "enabled": true
    },
    "singleProjectMode": true
  }
}
```

### Iniciar el emulador

```bash
# Iniciar todos los emuladores
firebase emulators:start

# Iniciar solo Firestore y Auth (recomendado para testing)
firebase emulators:start --only firestore,auth

# Ver logs en tiempo real
firebase emulators:start --only firestore,auth --import ./emulator-data --export-on-exit
```

## 6. Archivo `.env.example`

Crea un archivo `.env.example` en la raíz del proyecto con las siguientes variables:

```bash
# Firebase Configuration (reemplazar con valores reales)
VITE_FIREBASE_API_KEY="tu-api-key-aqui"
VITE_FIREBASE_AUTH_DOMAIN="tu-proyecto.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="tu-proyecto"
VITE_FIREBASE_STORAGE_BUCKET="tu-proyecto.appspot.com"
VITE_FIREBASE_MESSAGING_SENDER_ID="123456789"
VITE_FIREBASE_APP_ID="1:123456789:web:abcdef123456"
VITE_FIREBASE_MEASUREMENT_ID="G-XXXXXXXXXX"

# Modo Emulator (para testing)
VITE_USE_EMULATOR=true

# Puerto del emulador Firestore
VITE_FIRESTORE_EMULATOR_HOST=localhost:8080

# Puerto del emulador Auth
VITE_AUTH_EMULATOR_HOST=localhost:9099

# Entorno
VITE_ENV=development
```

### Configuración de `src/config/firebase.js` para usar emuladores

Asegúrate de que tu configuración de Firebase detecte el emulador:

```javascript
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore/lite'
import { connectAuthEmulator } from 'firebase/auth'
import { connectFirestoreEmulator } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

// Conectar a emuladores si está habilitado
if (import.meta.env.VITE_USE_EMULATOR === 'true') {
  connectAuthEmulator(auth, 'http://localhost:9099')
  connectFirestoreEmulator(db, 'localhost', 8080)
}

export { auth, db }
export default app
```

## 7. Estructura de Directorios de Testing

Recomendada estructura para tests:

```
tests/
├── unit/
│   ├── composables/
│   │   ├── useAuth.test.js
│   │   └── useLayout.test.js
│   ├── components/
│   │   ├── FormInput.test.js
│   │   └── AppLoading.test.js
│   └── utils/
│       └── testUtils.js
├── integration/
│   ├── auth-flow.test.js
│   └── inscripciones-flow.test.js
└── mocks/
    ├── firebase-mocks.js
    └── data-fixtures.js
```

## 8. Troubleshooting

### Liberar puertos del emulador en Windows

Los puertos 4000, 8080 y 9099 son comunes para los emuladores. Si aparecen errores de puerto ocupado:

```powershell
# Verificar qué proceso usa el puerto
netstat -ano | findstr :8080

# Matar el proceso (reemplazar PID con el número real)
taskkill /PID <PID> /F

# O matar todos los procesos de Firebase
taskkill /IM firebase.exe /F
taskkill /IM node.exe /F
```

### Liberar puertos del emulador en macOS/Linux

```bash
# Verificar qué proceso usa el puerto
lsof -i :8080

# Matar el proceso (reemplazar PID con el número real)
kill -9 <PID>

# O matar todos los procesos de Firebase
pkill -f firebase
```

### Problemas comunes

#### Error: "Cannot find module 'vitest'"
```bash
# Asegúrate de estar en la raíz del proyecto
npm install -D vitest @vitest/ui @vitest/coverage-v8
```

#### Error: "Port 8080 already in use"
```bash
# Detén todos los emuladores
firebase emulators:stop

# O cambia el puerto en firebase.json
# "firestore": { "port": 8081 }
```

#### Error: "Cannot read property 'connectAuthEmulator' of undefined"
Asegúrate de usar la versión correcta de Firebase:
```bash
npm install firebase@^12.0.0
```

#### Los tests no detectan los mocks de Firebase
Verifica que `vitest.setup.js` esté siendo cargado y que `vi.resetModules()` esté en `afterEach`.

### Ejecutar tests específicos

```bash
# Ejecutar un archivo específico
npm run test:unit -- tests/unit/composables/useAuth.test.js

# Ejecutar con filtro
npm run test:unit -- -t "should login user"

# Ejecutar en modo watch
npm run test:unit -- --watch
```

## 9. Buenas Prácticas

1. **Mockear Firebase**: Nunca uses la base de datos real en tests. Siempre usa el emulador o mocks.

2. **Testing de composables singleton**: 
   - Usa `vi.resetModules()` en `afterEach`
   - Re-importa el composable dentro de cada test si necesitas estado limpio

3. **Testing de componentes con Firebase**:
   - Mockea las funciones de Firebase con `vi.mock()`
   - Usa `flushPromises()` después de llamadas async

4. **Testing de reglas de Firestore**:
   - Usa `@firebase/rules-unit-testing` para tests de seguridad
   - Crea un nuevo proyecto de emulación por test

```javascript
import { initializeTestApp } from '@firebase/rules-unit-testing'

const app = initializeTestApp({
  projectId: 'sige-test',
  auth: { uid: 'test-user' }
})
```

## 10. Archivos a Crear

### 10.1 `vitest.config.js`

Crea este archivo en la raíz del proyecto:

```javascript
/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.js'],
    clearMocks: true,
    restoreMocks: true,
    isolate: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'src/main.js',
        'src/router/',
        'src/App.vue',
        'src/style.css',
        'tests/',
        '**/*.config.js',
      ],
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
```

### 10.2 `vitest.setup.js`

Crea este archivo en la raíz del proyecto:

```javascript
import { vi } from 'vitest'
import { config } from '@vue/test-utils'
import dotenv from 'dotenv'

// Cargar variables de entorno desde .env
dotenv.config()

// Configuración global de Vue Test Utils
config.global.mocks = {
  $env: process.env,
}

// Resetear módulos después de cada test
// CRÍTICO: Los composables useAuth y useLayout son singletons a nivel de módulo
afterEach(() => {
  vi.resetModules()
})

// Mock de console para evitar logs en tests
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}
```

### 10.3 `.env.example`

Crea este archivo en la raíz del proyecto:

```bash
# Firebase Configuration (reemplazar con valores reales)
VITE_FIREBASE_API_KEY="tu-api-key-aqui"
VITE_FIREBASE_AUTH_DOMAIN="tu-proyecto.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="tu-proyecto"
VITE_FIREBASE_STORAGE_BUCKET="tu-proyecto.appspot.com"
VITE_FIREBASE_MESSAGING_SENDER_ID="123456789"
VITE_FIREBASE_APP_ID="1:123456789:web:abcdef123456"
VITE_FIREBASE_MEASUREMENT_ID="G-XXXXXXXXXX"

# Modo Emulator (para testing)
VITE_USE_EMULATOR=true

# Puerto del emulador Firestore
VITE_FIRESTORE_EMULATOR_HOST=localhost:8080

# Puerto del emulador Auth
VITE_AUTH_EMULATOR_HOST=localhost:9099

# Entorno
VITE_ENV=development
```

### 10.4 Actualización de `package.json`

Añade los scripts de testing al objeto `scripts` existente:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test:unit": "vitest run",
    "test:integration": "vitest run tests/integration",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage"
  }
}
```

## 11. Recursos Adicionales

- [Documentación oficial de Vitest](https://vitest.dev/)
- [Vue Test Utils - Vue 3](https://vuejs.org/api/test-utils.html)
- [Firebase Emulator Suite](https://firebase.google.com/docs/emulator-suite)
- [Testing Firebase Security Rules](https://firebase.google.com/docs/rules/unit-testing)