// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import AiAssistant from "@/components/AiAssistant"; // <-- tampil di semua halaman

export const metadata: Metadata = {
  title: "FortisApp",
  description: "Manajemen HPP, Pricing, Promo — Fortuna Cafe",
};

import AIAssistant from '@/app/components/AIAssistant';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="min-h-dvh bg-white text-black">
        {children}
        {/* Floating AI di kanan bawah */}
        <AiAssistant />
        <AIAssistant />
    </body>
    </html>
  );
}
