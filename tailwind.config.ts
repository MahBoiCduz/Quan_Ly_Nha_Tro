import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Warm, soft palette (Anthropic brand-inspired)
        cream: "#faf9f5", // page background
        surface: "#ffffff", // cards
        ink: "#141413", // primary text
        muted: "#6b6a63", // secondary text
        line: "#e8e6dc", // borders
        brand: {
          DEFAULT: "#d97757", // primary accent (orange)
          dark: "#c5613f", // hover/active
          tint: "#fbeee8", // light fill (active nav, badges)
          ink: "#8a3f25", // text on tint
        },
        ok: {
          DEFAULT: "#788c5d", // success
          tint: "#eef3e6",
          ink: "#3a4a25",
        },
        warn: {
          DEFAULT: "#b07d2a",
          tint: "#faf0d9",
          ink: "#6b4a0c",
        },
        danger: {
          DEFAULT: "#b04a3a", // error/delete
          tint: "#fbeae7",
          ink: "#7a2c20",
        },
      },
      fontFamily: {
        sans: ["var(--font-be-vietnam)", "system-ui", "Segoe UI", "sans-serif"],
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.125rem",
      },
    },
  },
  plugins: [],
};
export default config;
