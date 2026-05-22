/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "rgb(var(--hz-channel-surface) / <alpha-value>)",
        paper: "rgb(var(--hz-channel-on-surface) / <alpha-value>)",
        brass: "rgb(var(--hz-channel-tertiary) / <alpha-value>)",
        signal: "rgb(var(--hz-channel-secondary) / <alpha-value>)",
        rust: "rgb(var(--hz-channel-coral) / <alpha-value>)",
        coral: "rgb(var(--hz-channel-coral) / <alpha-value>)",
        night: "rgb(var(--hz-channel-surface-container) / <alpha-value>)",
        primary: "rgb(var(--hz-channel-primary) / <alpha-value>)",
        onPrimary: "rgb(var(--hz-channel-on-primary) / <alpha-value>)",
        primaryContainer: "rgb(var(--hz-channel-primary-container) / <alpha-value>)",
        onPrimaryContainer: "rgb(var(--hz-channel-on-primary-container) / <alpha-value>)",
        secondaryContainer: "rgb(var(--hz-channel-secondary-container) / <alpha-value>)",
        tertiaryContainer: "rgb(var(--hz-channel-tertiary-container) / <alpha-value>)",
        surface: "rgb(var(--hz-channel-surface) / <alpha-value>)",
        surfaceVariant: "rgb(var(--hz-channel-surface-variant) / <alpha-value>)",
        surfaceContainer: "rgb(var(--hz-channel-surface-container) / <alpha-value>)",
        outline: "rgb(var(--hz-channel-outline) / <alpha-value>)",
        outlineVariant: "rgb(var(--hz-channel-outline-variant) / <alpha-value>)",
      },
      boxShadow: {
        lift: "0 18px 52px rgba(37, 88, 216, 0.12)",
        rule: "inset 0 0 0 1px rgba(37,88,216,0.12)",
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
