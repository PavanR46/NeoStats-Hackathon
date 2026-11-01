/** @type {import('tailwindcss').Config} */
// Colours come from CSS variables (see globals.css) so one class works in both themes.
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './providers/**/*.{js,ts,jsx,tsx,mdx}',
    './context/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}', // lib/styles.ts holds badge classes, Tailwind must scan it
  ],
  theme: {
    extend: {
      colors: {
        // surfaces and text
        canvas: token('canvas'),
        surface: token('surface'),
        'surface-2': token('surface-2'),
        line: token('line'),
        'line-strong': token('line-strong'),
        fg: token('fg'),
        'fg-muted': token('fg-muted'),
        'fg-subtle': token('fg-subtle'),
        // accent and status tones
        accent: token('accent'),
        success: token('success'),
        warning: token('warning'),
        caution: token('caution'),
        danger: token('danger'),
        info: token('info'),
        plum: token('plum'),
        // kept so existing gradient buttons keep working
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          900: '#1e3a8a',
        },
        slate: {
          850: '#151e2e',
          950: '#0b0f19',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['var(--font-serif)', 'ui-serif', 'Georgia', 'serif'],
      },
      boxShadow: {
        glow: '0 10px 40px -12px rgb(var(--accent) / 0.5)',
      },
    },
  },
  plugins: [],
};