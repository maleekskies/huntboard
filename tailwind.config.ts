import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0E0F11',
        surface: '#17181B',
        surfaceHover: '#1D1F23',
        border: '#26282C',
        text: '#EDEDEE',
        muted: '#9A9CA3',
        accent: '#D4A24C',
        accentDim: '#8A6B34',
        danger: '#C4563F',
        good: '#5FA66B',
      },
      fontFamily: {
        display: ['var(--font-serif)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '6px',
        lg: '10px',
      },
    },
  },
  plugins: [],
};

export default config;
