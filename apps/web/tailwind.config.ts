import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          0: '#0b0b0e',
          1: '#111118',
          2: '#161620',
          3: '#1d1d28',
        },
        nia: {
          50: '#eef9ff',
          100: '#d8efff',
          200: '#b9e4ff',
          300: '#88d4ff',
          400: '#4fbcff',
          500: '#1f9eff',
          600: '#0a7eea',
          700: '#0a64bd',
          800: '#0e5497',
          900: '#114577',
        },
        hub: {
          400: '#a855f7',
          500: '#9333ea',
          600: '#7e22ce',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular'],
      },
    },
  },
  plugins: [],
};

export default config;
