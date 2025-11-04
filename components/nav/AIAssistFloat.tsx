// components/nav/AIAssistFloat.tsx
"use client";
import { usePathname } from 'next/navigation';
import Link from "next/link";

export default function AIAssistFloat() {
  // ---- route gate: tampilkan hanya di halaman COGS/HPP/PRICING ----
  const path = String(usePathname() || '');
  const ALLOW = ['/hpp', '/cogs', '/setup/bom-cogs', '/pricing'];

  // optional: sembunyikan juga kalau belum login (cek cookie yang kita set)
  const isLoggedIn = typeof document !== 'undefined' && document.cookie.includes('is_logged_in=1');

  const allowed =
    isLoggedIn &&
    ALLOW.some(p => path === p || path.startsWith(p + '/') || path.startsWith(p));

  if (!allowed) return null;

  return (
    <Link
      href="/pricing/assist"
      aria-label="AI Suggestion"
      title="AI Suggestion"
      className={[
        "fixed z-[80]",
        "bottom-6 left-6",        // ⬅️ pojok kiri bawah
        "rounded-full shadow-lg px-5 py-3",
        "text-sm bg-black text-white whitespace-nowrap",
        "hover:opacity-90 transition"
      ].join(" ")}
    >
      💡 AI Suggestion
    </Link>
  );
}
