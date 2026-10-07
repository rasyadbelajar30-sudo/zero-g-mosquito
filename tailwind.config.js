// File: tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        orbitron: ['"Orbitron"', 'sans-serif']
      },
      keyframes: {
        float: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
        glow: { '0%, 100%': { boxShadow: '0 0 15px rgba(45,212,191,0.2)' }, '50%': { boxShadow: '0 0 35px rgba(45,212,191,0.6)' } },
        pulseSlow: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.4' } },
        sweep: { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } }
      },
      animation: {
        float: 'float 5s ease-in-out infinite',
        glow: 'glow 3s ease-in-out infinite',
        'pulse-slow': 'pulseSlow 3s ease-in-out infinite',
        'radar-sweep': 'sweep 4s linear infinite'
      }
    },
  },
  plugins: [],
}
