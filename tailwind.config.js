/** @type {import('tailwindcss').Config} */

// Helper para usar variables CSS con opacidad
function withOpacity(variableName) {
  return ({ opacityValue }) => {
    if (opacityValue !== undefined) {
      return `rgba(var(${variableName}), ${opacityValue})`;
    }
    return `rgb(var(${variableName}))`;
  };
}

export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: withOpacity('--color-primary'),
        'primary-light': withOpacity('--color-primary-light'),
        'primary-dark': withOpacity('--color-primary-dark'),
      },
    },
  },
  plugins: [],
};