"use client";

import React from "react";
import { usePathname } from "next/navigation";

const WHATSAPP_URL =
  "https://wa.me/6285186002222?text=Halo%20Admin%20Fortis%2C%20saya%20mau%20kasih%20feedback%20tentang%20FortisApp";

// Halaman yang TIDAK boleh menampilkan tombol WA
const HIDE_ON_PATHS = [
  "/login",
  "/register",
  "/reset-password",
  "/reset-password/update",
];

export default function WhatsAppFloatingButton() {
  const pathname = usePathname();

  // Kalau belum tahu path → jangan render apa-apa dulu
  if (!pathname) return null;

  // Sembunyikan di halaman auth (login/register/reset/callback)
  if (
    HIDE_ON_PATHS.includes(pathname) ||
    pathname.startsWith("/auth/") // misal /auth/callback
  ) {
    return null;
  }

  return (
<a
  href={WHATSAPP_URL}
  target="_blank"
  rel="noopener noreferrer"
  className="
    fixed bottom-4 right-4 z-50
    flex items-center justify-center
    w-14 h-14 rounded-full
    bg-white shadow-xl transition
    hover:scale-105 active:scale-95
  "
>
  <img
    src="/fortis-wa-btn.png"
    alt="WhatsApp"
    className="w-7 h-7 object-contain"
  />
</a>
  );
}
