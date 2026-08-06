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
          primary: "#4F6F63",
          primaryDark: "#3F5A50",
          sage: "#7FA08E",
          softSage: "#E8F0EB",
          black: "#0B0B0C",

          sand: "#E8DCC8",
          warmSand: "#D8C6A6",
          ivory: "#FAF7F1",

          gold: "#B89B5E",
          softGold: "#EFE3C4",

          charcoal: "#1F2933",
          slate: "#667085",
          border: "#E5E7EB",

          white: "#FFFFFF",
          success: "#6BAA75",
          amber: "#D89A3D",
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