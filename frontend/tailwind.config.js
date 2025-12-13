/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'neon-green': '#afffbf',
        'neon-red': '#ef4444',
        'neon-yellow': '#eab308',
      },
      fontFamily: {
        mono: ['"Courier Prime"', 'monospace'],
      }
    },
  },
  plugins: [],
}