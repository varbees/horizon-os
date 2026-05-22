/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0b0f12",
        paper: "#f5efe4",
        brass: "#c8842a",
        signal: "#1fbf8f",
        rust: "#b74b2d",
        night: "#12181d",
      },
      boxShadow: {
        lift: "0 24px 80px rgba(5, 8, 10, 0.22)",
        rule: "inset 0 0 0 1px rgba(255,255,255,0.08)",
      },
      fontFamily: {
        display: ["Fraunces", "Georgia", "serif"],
        body: ["Manrope", "ui-sans-serif", "system-ui"],
        mono: ["IBM Plex Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
    },
  },
  plugins: [],
};
