// app/layout.tsx
import type { Metadata } from "next";
import { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { Sidebar } from "@/app/components/app/Sidebar";
import { Topbar } from "@/app/components/app/Topbar";
import { Toaster } from "@/app/components/ui/toaster";
import AuthBar from "@/app/components/AuthBar"; // pakai punyamu

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FortisApp",
  description: "Cafe Ops Suite",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-neutral-50 text-neutral-900 antialiased`}>
        <div className="grid grid-cols-12">
          <aside className="hidden md:block md:col-span-3 lg:col-span-2 min-h-screen border-r bg-white">
            <Sidebar />
          </aside>
          <main className="col-span-12 md:col-span-9 lg:col-span-10 min-h-screen">
            <Topbar />
            <div className="p-4 lg:p-6 space-y-4">
              <AuthBar />
              {children}
            </div>
          </main>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
