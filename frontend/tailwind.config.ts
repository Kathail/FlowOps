import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        // Operations console. `sans` overrides Tailwind's default so
        // existing classes (`text-sm`, etc.) inherit Plex without each
        // call site needing `font-sans`. The system stack is the fallback
        // while Plex is downloading on the first visit.
        sans: [
          "'IBM Plex Sans'",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        mono: [
          "'IBM Plex Mono'",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
        // Reserved for hero numerals — used sparingly, one per page.
        display: ["'Instrument Serif'", "ui-serif", "Georgia", "serif"],
      },
      colors: {
        // Single signal — saturated cyan, used only on live affordances
        // and the gauge "open" arc. Adding it as a named token keeps
        // call sites consistent ("signal" rather than five different
        // cyan-300/cyan-400/teal-400 variants).
        signal: {
          DEFAULT: "#67e8f9", // cyan-300
          dim: "#155e75", // cyan-800
        },
      },
      animation: {
        "pulse-soft": "pulse-soft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "ping-slow": "ping-slow 2.5s cubic-bezier(0, 0, 0.2, 1) infinite",
        // Gauge arc draw-in. Used once on dashboard mount.
        "arc-draw": "arc-draw 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards",
      },
      keyframes: {
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        "ping-slow": {
          "75%, 100%": { transform: "scale(2.5)", opacity: "0" },
        },
        "arc-draw": {
          from: { strokeDashoffset: "var(--arc-circumference)" },
          to: { strokeDashoffset: "var(--arc-target)" },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
