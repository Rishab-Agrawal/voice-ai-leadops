import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        divyasree: {
          deep: "#0f1419",
          forest: "#1c2a24",
          gold: "#c9a96e",
          sand: "#f4ecdb",
        },
      },
      fontFamily: {
        serif: ['ui-serif', 'Georgia', 'Cambria', 'serif'],
      },
    },
  },
  plugins: [],
};
export default config;
