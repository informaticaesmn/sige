import vuePlugin from 'eslint-plugin-vue'
import globals from 'globals'

export default [
  // Ignorar dependencias y build
  { ignores: ['node_modules/**', 'dist/**'] },

  // Config base JavaScript (SIN TypeScript)
  {
    files: ['**/*.js', '**/*.vue'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    rules: {
      // Reglas JavaScript básicas como warn
      'no-console': 'warn',
      'prefer-const': 'warn',
      'no-unused-vars': 'warn',
      'vue/no-unused-vars': 'warn',
      'no-undef': 'warn',
      'preserve-caught-error': 'warn'
    }
  },

  // Configuración Vue 3 flat (solo archivos .vue, sin JS adicional)
  ...vuePlugin.configs['flat/recommended'].map(config => {
    // Sobrescribir la languageOptions para que sea JavaScript
    if (config.languageOptions) {
      config.languageOptions = {
        ...config.languageOptions,
        ecmaVersion: 2022,
        sourceType: 'module'
      }
    }
    return config
  }),

  // Overrides finales: este bloque va AL FINAL porque los configs de arriba
  // (flat/recommended) pisan las reglas definidas antes. Las vistas de auth
  // usan nombres de una sola palabra (Login, Register, Terminos), así que la
  // regla queda como warning y `npm run lint` no corta con exit 1.
  {
    files: ['**/*.vue'],
    rules: {
      'vue/multi-word-component-names': 'warn'
    }
  }
]