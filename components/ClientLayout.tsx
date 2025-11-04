"use client";
import React from "react";
import { usePathname } from "next/navigation";

// ⬇️ ganti path import Sidebar/Header sesuai punyamu
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideNav = pathname === "/login" || pathname === "/reset-password";

  if (hideNav) {
    // Halaman polos tanpa sidebar/topbar (LOGIN/RESET)
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa] p-4">
        {children}
      </div>
    );
  }

  // Halaman lain: tetap pakai shell lama
  return (
    <div className="min-h-screen flex">
      <aside className="w-[260px] shrink-0">
        <Sidebar />
      </aside>
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
