import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0b0f17",
        card: "rgba(255,255,255,0.06)",
        border: "rgba(255,255,255,0.12)",
        accent: "#7c3aed"
      },
      boxShadow: {
        glow: "0 0 40px rgba(124,58,237,0.25)"
      },
      backdropBlur: {
        xs: "2px"
      }
    }
  },
  plugins: []
} satisfies Config;
