/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef7f2',
          100: '#d7ecdf',
          200: '#b1d9c1',
          300: '#83c09e',
          400: '#57a37c',
          500: '#38875f',
          600: '#296c4b',
          700: '#22563d',
          800: '#1d4632',
          900: '#193b2b',
          950: '#0c2117',
        },
        accent: {
          500: '#e08e26',
          600: '#c4741a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
