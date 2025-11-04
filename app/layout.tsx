import "./globals.css";
import type { Metadata } from "next";
import React, { Suspense } from "react";
import AuthGate from "@/components/AuthGate";
import SidebarNav from "@/components/SidebarNav";

export const metadata: Metadata = {
  title: "FortisApp",
  description: "Operasional kafe lebih cepat, hasil lebih tepat",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>
        <Suspense fallback={null}>
          <AuthGate />
        </Suspense>

        {/* ===== APP WRAPPER ===== */}
        <div className="min-h-screen flex bg-white text-zinc-900">
          {/* ===== SIDEBAR ===== */}
          <aside data-fortis-sidebar className="w-[260px] shrink-0 border-r border-zinc-200">
            <SidebarNav />
          </aside>

          {/* ===== MAIN CONTENT ===== */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* ===== TOPBAR ===== */}
            <header
              data-fortis-header
              className="h-16 border-b border-zinc-200 bg-white flex items-center justify-between px-6"
            >
              <div className="text-lg font-semibold">FortisApp</div>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-zinc-600">Guest</span>
                <a
                  href="/logout"
                  className="px-3 py-1.5 rounded-md border border-zinc-300 hover:bg-zinc-100"
                >
                  Keluar
                </a>
              </div>
            </header>

            {/* ===== PAGE CONTENT ===== */}
            <main className="flex-1 p-6 md:p-8 overflow-auto">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
