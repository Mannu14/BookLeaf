/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#f7f5f0',
        ink: {
          DEFAULT: '#1c1a17',
          soft: '#4a463f',
          muted: '#78726a',
          faint: '#a8a196',
        },
        line: {
          DEFAULT: '#e6e1d8',
          strong: '#d4cdc1',
        },
        leaf: {
          50: '#eef5f0',
          100: '#d7e8dc',
          200: '#b0d1ba',
          300: '#7fb393',
          400: '#4f916c',
          500: '#2f7451',
          600: '#215c40',
          700: '#1b4a34',
          800: '#163b2a',
          900: '#0f2a1e',
        },
        clay: {
          50: '#fbf0ec',
          100: '#f6dcd2',
          500: '#c2543a',
          600: '#a8432c',
          700: '#8a3523',
        },
        ochre: {
          50: '#fbf5e8',
          100: '#f5e6c4',
          500: '#c08a1e',
          600: '#a07114',
          700: '#7d570f',
        },
      },
      fontFamily: {
        sans: ['Geist', 'system-ui', 'sans-serif'],
        serif: ['Fraunces', 'Georgia', 'serif'],
        mono: ['"Geist Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 0 rgba(28,26,23,0.04), 0 1px 2px rgba(28,26,23,0.06)',
        lift: '0 2px 4px rgba(28,26,23,0.04), 0 12px 24px -8px rgba(28,26,23,0.12)',
        pop: '0 24px 48px -12px rgba(28,26,23,0.28)',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: 0, transform: 'translateY(6px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } },
        'scale-in': {
          from: { opacity: 0, transform: 'translateY(8px) scale(0.98)' },
          to: { opacity: 1, transform: 'translateY(0) scale(1)' },
        },
        'slide-in': {
          from: { opacity: 0, transform: 'translateX(16px)' },
          to: { opacity: 1, transform: 'translateX(0)' },
        },
        shimmer: { from: { backgroundPosition: '200% 0' }, to: { backgroundPosition: '-200% 0' } },
        flash: { '0%': { backgroundColor: 'rgb(238 245 240)' }, '100%': { backgroundColor: 'transparent' } },
        ping: { '75%, 100%': { transform: 'scale(2.2)', opacity: 0 } },
      },
      animation: {
        'fade-up': 'fade-up 380ms cubic-bezier(0.2, 0.8, 0.2, 1) both',
        'fade-in': 'fade-in 200ms ease-out both',
        'scale-in': 'scale-in 240ms cubic-bezier(0.2, 0.8, 0.2, 1) both',
        'slide-in': 'slide-in 260ms cubic-bezier(0.2, 0.8, 0.2, 1) both',
        shimmer: 'shimmer 1.6s linear infinite',
        flash: 'flash 2.4s ease-out',
        'ping-slow': 'ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite',
      },
    },
  },
  plugins: [],
};
