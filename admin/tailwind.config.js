/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'dc': {
          'bg': '#0f0f0f',
          'surface': '#1a1a1a',
          'card': '#212121',
          'border': '#2a2a2a',
          'hover': '#333333',
          'accent': '#6366f1',
          'accent2': '#818cf8',
          'green': '#10b981',
          'text': '#ececec',
          'muted': '#888888',
          'dim': '#555555',
        }
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
        'mono': ['JetBrains Mono', 'Fira Code', 'monospace'],
      }
    },
  },
  plugins: [],
}
