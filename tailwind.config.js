/** @type {import('tailwindcss').Config} */

// Helper para usar variables CSS con opacidad
function withOpacity(variableName) {
  return ({ opacityValue, opacityVariable }) => {
    // Reemplazamos las comas por espacios para que sea compatible con rgb(R G B / A)
    const colorValues = `var(${variableName})`.replace(/,/g, ' ');

    if (opacityValue !== undefined) { // para clases como bg-primary/50
      return `rgb(${colorValues} / ${opacityValue})`;
    }
    return `rgb(${colorValues})`;
  };
}

export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  // Añadimos la safelist para evitar que Tailwind purgue las clases de tema
  safelist: [
    'theme-estudiante',
    'theme-docente',
    'theme-bedel',
    'theme-admin',
  ],
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