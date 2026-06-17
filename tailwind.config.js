/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        cream: {
          bg: '#FAF4ED',
          surface: '#F5EDDF',
          border: '#E7D9C2',
          deep: '#EFE3D0',
        },
        coffee: {
          dark: '#3B2F22',
          mid: '#6B5B47',
          light: '#A89683',
        },
        gold: {
          DEFAULT: '#C8A35E',
          light: '#E0C892',
          deep: '#A8853F',
        },
        olive: '#7A8B4C',
        terracotta: '#B8755A',
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Cormorant', 'Georgia', 'serif'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 2px 12px rgba(59, 47, 34, 0.06)',
        card: '0 1px 3px rgba(59, 47, 34, 0.08), 0 1px 2px rgba(59, 47, 34, 0.04)',
        gold: '0 4px 14px rgba(200, 163, 94, 0.25)',
      },
      borderRadius: {
        xl2: '14px',
      },
    },
  },
  plugins: [],
}
