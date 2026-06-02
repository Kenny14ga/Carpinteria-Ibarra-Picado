import type { Metadata, Viewport } from "next";
import { Inter, Noto_Serif_Display } from "next/font/google";
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

export const metadata: Metadata = {
  title: "Riquiquísimo — Pastelería Artesanal",
  description:
    "Sistema operativo para inventario, producción y ventas de pastelería artesanal. Modo offline, sincronización automática y catálogo público.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Riquiquísimo",
    statusBarStyle: "default"
  },
  icons: {
    icon: "/LOGOS/favicon.svg",
    apple: "/LOGOS/icon-192.png"
  }
};

export const viewport: Viewport = {
  themeColor: "#B83E6C",
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
    <html lang="es" className={`${inter.variable} ${notoSerif.variable}`}>
      <body>
        <SyncEngineRuntime />
        {children}
        <PWAInstallBanner />
      </body>
    </html>
  );
}
