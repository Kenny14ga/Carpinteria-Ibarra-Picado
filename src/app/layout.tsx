import type { Metadata, Viewport } from "next";
import { Inter, Noto_Serif_Display, Great_Vibes } from "next/font/google";
import "./globals.css";
import { PWAInstallBanner } from "@/components/PWAInstallBanner";
import { SyncEngineRuntime } from "@/hooks/useSyncEngine";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body"
});

const notoSerif = Noto_Serif_Display({
  subsets: ["latin"],
  display: "swap",
  weight: ["700", "900"],
  style: ["normal", "italic"],
  variable: "--font-display"
});

const greatVibes = Great_Vibes({
  subsets: ["latin"],
  display: "swap",
  weight: ["400"],
  variable: "--font-cursive"
});

export const metadata: Metadata = {
  title: "Carpintería Ibarra Picado",
  description:
    "Sistema operativo para ventas, inventario, compras de madera, fabricación y cotizaciones de carpintería.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Ibarra Picado",
    statusBarStyle: "default"
  },
  icons: {
    icon: "/LOGOSCAP/favicon_512.svg",
    apple: "/LOGOSCAP/pwa_icon_192x192.png"
  }
};

export const viewport: Viewport = {
  themeColor: "#4A2E20",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} ${notoSerif.variable} ${greatVibes.variable}`}>
      <body>
        <SyncEngineRuntime />
        {children}
        <PWAInstallBanner />
      </body>
    </html>
  );
}
