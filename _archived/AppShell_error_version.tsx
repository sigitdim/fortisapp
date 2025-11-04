"use client";
import React from "react";
import { usePathname } from "next/navigation";

/**
 * AppShell:
 * - Render layout lengkap (Sidebar/Topbar + <main>) untuk semua halaman
 * - KECUALI beberapa route publik ("/login", "/reset-password") -> tampil polos (tanpa sidebar)
 */
export default function AppShell({
  children,
  renderWithChrome,
}: {
  children: React.ReactNode;
  renderWithChrome: (slot: React.ReactNode) => React.ReactNode;
}) {
  const pathname = usePathname();
  const hideChrome =
    pathname === "/login" || pathname === "/reset-password";

  if (hideChrome) {
    // Halaman polos tanpa sidebar/topbar (aman: tidak mengubah tailwind global)
    return <div className="min-h-screen flex items-center justify-center bg-[#fafafa] p-4">{children}</div>;
  }

  return <>{renderWithChrome(children)}</>;
}
