/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        vscode: {
          'bg': '#1a1a1a',
          'sidebar': '#232324',
          'active': '#323238',
          'border': '#404046',
          'blue': '#0078d4',
          'text': '#d4d4d4',
          'panel': '#1c1c1c'
        }
      }
    },
  },
  plugins: [],
}
