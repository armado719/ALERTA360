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
        // Core palette — midnight command center (mockup v2)
        surface: '#0d1621',
        surfaceElev: '#16212e',
        surfaceCard: '#1a2635',
        surfaceGlass: 'rgba(22, 33, 46, 0.72)',
        border: '#22303f',
        borderHover: '#33465c',

        // Severity-based accents (tomados del mockup)
        severity: {
          low: '#38bdf8',      // sky-400
          medium: '#fbbf24',   // amber-400
          high: '#fb923c',     // orange-400
          critical: '#f87171', // red-400
        },

        // Glow helpers
        glow: {
          cyan: '0 0 15px #06b6d4, 0 0 30px #06b6d4',
          amber: '0 0 15px #eab308, 0 0 30px #eab308',
          orange: '0 0 15px #f97316, 0 0 30px #f97316',
          red: '0 0 15px #ef4444, 0 0 30px #ef4444',
        },

        // Brand
        accent: '#22d3ee',
        ink: '#e8eef7',
        muted: '#7e8da1',

        // Legacy
        danger: '#C7352F',
        warning: '#B7791F',
        success: '#138A45',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'ui-monospace', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.75rem' }],
        '5.5xl': ['3.5rem', { lineHeight: '1' }],
      },
      backdropBlur: {
        xs: '2px',
      },
      borderRadius: {
        card: '16px',
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(0, 0, 0, 0.35), inset 0 1px 0 0 rgba(255, 255, 255, 0.05)',
        'glass-hover': '0 12px 40px 0 rgba(0, 0, 0, 0.45), inset 0 1px 0 0 rgba(255, 255, 255, 0.08)',
        'glow-cyan': '0 0 15px rgba(6, 182, 212, .55), 0 0 30px rgba(6, 182, 212, .35)',
        'glow-amber': '0 0 15px rgba(234, 179, 8, .55), 0 0 30px rgba(234, 179, 8, .35)',
        'glow-orange': '0 0 15px rgba(249, 115, 22, .55), 0 0 30px rgba(249, 115, 22, .35)',
        'glow-red': '0 0 15px rgba(239, 68, 68, .55), 0 0 30px rgba(239, 68, 68, .35)',
        lift: '0 10px 25px 0 rgba(0, 0, 0, 0.25)',
        'lift-hover': '0 20px 40px 0 rgba(0, 0, 0, 0.35)',
        panel: '0 1px 0 0 rgba(255,255,255,.03) inset, 0 18px 50px -12px rgba(0,0,0,.6)',
      },
      animation: {
        'pulse-cyan': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-amber': 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-orange': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-red': 'pulse 0.7s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-in-out forwards',
        'fade-in-up': 'fadeInUp 0.4s ease-out forwards',
        'slide-in-right': 'slideInRight 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'stagger-in': 'staggerIn 0.5s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(10px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        staggerIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(ellipse at top, #16212e 0%, #0b131d 70%)',
      },
    },
  },
  plugins: [],
}
