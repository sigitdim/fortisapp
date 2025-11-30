"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState, Suspense } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import OwnerProvider from "@/components/OwnerProvider";
import SidebarShell from "@/components/SidebarShell";
import { MoreVertical } from "lucide-react";
import { useLicense } from "@/hooks/useLicense";

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
        (data?.user?.user_metadata as any)?.full_name ||
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
      // ignore
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((p) => !p)}
        aria-label="Menu Akun"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-neutral-200 hover:bg-neutral-50"
      >
        <MoreVertical className="h-5 w-5 text-neutral-700" />
      </button>

      {open && (
        <div
          className="absolute right-0 top-10 z-50 space-y-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 shadow-lg"
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
            className="rounded-lg border px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
          >
            Keluar
          </button>
        </div>
      )}
    </div>
  );
}

/* ========= AUTH GUARD (kalau belum login → /login) ========= */
function AuthGuard({ children }: { children: ReactNode }) {
  const supabase = createClientComponentClient();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        window.location.href = "/login";
        return;
      }

      setChecked(true);
    })();
  }, [supabase]);

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-neutral-50 to-neutral-100">
        <div className="rounded-3xl bg-white px-6 py-5 text-sm text-gray-500 shadow-sm">
          Mengarahkan ke halaman login...
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

/* ========= LICENSE GUARD (cek membership aktif) ========= */
function LicenseGuard({ children }: { children: ReactNode }) {
  const { loading, isActive } = useLicense();

  const pathname =
    typeof window !== "undefined" ? window.location.pathname : "/";
  const isBillingPage = pathname.startsWith("/billing");

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-neutral-50 to-neutral-100">
        <div className="rounded-3xl bg-white px-6 py-5 text-sm text-gray-500 shadow-sm">
          Mengecek status membership...
        </div>
      </div>
    );
  }

  // Halaman Billing → selalu boleh
  if (isBillingPage) return <>{children}</>;

  if (!isActive) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-gradient-to-br from-neutral-50 to-neutral-100">
        <div className="max-w-md rounded-3xl bg-white px-6 py-6 text-center shadow-sm">
          <div className="mb-2 text-base font-semibold text-gray-900">
            Membership tidak aktif
          </div>
          <p className="mb-4 text-xs text-gray-500">
            Untuk melanjutkan menggunakan semua fitur FortisApp, silakan
            perpanjang membership Pro Anda terlebih dahulu.
          </p>
          <a
            href="/billing?expired=1"
            className="inline-flex items-center justify-center rounded-2xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Buka Halaman Billing
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

/* ========= Layout Global (pembungkus semua halaman) ========= */
export default function AppShellLayout({ children }: { children: ReactNode }) {
  return (
    <OwnerProvider>
      <AuthGuard>
        <SidebarShell>
          {/* tombol akun kanan atas */}
          <div className="fixed right-4 top-4 z-50">
            <HeaderActions />
          </div>

          {/* proteksi membership */}
          <LicenseGuard>
            <Suspense fallback={<div className="p-4">Loading...</div>}>
              {children}
            </Suspense>
          </LicenseGuard>
        </SidebarShell>
      </AuthGuard>
    </OwnerProvider>
  );
}

