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
        // Core palette — SerQ glassmorphism premium
        bg: '#04060b',
        surface: '#0f172a',
        surfaceElev: '#1e293b',
        surfaceGlass: 'rgba(9, 13, 21, 0.76)',
        txt: '#e9eef8',
        muted: '#8b97aa',
        muted2: '#667287',
        border: 'rgba(255, 255, 255, 0.085)',
        borderHover: 'rgba(255, 255, 255, 0.17)',

        // Premium accent palette (SerQ reference)
        orange: '#ff5b1f',
        orange2: '#ff8a3d',
        blue: '#2fa8ff',
        green: '#25d07d',
        red: '#ff4d4d',

        // Severity-based neon accents — updated to SerQ palette
        severity: {
          low: '#25d07d',      // green-400 (SerQ)
          medium: '#2fa8ff',   // blue-400 (SerQ)
          high: '#ff8a3d',     // orange-300 (SerQ)
          critical: '#ff4d4d', // red-400 (SerQ)
        },

        // Neon glows — updated to SerQ palette
        glow: {
          cyan: '0 0 15px #2fa8ff, 0 0 30px #2fa8ff',
          amber: '0 0 15px #ff8a3d, 0 0 30px #ff8a3d',
          orange: '0 0 15px #ff5b1f, 0 0 30px #ff5b1f',
          red: '0 0 15px #ff4d4d, 0 0 30px #ff4d4d',
          green: '0 0 15px #25d07d, 0 0 30px #25d07d',
          blue: '0 0 15px #2fa8ff, 0 0 30px #2fa8ff',
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
