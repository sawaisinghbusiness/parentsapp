import type { Metadata, Viewport } from "next";
import "@fontsource-variable/plus-jakarta-sans";
import "@fontsource-variable/noto-sans-devanagari";
import "./globals.css";
import { LangProvider } from "@/lib/i18n";
import { AppLock } from "@/components/AppLock";
import { APP_LOCK } from "@/lib/appLock";

export const metadata: Metadata = {
  title: "School Parent",
  description: "Attendance, fees, homework and notices for your child.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "School", statusBarStyle: "black-translucent" },
  icons: { icon: "/icon.svg", apple: "/icon-192.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Temporary lock (lib/appLock.ts): the page cannot be zoomed.
  ...(APP_LOCK ? { maximumScale: 1, userScalable: false } : {}),
  viewportFit: "cover",
  themeColor: "#FFFFFF",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {APP_LOCK && <AppLock />}
        <LangProvider>{children}</LangProvider>
      </body>
    </html>
  );
}
