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
        bg: {
          primary: '#050505',
          secondary: '#0A0A0C',
          surface: '#111114',
          elevated: '#17171C',
        },
        border: {
          subtle: 'rgba(255, 255, 255, 0.08)',
          strong: 'rgba(255, 255, 255, 0.16)',
          glow: 'rgba(0, 214, 255, 0.4)',
        },
        security: {
          accent: '#00D6FF',
          glow: 'rgba(0, 214, 255, 0.25)',
        },
        accent: {
          primary: '#0050FF',
          gradientStart: '#0050FF',
          gradientEnd: '#00D6FF',
        },
        success: {
          subtle: '#0E2E1D',
          DEFAULT: '#10B981',
          text: '#34D399',
        },
        danger: {
          subtle: '#2E0F12',
          DEFAULT: '#EF4444',
          text: '#F87171',
        }
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      letterSpacing: {
        tightest: '-0.04em',
        tighter: '-0.02em',
        tight: '-0.01em',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.4s ease-out forwards',
        'slide-up': 'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        glowPulse: {
          '0%': { boxShadow: '0 0 20px rgba(0, 214, 255, 0.15)' },
          '100%': { boxShadow: '0 0 35px rgba(0, 214, 255, 0.35)' },
        },
      }
    },
  },
  plugins: [],
}
