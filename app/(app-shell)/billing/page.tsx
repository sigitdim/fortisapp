"use client";

import React, { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Paywall from "@/components/license/Paywall";

type SupaUser = {
  email?: string;
  user_metadata?: {
    username?: string;
    display_name?: string;
    nama?: string;
    full_name?: string;
    name?: string;
    pro_until?: string;
  };
};

function formatExpiry(raw?: string | null): string {
  if (!raw) return "—";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;

  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}-${mm}-${yy}`;
}

export default function BillingPage() {
  const [displayName, setDisplayName] = useState<string>("User");
  const [expiryLabel, setExpiryLabel] = useState<string>("—");

  useEffect(() => {
    const supabase = createClientComponentClient();
    supabase.auth
      .getUser()
      .then(({ data }) => {
        const user = data.user as SupaUser | null;
        if (!user) return;

        const meta = user.user_metadata || {};

        // 🔥 Urutan baru – utamakan username / display_name / nama
        const nameFromMeta =
          meta.username ||
          meta.display_name ||
          meta.nama ||
          meta.full_name ||
          meta.name ||
          undefined;

        setDisplayName(nameFromMeta || user.email || "User");

        if (meta.pro_until) {
          setExpiryLabel(formatExpiry(meta.pro_until));
        }
      })
      .catch(() => {
        // fallback aja
      });
  }, []);

  return (
    <div className="min-h-full w-full px-4 py-4 md:px-8 md:py-6">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Title */}
        <h1 className="text-2xl font-semibold text-gray-900">Membership</h1>

        {/* Banner merah */}
        <section className="rounded-3xl bg-gradient-to-r from-[#b91c1c] to-[#ef4444] p-6 text-white shadow-md md:p-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xl font-semibold md:text-2xl">
                {displayName} <span className="font-normal">(Pro)</span>
              </p>
              <p className="mt-1 text-sm opacity-90">
                Active until {expiryLabel}
              </p>
            </div>
            <div className="rounded-full bg-white/10 px-4 py-2 text-xs font-medium tracking-wide">
              FortisApp Pro
            </div>
          </div>
        </section>

        {/* Perpanjang Membership */}
        <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm md:p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Perpanjang Membership
          </h2>

          <div className="space-y-4 md:max-w-md">
            <select className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm outline-none focus:ring-2 focus:ring-[#b91c1c]">
              <option value="3">3 Bulan (Rp 149.000)</option>
              <option value="6">6 Bulan (Rp 249.000)</option>
              <option value="12">12 Bulan (Rp 499.000)</option>
            </select>

            <button
              type="button"
              className="w-full rounded-2xl bg-[#b91c1c] px-4 py-3 text-sm font-semibold text-white shadow hover:bg-[#991b1b] focus:outline-none focus:ring-2 focus:ring-[#b91c1c]"
              onClick={() => {
                // klik tombol checkout di Paywall
                const hiddenButton = document.querySelector<HTMLButtonElement>(
                  "[data-fortis-billing='checkout']"
                );
                hiddenButton?.click();
              }}
            >
              Perpanjang
            </button>
          </div>
        </section>

        {/* Paywall lama disimpan buat logic backend / Mayar */}
        <div className="hidden">
          <Paywall />
        </div>
      </div>
    </div>
  );
}
