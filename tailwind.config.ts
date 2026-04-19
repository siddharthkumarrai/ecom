import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          yellow: "#F5C400",
          "yellow-dark": "#D4A800",
          orange: "#FF6B35",
          blue: "#0066CC",
          dark: "#1A1A1A",
        },
        lk: {
          primary: "var(--lk-primary)",
          secondary: "var(--lk-secondary)",
          accent: "var(--lk-accent)",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      animation: {
        ticker: "ticker 20s linear infinite",
        "fade-in": "fadeIn 0.3s ease-in-out",
      },
      keyframes: {
        ticker: { "0%": { transform: "translateX(100%)" }, "100%": { transform: "translateX(-100%)" } },
        fadeIn: { "0%": { opacity: "0", transform: "translateY(4px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;

