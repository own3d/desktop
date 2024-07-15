/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./fullscreen.html",
    "./index.html",
    "./src/**/*.{js,ts,vue}",
  ],
  theme: {
    extend: {
      colors: {
        'title-bar': '#14191D',
        'title-bar-hover': '#1C2329',
        'title-bar-close': '#ff3141',
      },
    },
  },
  plugins: [],
}

