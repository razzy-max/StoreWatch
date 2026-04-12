/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#0F172A',
        slatePanel: '#1E293B',
        amberAccent: '#F59E0B',
        success: '#10B981',
        danger: '#EF4444',
        warning: '#F59E0B'
      },
      boxShadow: {
        soft: '0 20px 40px rgba(2, 6, 23, 0.35)'
      },
      animation: {
        'slide-in-down': 'slideInDown 0.25s ease-out',
        'slide-in-up': 'slideInUp 0.25s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out'
      },
      keyframes: {
        slideInDown: {
          '0%': { transform: 'translateY(-16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        slideInUp: {
          '0%': { transform: 'translateY(16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        }
      }
    }
  },
  plugins: []
};
