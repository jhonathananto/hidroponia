/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: "#0f5b5a", light: "#147a79", dark: "#0a3d3c" },
        accent: { DEFAULT: "#f59e0b", light: "#fbbf24" },
        mint: "#e8f5f2",
        surface: "#f8fafc",
      },
      fontFamily: { sans: ["Inter", "system-ui", "sans-serif"] },
    },
  },
  plugins: [],
};
