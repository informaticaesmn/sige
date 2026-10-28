import js from '@eslint/js'
import vuePlugin from 'eslint-plugin-vue'
import globals from 'globals'

export default [
  // Ignorar dependencias y build
  { ignores: ['node_modules/**', 'dist/**'] },

  // Config base recomendada para JavaScript
  js.configs.recommended,

  // Config recomendada para Vue 3 (flat config)
  ...vuePlugin.configs['flat/recommended'],

  // Reglas específicas del proyecto SIGE
  {
    files: ['**/*.{js,vue}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node
      },
      sourceType: 'module'
    },
    rules: {
      // No permitir import de firebase/firestore sin /lite (reduce tamaño del bundle)
      'no-restricted-imports': [
        'warn',
        {
          paths: [
            {
              name: 'firebase/firestore',
              message: 'Usa firebase/firestore/lite en lugar de firebase/firestore para reducir el tamaño del bundle de producción'
            }
          ]
        }
      ],
      // No usar console.log en producción (salvo console.error/warn intencionales)
      'no-console': 'warn',
      // Preferir const sobre let cuando no se reasigna
      'prefer-const': 'warn',
      // Sobreescribir reglas del config recomendado que vienen como error → warn (fase inicial)
      'no-unused-vars': 'warn',
      'vue/no-unused-vars': 'warn',
      // Variables globales inyectadas por Vite (__APP_VERSION__, __APP_BRANCH__, __APP_COMMIT__)
      'no-undef': 'warn',
      // Regla de errores con cause (fase inicial)
      'preserve-caught-error': 'warn',
      // Nombres de componentes de una sola palabra son intencionales en SIGE
      'vue/multi-word-component-names': 'warn'
    }
  }
]