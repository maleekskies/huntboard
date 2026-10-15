import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0A0E17',
        surface: '#131826',
        surfaceHover: '#182032',
        border: '#1E2536',
        text: '#ECEFF5',
        muted: '#7C88A0',
        accent: '#34E4C8',
        accentDim: '#22A88F',
        danger: '#E2574C',
        good: '#4CAF7D',
      },
      fontFamily: {
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
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
