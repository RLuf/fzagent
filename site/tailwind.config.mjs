/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,mdx,md,html,js,ts}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: '#0b0d10',
        surface: '#14171c',
        accent: '#7c3aed',
        muted: '#6b7280',
        text: '#e5e7eb',
        border: '#1f2937',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
