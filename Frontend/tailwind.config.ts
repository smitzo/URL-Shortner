import type { Config } from "tailwindcss";
import forms from "@tailwindcss/forms";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#111827",
          900: "#1f2937",
          700: "#374151"
        },
        signal: {
          500: "#0f766e",
          600: "#0d9488"
        }
      },
      boxShadow: {
        soft: "0 18px 45px -24px rgb(15 23 42 / 0.38)"
      },
      gridTemplateColumns: {
        "20": "repeat(20, minmax(0, 1fr))"
      }
    }
  },
  plugins: [forms]
};

export default config;
