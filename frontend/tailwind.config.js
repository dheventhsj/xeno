/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: "#7c3aed", light: "#a78bfa" },
        surface: "#0a0a12"
      },
      animation: {
        aurora: "aurora 20s ease-in-out infinite alternate",
        shimmer: "shimmer 5s linear infinite"
      },
      keyframes: {
        aurora: {
          "0%": { transform: "translate(-2%, -2%) rotate(0deg)" },
          "100%": { transform: "translate(2%, 2%) rotate(5deg)" }
        },
        shimmer: {
          "0%": { backgroundPosition: "0% center" },
          "100%": { backgroundPosition: "200% center" }
        }
      }
    }
  },
  plugins: []
};
