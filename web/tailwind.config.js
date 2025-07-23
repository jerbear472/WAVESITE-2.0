/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        wave: {
          50: '#e6f2ff',
          100: '#b3d9ff',
          200: '#80c0ff',
          300: '#4da8ff',
          400: '#1a8fff',
          500: '#0080ff',
          600: '#0066cc',
          700: '#004d99',
          800: '#003366',
          900: '#001a33',
          950: '#000d1a',
        },
        dark: {
          50: '#1a1a1a',
          100: '#0f0f0f',
          200: '#0a0a0a',
          300: '#050505',
          400: '#030303',
          500: '#000000',
        }
      },
      backgroundImage: {
        'wave-gradient': 'linear-gradient(135deg, #0080ff 0%, #0066cc 50%, #004d99 100%)',
        'wave-gradient-subtle': 'linear-gradient(135deg, rgba(0,128,255,0.1) 0%, rgba(0,102,204,0.1) 50%, rgba(0,77,153,0.1) 100%)',
      },
      animation: {
        'wave': 'wave 8s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        wave: {
          '0%, 100%': { transform: 'translateY(0) scaleY(1)' },
          '50%': { transform: 'translateY(-20px) scaleY(0.9)' },
        }
      },
      borderRadius: {
        'wave': '30% 70% 70% 30% / 30% 30% 70% 70%',
      }
    },
  },
  plugins: [],
}