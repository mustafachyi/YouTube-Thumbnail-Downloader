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
          // Dark backgrounds
          'bg': '#1a1a1a',
          'sidebar': '#232324',
          'panel': '#1c1c1c',
          'active': '#323238',
          
          // Borders and accents
          'border': '#404046',
          'blue': '#0047B3',
          'blue-text': '#66B2FF',
          
          // Typography
          'text': '#ffffff',
          'text-muted': '#B0B0B0',
          'text-input': '#e0e0e0',
        }
      },
      transitionDuration: {
        '250': '250ms',
        '350': '350ms',
      },
      scale: {
        '98': '.98',
      },
    },
  },
  plugins: [],
  future: {
    hoverOnlyWhenSupported: true,
  },
}
