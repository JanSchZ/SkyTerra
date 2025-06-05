/** @type {import('tailwindcss').Config} */
import plugin from 'tailwindcss/plugin'

export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      keyframes: {
        fadeBlurIn: {
          '0%': { opacity: '0', filter: 'blur(8px)' },
          '100%': { opacity: '1', filter: 'blur(0)' }
        }
      },
      animation: {
        fadeBlurIn: 'fadeBlurIn 0.4s ease both'
      },
      boxShadow: {
        glass: '0 8px 32px rgba(0,0,0,.25)'
      },
      borderRadius: {
        glass: '20px'
      }
    }
  },
  plugins: [
    plugin(function({ addUtilities }) {
      addUtilities({
        '.glass': {
          'backdrop-filter': 'blur(24px) saturate(160%)',
          '-webkit-backdrop-filter': 'blur(24px) saturate(160%)',
          'background-color': 'var(--st-glass-bg)'
        }
      })
    })
  ],
}

