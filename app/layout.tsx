import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import ChunkReload from "./_components/ChunkReload";
import ServiceWorkerRegister from "./_components/ServiceWorkerRegister";
import WhatsAppFloatingButton from "@/components/WhatsAppFloatingButton";

export const metadata: Metadata = {
  title: "FortisApp",
  description: "Operasional kafe lebih cepat, hasil lebih tepat",

  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },

  manifest: "/site.webmanifest",

  // theme color Android
  themeColor: "#b91c1c",

  // iOS Add to Home Screen
  appleWebApp: {
    capable: true,
    title: "FortisApp",
    statusBarStyle: "black",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <body>
        {children}

        {/* Auto reload chunk */}
        <ChunkReload />

        {/* Register PWA service worker */}
        <ServiceWorkerRegister />

        {/* Floating WhatsApp button */}
        <WhatsAppFloatingButton />
      </body>
    </html>
  );
}
