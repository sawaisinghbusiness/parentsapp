import type { Config } from "tailwindcss";

/**
 * School navy blue (from the Home design the user picked on 2026-10-08) on white. Colour carries meaning only:
 * jade = present / paid, red = absent / unpaid, marigold = waiting / leave, blue = the app and holidays.
 */
// Grey with a slight blue bias, so it sits with the brand instead of reading as a default.
const ink = {
  50: "#F5F7FB",
  100: "#EAEEF5",
  200: "#DCE2EC",
  300: "#C5CDDA",
  400: "#8A93A6",
  500: "#5F687B",
  600: "#4B5468",
  700: "#384155",
  800: "#262E42",
  900: "#16213A",
  950: "#0F172A",
};

// Present / paid.
const jade = {
  50: "#EAF7EE",
  100: "#D3F0DC",
  200: "#A9E0BA",
  500: "#1DAF55",
  600: "#16A34A",
  700: "#128A3E",
  800: "#0F6E33",
};

// Waiting / leave / half day.
const marigold = {
  50: "#FEF6E7",
  100: "#FCEBC8",
  300: "#F2C46D",
  400: "#E9A23B",
  500: "#D97706",
  600: "#B86405",
  700: "#924F04",
};

// The app's own navy blue.
const brand = {
  50: "#EEF3FD",
  100: "#E1EAFB",
  200: "#C3D4F6",
  300: "#9AB6EE",
  400: "#5E88DD",
  500: "#2F63C8",
  600: "#1446A0",
  700: "#103A86",
  800: "#0F2F6E",
  900: "#0B2252",
};

const night = {
  300: "#A9A4BA",
  400: "#858099",
  500: "#625D77",
  600: "#45405A",
  700: "#2E2A3D",
  800: "#221F2E",
  850: "#1B1824",
  900: "#16131F",
  950: "#0E0C14",
};

// Absent / unpaid.
const rose = {
  50: "#FDECEC",
  100: "#FAD7D7",
  500: "#E23B3B",
  600: "#DC2626",
  700: "#B91C1C",
};

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: { slate: ink, ink, jade, emerald: jade, marigold, brand, night, rose, red: rose, canvas: "#FFFFFF" },
      fontFamily: {
        // Figtree for Latin and numbers; Hind fills in Devanagari.
        sans: ["Figtree", "Hind", "'Noto Sans Devanagari'", "system-ui", "sans-serif"],
      },
      fontSize: {
        // Parents read on small phones, often outdoors: the floor is 13px, body is 16px.
        xs: ["0.8125rem", { lineHeight: "1.2rem" }],
        sm: ["0.875rem", { lineHeight: "1.3rem" }],
        base: ["1rem", { lineHeight: "1.5rem" }],
      },
      // Kit corners: fields and buttons 12px, row cards 14px, banners 16px.
      borderRadius: { xl: "0.75rem", "2xl": "0.875rem", "3xl": "1rem" },
      boxShadow: {
        card: "0 1px 2px rgb(31 27 46 / 0.05), 0 10px 26px -16px rgb(31 27 46 / 0.18)",
        bar: "0 -1px 0 rgb(31 27 46 / 0.06)",
      },
      keyframes: {
        fadeIn: { from: { opacity: "0" }, to: { opacity: "1" } },
        rise: { from: { opacity: "0", transform: "translateY(6px)" }, to: { opacity: "1", transform: "none" } },
        shimmer: { "100%": { transform: "translateX(100%)" } },
        slideUp: { from: { transform: "translateY(100%)" }, to: { transform: "none" } },
        shake: { "0%,100%": { transform: "translateX(0)" }, "25%,75%": { transform: "translateX(-5px)" }, "50%": { transform: "translateX(5px)" } },
      },
      animation: {
        fadeIn: "fadeIn 0.15s ease-out both",
        rise: "rise 0.28s cubic-bezier(0.16, 1, 0.3, 1) both",
        shimmer: "shimmer 1.5s infinite",
        "slide-up": "slideUp 0.26s cubic-bezier(0.16, 1, 0.3, 1) both",
        shake: "shake 0.32s ease-in-out",
      },
    },
  },
  plugins: [],
};

export default config;
