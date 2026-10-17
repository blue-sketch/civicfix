/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#171B35',
          800: '#202642',
          700: '#2B3356',
        },
        primary: {
          DEFAULT: '#3158D8',
          hover: '#2544B5',
          light: '#EEF2FF',
        },
        teal: {
          accent: '#0F9D8A',
          light: '#E6F6F4',
        },
        surface: {
          bg: '#F4F6FA',
          card: '#FFFFFF',
          border: '#E2E6EE',
          muted: '#F8FAFC',
        },
        text: {
          main: '#202536',
          muted: '#778095',
          light: '#94A3B8',
        },
        status: {
          critical: '#DC2626',
          high: '#EA580C',
          medium: '#D97706',
          low: '#0F9D8A',
          resolved: '#16A34A',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'panel': '12px',
        'card': '10px',
      }
    },
  },
  plugins: [],
}
