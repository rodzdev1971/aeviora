/** @type {import('tailwindcss').Config} */
export default {
    content: [
      "./index.html",
      "./src/**/*.{js,jsx}",
    ],
    theme: {
      extend: {
        colors: {
          aeviora: {
            black: "#0B0B0C",
            charcoal: "#5c5c69",
            gold: "#C9A24D",
            lightGold: "#E7D7A1",
            cream: "#F8F5EF",
            sage: "#9AAE9B",
          },
        },
        fontFamily: {
          display: ["Georgia", "serif"],
          body: ["Inter", "system-ui", "sans-serif"],
        },
      },
    },
    plugins: [],
  };