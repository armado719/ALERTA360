/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        danger: '#C7352F',
        warning: '#B7791F',
        success: '#138A45',
        accent: '#AA3BFF',
      },
    },
  },
  plugins: [],
}
