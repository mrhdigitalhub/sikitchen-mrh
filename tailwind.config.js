/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: "#0F2854", light: "#122D5E", 50: "#E8EDF5" },
        gold: { DEFAULT: "#D4AF37", light: "#FFC542", 50: "#FFF8E1" },
        orange: { DEFAULT: "#FF7A00", light: "#FF8C32", 50: "#FFF3E8" },
        green: { DEFAULT: "#0BBF6A", light: "#12C784", 50: "#E6F9F0" }
      },
      fontFamily: { sans: ["Inter", "sans-serif"] }
    }
  },
  plugins: []
}
