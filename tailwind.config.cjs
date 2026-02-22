/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./assets/js/**/*.{js,ts}"],
  theme: {
    extend: {
      fontFamily: {
        heading: ["Fraunces", "serif"],
        body: ["Manrope", "sans-serif"],
      },
      colors: {
        mocha: {
          50: "#f8f3ed",
          100: "#efe3d3",
          200: "#dfc4a3",
          300: "#cba57b",
          600: "#7c492d",
          700: "#5c341f",
          900: "#28160e",
        },
        tangerine: {
          400: "#ff9a3d",
          500: "#f48120",
          600: "#dd6c10",
        },
      },
      boxShadow: {
        panel: "0 28px 80px rgba(40, 22, 14, 0.14)",
        card: "0 14px 34px rgba(40, 22, 14, 0.10)",
      },
      backgroundImage: {
        "surface-gradient":
          "radial-gradient(circle at 15% 5%, #f4f4f4 0, #d7d7d7 45%, #c8c8c8 100%)",
      },
    },
  },
  plugins: [],
};
