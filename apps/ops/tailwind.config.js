/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        orange: {
          500: '#FF732D',
          600: '#E5682A',
        },
      },
    },
  },
  plugins: [],
};
