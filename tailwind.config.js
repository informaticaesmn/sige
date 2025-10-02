// tailwind.config.js

/** @type {import('tailwindcss').Config} */
const { fontFamily } = require('tailwindcss/defaultTheme')

// Función de ayuda para generar la sintaxis de variable CSS 
// para que funcionen los modificadores de opacidad de Tailwind (ej. bg-primary/50)
const withOpacity = (variableName) => {
  return ({ opacityValue }) => {
    if (opacityValue !== undefined) {
      return `rgba(var(${variableName}), ${opacityValue})`
    }
    return `rgb(var(${variableName}))`
  }
}

module.exports = {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Open Sans', ...fontFamily.sans],
      },
      colors: {
        // Colores funcionales para los temas
        primary: {
          DEFAULT: withOpacity('--color-primary'),
          light: withOpacity('--color-primary-light'),
          dark: withOpacity('--color-primary-dark'),
        },
        // stone para elementos neutrales
        stone: require('tailwindcss/colors').stone,
      }
    },
  },
  plugins: [],
}