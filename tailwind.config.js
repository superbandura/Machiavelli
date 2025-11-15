/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Paleta Renacentista
        parchment: {
          50: '#fdfbf7',
          100: '#f8f3e8',
          200: '#f0e8d3',
          300: '#e6d9b8',
          400: '#d9c69d',
          500: '#c9b07a',
          600: '#b59a5f',
        },
        burgundy: {
          300: '#b8393d',
          400: '#9b2d30',
          500: '#7a2327',
          600: '#5c1a1d',
          700: '#3d1113',
        },
        renaissance: {
          gold: '#d4af37',
          'gold-light': '#f0d877',
          'gold-dark': '#b8941f',
          bronze: '#cd7f32',
          'bronze-light': '#e09856',
          terracotta: '#a0522d',
          'terracotta-light': '#cd7350',
          olive: '#556b2f',
          'olive-light': '#6b8e3d',
          ink: '#2c2416',
          'ink-light': '#3d3422',
        },
      },
      fontFamily: {
        display: ['Cinzel Decorative', 'Georgia', 'serif'],
        heading: ['Cinzel', 'Georgia', 'serif'],
        serif: ['EB Garamond', 'Georgia', 'serif'],
        body: ['EB Garamond', 'Georgia', 'serif'],
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'ornate': '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(212, 175, 55, 0.1)',
        'ornate-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(212, 175, 55, 0.15)',
        'glow-gold': '0 0 20px rgba(212, 175, 55, 0.3)',
        'glow-burgundy': '0 0 20px rgba(122, 35, 39, 0.4)',
      },
      borderWidth: {
        '3': '3px',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
    },
  },
  plugins: [],
}
