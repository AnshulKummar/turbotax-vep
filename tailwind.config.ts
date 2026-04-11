import type { Config } from "tailwindcss";

/**
 * Tailwind 4 prefers CSS-based configuration (see app/globals.css @theme),
 * but we still declare the content glob here so the Next.js plugin picks
 * up every file it needs to scan for class names.
 */
const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
