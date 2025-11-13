"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import AuthGate from "@/components/AuthGate";
import SidebarNav from "@/components/SidebarNav";

export default function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";

  // daftar halaman yang tidak menampilkan sidebar (sesuai yang sudah ada)
  const hideSidebarPaths = ["/login", "/register", "/reset-password", "/reset-password/update"];
  const hideSidebar = hideSidebarPaths.some((p) => pathname.startsWith(p));

  return (
    <>
      <Suspense fallback={null}>
        <AuthGate />
      </Suspense>

      {hideSidebar ? (
        // ===== Halaman Auth: tanpa sidebar =====
        <main className="min-h-screen flex items-center justify-center bg-gray-50">
          {children}
        </main>
      ) : (
        // ===== Halaman utama dengan sidebar =====
        <div className="min-h-screen flex bg-white text-zinc-900">
          {/* ===== SIDEBAR ===== */}
          <aside data-fortis-sidebar className="w-[260px] shrink-0 border-r bg-white">
            <SidebarNav />
          </aside>

          {/* ===== MAIN CONTENT ===== */}
          <div className="flex-1 flex flex-col min-w-0">
            <main className="flex-1 p-6 md:p-8 overflow-auto">{children}</main>
          </div>
        </div>
      )}
    </>
  );
}
