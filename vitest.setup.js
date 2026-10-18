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