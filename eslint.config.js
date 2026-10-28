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
      'preserve-caught-error': 'warn',
      'vue/multi-word-component-names': 'warn'
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
  })
]