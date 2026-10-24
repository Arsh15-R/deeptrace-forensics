import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "media", // Follow system setting
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"SF Pro Display"',
          '"SF Pro Text"',
          '"Segoe UI"',
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
        mono: [
          '"SF Mono"',
          "ui-monospace",
          "Menlo",
          "Monaco",
          '"Cascadia Mono"',
          "Consolas",
          "monospace",
        ],
      },
      borderRadius: {
        "panel": "1.75rem",    // 28px - hierarchy large
        "subpanel": "1.25rem", // 20px - hierarchy medium-large
        "input": "0.875rem",   // 14px - hierarchy medium
        "control": "0.625rem", // 10px - hierarchy small-medium
        "pill": "9999px",      // full round
      },
      backdropBlur: {
        "glass": "26px",
        "glass-heavy": "32px",
      },
      backdropSaturate: {
        "160": "1.6",
        "180": "1.8",
      },
      colors: {
        brand: {
          blue: "#0A84FF",
          dark: "#0F172A",
        },
        verdict: {
          authentic: {
            bg: "rgba(52, 199, 89, 0.12)",
            text: "#30D158",
            border: "rgba(52, 199, 89, 0.3)",
          },
          inconclusive: {
            bg: "rgba(255, 159, 10, 0.12)",
            text: "#FF9F0A",
            border: "rgba(255, 159, 10, 0.3)",
          },
          synthetic: {
            bg: "rgba(255, 69, 58, 0.14)",
            text: "#FF453A",
            border: "rgba(255, 69, 58, 0.35)",
          },
        },
      },
      letterSpacing: {
        tighter: "-0.035em",
        tight: "-0.02em",
      },
    },
  },
  plugins: [],
};

export default config;
