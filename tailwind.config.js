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
        // Core palette — midnight command center
        surface: '#0f172a',
        surfaceElev: '#1e293b',
        surfaceGlass: 'rgba(30, 41, 59, 0.45)',
        border: '#334155',
        borderHover: '#475569',

        // Severity-based neon accents
        severity: {
          low: '#06b6d4',      // cyan-500
          medium: '#eab308',   // amber-500
          high: '#f97316',     // orange-500
          critical: '#ef4444', // red-500
        },

        // Neon glows
        glow: {
          cyan: '0 0 15px #06b6d4, 0 0 30px #06b6d4',
          amber: '0 0 15px #eab308, 0 0 30px #eab308',
          orange: '0 0 15px #f97316, 0 0 30px #f97316',
          red: '0 0 15px #ef4444, 0 0 30px #ef4444',
        },

        // Legacy
        danger: '#C7352F',
        warning: '#B7791F',
        success: '#138A45',
        accent: '#AA3BFF',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.75rem' }],
        '5.5xl': ['3.5rem', { lineHeight: '1' }],
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        // Premium card shadows
        glass: '0 8px 32px 0 rgba(0, 0, 0, 0.3), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)',
        'glass-hover': '0 12px 40px 0 rgba(0, 0, 0, 0.4), inset 0 1px 0 0 rgba(255, 255, 255, 0.15)',
        // Severity glow shadows
        'glow-cyan': '0 0 15px theme(colors.severity.low), 0 0 30px theme(colors.severity.low)',
        'glow-amber': '0 0 15px theme(colors.severity.medium), 0 0 30px theme(colors.severity.medium)',
        'glow-orange': '0 0 15px theme(colors.severity.high), 0 0 30px theme(colors.severity.high)',
        'glow-red': '0 0 15px theme(colors.severity.critical), 0 0 30px theme(colors.severity.critical)',
        // Card lift
        lift: '0 10px 25px 0 rgba(0, 0, 0, 0.2)',
        'lift-hover': '0 20px 40px 0 rgba(0, 0, 0, 0.3)',
      },
      animation: {
        // Pulse and glow animations for severity
        'pulse-cyan': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-amber': 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-orange': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-red': 'pulse 0.7s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        // Fade in
        'fade-in': 'fadeIn 0.3s ease-in-out forwards',
        'fade-in-up': 'fadeInUp 0.4s ease-out forwards',
        'slide-in-right': 'slideInRight 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        // Stagger
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
        // Subtle grid pattern for the command center feel
        'grid-sm': "url(\"_data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Cpath fill='%23334155' d='M2 2h2v2H2zm4 4h2v2H6zm4 4h2v2H10zm4 4h2v2H14zm4 4h2v2H18zm4 4h2v2H22zm4 4h2v2H26zm4 4h2v2H30zm0-4h2v2H30zM2 6h2v2H2zm4 4h2v2H6zm4 4h2v2H10zm4 4h2v2H14zm4 4h2v2H18zm4 4h2v2H22zm4 4h2v2H26zm4 4h2v2H30zm0-4h2v2H30z'/%3E%3C/svg%3E\")",
        'gradient-radial': 'radial-gradient(ellipse at top, #0f172a 0%, #020617 70%)',
      },
    },
  },
  plugins: [],
}
