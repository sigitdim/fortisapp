"use client";

import React, { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useLicense } from "@/hooks/useLicense";
import { MidtransPayButton } from "./_components/MidtransPayButton";

type SupaUser = {
  email?: string;
  user_metadata?: {
    username?: string;
    display_name?: string;
    nama?: string;
    full_name?: string;
    name?: string;
  };
};

function formatExpiry(raw?: string | null): string {
  if (!raw) return "—";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw || "—";

  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);

  return `${dd}-${mm}-${yy}`;
}

/* ============================================================
   FIX: useLicenseView (compatible for ALL useLicense versions)
   ============================================================ */
function useLicenseView() {
  const license = useLicense();

  const loading =
    (license as any)?.loading ??
    (license as any)?.isLoading ??
    false;

  const isPro =
    (license as any)?.is_pro === true ||
    (license as any)?.plan_status === "pro" ||
    (license as any)?.plan === "pro";

  const rawProUntil =
    (license as any)?.pro_until ||
    (license as any)?.expired_at ||
    null;

  return {
    loading,
    isPro,
    proUntilLabel: isPro ? formatExpiry(rawProUntil) : "—",
  };
}

/* ============================================================ */

export default function BillingPage() {
  const [displayName, setDisplayName] = useState<string>("User");
  const { loading, isPro, proUntilLabel } = useLicenseView();

  useEffect(() => {
    const supabase = createClientComponentClient();

    supabase.auth.getUser().then(({ data }) => {
      const user = data.user as SupaUser | null;
      if (!user) return;

      const meta = user.user_metadata || {};

      const nameFromMeta =
        meta.username ||
        meta.display_name ||
        meta.nama ||
        meta.full_name ||
        meta.name ||
        undefined;

      setDisplayName(nameFromMeta || user.email || "User");
    });
  }, []);

  const statusLabel = loading ? "Checking..." : isPro ? "Pro" : "Free";

  return (
    <div className="min-h-full w-full px-4 py-4 md:px-8 md:py-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <h1 className="text-2xl font-semibold text-gray-900">Membership</h1>

        {/* Banner */}
        <section className="rounded-3xl bg-gradient-to-r from-[#b91c1c] to-[#ef4444] p-6 text-white shadow-md md:p-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xl font-semibold md:text-2xl">
                {displayName} <span className="font-normal">({statusLabel})</span>
              </p>
              <p className="mt-1 text-sm opacity-90">
                {loading
                  ? "Mengecek status membership..."
                  : isPro
                  ? `Active until ${proUntilLabel}`
                  : "Akun kamu masih Free plan. Upgrade ke PRO untuk membuka semua fitur."}
              </p>
            </div>
            <div className="rounded-full bg-white/10 px-4 py-2 text-xs font-medium tracking-wide">
              {isPro ? "FortisApp Pro" : "FortisApp Free"}
            </div>
          </div>
        </section>

        {/* Paket PRO */}
        <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm md:p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Perpanjang Membership
          </h2>

          <p className="mb-4 text-xs text-gray-500 md:text-sm">
            Pembayaran menggunakan Midtrans Snap. Setelah transaksi sukses,
            status PRO akan otomatis diaktifkan melalui webhook.
          </p>

          <div className="grid gap-4 md:grid-cols-3">
            <MidtransPayButton packageId="fortisapp-pro-3bulan" />
            <MidtransPayButton packageId="fortisapp-pro-6bulan" />
            <MidtransPayButton packageId="fortisapp-pro-12bulan" />
          </div>
        </section>
      </div>
    </div>
  );
}
