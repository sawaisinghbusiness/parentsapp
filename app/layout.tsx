import type { Metadata, Viewport } from "next";
import "@fontsource/hind/400.css";
import "@fontsource/hind/500.css";
import "@fontsource/hind/600.css";
import "@fontsource/hind/700.css";
import "./globals.css";
import { LangProvider } from "@/lib/i18n";

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
  viewportFit: "cover",
  themeColor: "#EFF0F4",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hi">
      <body>
        <LangProvider>{children}</LangProvider>
      </body>
    </html>
  );
}
