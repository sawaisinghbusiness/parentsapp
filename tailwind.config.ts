import type { Config } from "tailwindcss";

/**
 * Same colours as the ERP (SMS BARMER/tailwind.config.ts), so the school sees one product.
 * Colour carries meaning only: jade = present / paid, red = absent / due, marigold = needs attention.
 */
// Grey with a slight sky bias, so it sits with the brand instead of reading as a default.
const ink = {
  50: "#F7FAFC",
  100: "#EEF3F7",
  200: "#E3EAF1",
  300: "#CDD8E2",
  400: "#94A3B2",
  500: "#64748B",
  600: "#4A5868",
  700: "#334252",
  800: "#1C2A37",
  900: "#0F1B26",
  950: "#0A121A",
};

// Present / paid.
const jade = {
  50: "#EFFAF4",
  100: "#D9F2E4",
  200: "#B4E4C9",
  500: "#1FA866",
  600: "#15965B",
  700: "#117A4A",
  800: "#0E623C",
};

// Leave / half day / needs attention.
const marigold = {
  50: "#FFF8EB",
  100: "#FCEFD2",
  300: "#E3B65A",
  400: "#D99E1F",
  500: "#C98200",
  600: "#A86C00",
  700: "#875700",
};

// School sky blue: the app's identity (hero block, buttons, active tab), solid not pastel.
const sky = {
  50: "#F0F9FF",
  100: "#E0F2FE",
  200: "#BAE6FD",
  500: "#0EA5E9",
  600: "#0284C7",
  700: "#0369A1",
  800: "#075985",
};

const night = {
  300: "#A9ADBA",
  400: "#858A99",
  500: "#62677A",
  600: "#454957",
  700: "#2E313B",
  800: "#22242C",
  850: "#1B1D23",
  900: "#141519",
  950: "#0D0E11",
};

// Absent / due.
const rose = {
  50: "#FDF1F0",
  100: "#FADFDC",
  500: "#E04B40",
  600: "#D33A2F",
  700: "#B02E25",
};

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: { slate: ink, ink, jade, emerald: jade, marigold, brand: sky, night, rose, red: rose, canvas: "#F2F6FA" },
      fontFamily: {
        // Figtree for Latin and numbers (geometric, like Groww); Hind fills in Devanagari.
        sans: ["Figtree", "Hind", "'Noto Sans Devanagari'", "system-ui", "sans-serif"],
      },
      fontSize: {
        // Parents read on small phones, often outdoors: the floor is 14px, body is 17px.
        xs: ["0.875rem", { lineHeight: "1.25rem" }],
        sm: ["0.9375rem", { lineHeight: "1.375rem" }],
        base: ["1.0625rem", { lineHeight: "1.625rem" }],
      },
      // Soft but not bubbly: buttons and fields 10px, white groups 14px, the hero block 18px.
      borderRadius: { xl: "0.625rem", "2xl": "0.875rem", "3xl": "1.125rem" },
      boxShadow: {
        card: "0 1px 2px rgb(21 24 58 / 0.05), 0 10px 26px -16px rgb(21 24 58 / 0.18)",
        bar: "0 -1px 0 rgb(21 24 58 / 0.06), 0 -8px 24px -12px rgb(21 24 58 / 0.12)",
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
