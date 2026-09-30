import type { Metadata } from "next";
import { Inter, Noto_Color_Emoji, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const grotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk" });
// Fallback so emoji (incl. flags, which Windows lacks) render the same everywhere.
// Split by unicode-range, so browsers only download the emoji a page uses.
const emoji = Noto_Color_Emoji({ weight: "400", subsets: ["emoji"], variable: "--font-emoji", preload: false });

export const viewport = { themeColor: "#0091d2", width: "device-width", initialScale: 1, viewportFit: "cover" as const };

export const metadata: Metadata = {
  title: "Kate Ahead · KBC Mobile concept",
  description: "Kate Ahead: your bank warns you before things go wrong, on data it already holds, and explains why. Concept demo by team F5.",
  icons: { icon: "/favicon.svg", apple: "/icon.svg" },
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "KBC Mobile" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${grotesk.variable} ${emoji.variable}`}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
