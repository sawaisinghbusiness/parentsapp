import type { Config } from "tailwindcss";

/**
 * Same colours as the ERP (SMS BARMER/tailwind.config.ts), so the school sees one product.
 * Colour carries meaning only: jade = present / paid, red = absent / due, marigold = needs attention.
 */
// Neutral grey with no blue/lavender cast: the screen reads clean, not "tech".
const ink = {
  50: "#F9FAFB",
  100: "#F3F4F6",
  200: "#E5E7EB",
  300: "#D1D5DB",
  400: "#9CA3AF",
  500: "#6B7280",
  600: "#4B5563",
  700: "#374151",
  800: "#1F2937",
  900: "#111827",
  950: "#0B0F17",
};

// Present / paid.
const jade = {
  50: "#F0FDF4",
  100: "#DCFCE7",
  200: "#BBF7D0",
  500: "#22A55A",
  600: "#16A34A",
  700: "#15803D",
  800: "#166534",
};

// Leave / half day / needs attention.
const marigold = {
  50: "#FFFBEB",
  100: "#FEF3C7",
  300: "#FCD34D",
  400: "#F5B21A",
  500: "#F59E0B",
  600: "#D97706",
  700: "#B45309",
};

// School blue: actions and links only. Deep and plain, like a bank's, not a startup violet.
const indigo = {
  50: "#EEF3FC",
  100: "#DCE6F8",
  200: "#B9CDF1",
  500: "#3A66CF",
  600: "#1E4BB8",
  700: "#183D96",
  800: "#13317A",
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
  50: "#FEF2F2",
  100: "#FEE2E2",
  500: "#EF4444",
  600: "#DC2626",
  700: "#B91C1C",
};

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: { slate: ink, ink, jade, emerald: jade, marigold, brand: indigo, night, rose, red: rose, canvas: "#F3F4F6" },
      fontFamily: {
        // Hind: one family drawn for Hindi and English together (Indian Type Foundry, made for UI).
        sans: ["Hind", "'Noto Sans Devanagari'", "system-ui", "sans-serif"],
      },
      fontSize: {
        // Parents read on small phones, often outdoors: the floor is 14px, body is 17px.
        xs: ["0.875rem", { lineHeight: "1.25rem" }],
        sm: ["0.9375rem", { lineHeight: "1.375rem" }],
        base: ["1.0625rem", { lineHeight: "1.625rem" }],
      },
      // Phone-app shapes: cards 12px, buttons and fields 10px (rounder reads bubbly).
      borderRadius: { xl: "0.625rem", "2xl": "0.75rem" },
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
