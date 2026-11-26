/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        telecom: {
          primary: 'var(--color-primary)',
          secondary: 'var(--color-secondary)',
          accent: 'var(--color-accent)',
          muted: 'var(--color-muted)',
          cardBg: 'var(--color-card-bg)',
          bg: 'var(--color-bg)',
          text: 'var(--color-text)',
          success: 'var(--color-success)',
          warning: 'var(--color-warning)',
          error: 'var(--color-error)',
          info: 'var(--color-info)'
        },
        primary: {
          50: 'rgb(var(--color-primary-50-rgb) / <alpha-value>)',
          100: 'rgb(var(--color-primary-100-rgb) / <alpha-value>)',
          200: 'rgb(var(--color-primary-200-rgb) / <alpha-value>)',
          300: 'rgb(var(--color-primary-300-rgb) / <alpha-value>)',
          400: 'rgb(var(--color-primary-400-rgb) / <alpha-value>)',
          500: 'rgb(var(--color-primary-500-rgb) / <alpha-value>)',
          600: 'rgb(var(--color-primary-600-rgb) / <alpha-value>)',
          700: 'rgb(var(--color-primary-700-rgb) / <alpha-value>)',
          800: 'rgb(var(--color-primary-800-rgb) / <alpha-value>)',
          900: 'rgb(var(--color-primary-900-rgb) / <alpha-value>)',
          950: 'rgb(var(--color-primary-950-rgb) / <alpha-value>)',
        },
        teal: {
          50: 'rgb(var(--color-primary-50-rgb) / <alpha-value>)',
          100: 'rgb(var(--color-primary-100-rgb) / <alpha-value>)',
          200: 'rgb(var(--color-primary-200-rgb) / <alpha-value>)',
          300: 'rgb(var(--color-primary-300-rgb) / <alpha-value>)',
          400: 'rgb(var(--color-primary-400-rgb) / <alpha-value>)',
          500: 'rgb(var(--color-primary-500-rgb) / <alpha-value>)',
          600: 'rgb(var(--color-primary-600-rgb) / <alpha-value>)',
          700: 'rgb(var(--color-primary-700-rgb) / <alpha-value>)',
          800: 'rgb(var(--color-primary-800-rgb) / <alpha-value>)',
          900: 'rgb(var(--color-primary-900-rgb) / <alpha-value>)',
          950: 'rgb(var(--color-primary-950-rgb) / <alpha-value>)',
        },
        emerald: {
          50: 'rgb(var(--color-accent-50-rgb) / <alpha-value>)',
          100: 'rgb(var(--color-accent-100-rgb) / <alpha-value>)',
          200: 'rgb(var(--color-accent-200-rgb) / <alpha-value>)',
          300: 'rgb(var(--color-accent-300-rgb) / <alpha-value>)',
          400: 'rgb(var(--color-accent-400-rgb) / <alpha-value>)',
          500: 'rgb(var(--color-accent-500-rgb) / <alpha-value>)',
          600: 'rgb(var(--color-accent-600-rgb) / <alpha-value>)',
          700: 'rgb(var(--color-accent-700-rgb) / <alpha-value>)',
          800: 'rgb(var(--color-accent-800-rgb) / <alpha-value>)',
          900: 'rgb(var(--color-accent-900-rgb) / <alpha-value>)',
          950: 'rgb(var(--color-accent-950-rgb) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        display: ['var(--font-display)'],
        mono: ['var(--font-mono)'],
        labels: ['var(--font-labels)']
      }
    },
  },
  plugins: [],
}
