/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0A1551',
          dark: '#1E2B7A',
        },
        accent: {
          DEFAULT: '#FF6100',
          dark: '#E65700',
        },
      },
    },
  },
  plugins: [],
}
