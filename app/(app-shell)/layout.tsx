"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState, Suspense } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import OwnerProvider from "@/app/providers/owner-provider";
import SidebarShell from "@/components/SidebarShell";
import { MoreVertical } from "lucide-react";

/* ========= HeaderActions (menu kanan atas) ========= */
function HeaderActions() {
  const supabase = createClientComponentClient();
  const [label, setLabel] = useState("Guest");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const nm =
        data?.user?.user_metadata?.full_name ||
        (data?.user as any)?.raw_user_meta_data?.full_name ||
        data?.user?.email ||
        "Guest";
      setLabel((nm || "Guest").split("@")[0]);
    })();
  }, [supabase]);

  useEffect(() => {
    if (!open) return;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setOpen(false), 3000);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [open]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  async function signOut() {
    try {
      await supabase.auth.signOut();
      window.location.href = "/login";
    } catch {
      // boleh kosong
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((p) => !p)}
        aria-label="Menu Akun"
        className="w-9 h-9 rounded-full border flex items-center justify-center bg-white hover:bg-zinc-100"
      >
        <MoreVertical className="w-5 h-5 text-neutral-700" />
      </button>

      {open && (
        <div
          className="absolute right-0 top-10 z-50 bg-white border rounded-xl shadow-md px-4 py-3 space-y-2"
          onMouseEnter={() => {
            if (timerRef.current) window.clearTimeout(timerRef.current);
          }}
          onMouseLeave={() => {
            timerRef.current = window.setTimeout(() => setOpen(false), 1000);
          }}
        >
          <span className="text-sm text-gray-700">{label}</span>
          <button
            onClick={signOut}
            className="px-3 py-1.5 rounded-lg border hover:bg-red-50 hover:border-red-400 text-sm text-red-600"
          >
            Keluar
          </button>
        </div>
      )}
    </div>
  );
}

/* ========= Layout Global (membungkus semua halaman) ========= */
export default function AppShellLayout({ children }: { children: ReactNode }) {
  return (
    <OwnerProvider>

      <SidebarShell>
        {/* tombol akun kanan atas */}
        <div className="fixed top-4 right-4 z-50">
          <HeaderActions />
        </div>

        {/* konten halaman */}
        <Suspense fallback={<div className="p-4">Loading...</div>}>
          <div className="p-4">{children}</div>
        </Suspense>
      </SidebarShell>
    </OwnerProvider>
  );
}
