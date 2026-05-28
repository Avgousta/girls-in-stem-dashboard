/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f5f0ff', 100: '#ede9fe', 200: '#ddd6fe',
          300: '#c4b5fd', 400: '#a78bfa', 500: '#8b5cf6',
          600: '#7c3aed', 700: '#6d28d9', 800: '#4F2D7F', 900: '#1A0A2E',
        },
        mint: { 400: '#2DD4A0', 500: '#10b981', 600: '#059669' },
      },
      fontFamily: { sans: ['var(--font-inter)', 'sans-serif'] },
    },
  },
  plugins: [],
};
