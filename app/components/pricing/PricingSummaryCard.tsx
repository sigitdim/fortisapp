"use client";

import { formatIDR } from "@/lib/format";
import { usePricingFinal } from "@/hooks/usePricingFinal";
// Kalau lu pakai Supabase auth:
import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

type Props = { produkId: string };

export default function PricingSummaryCard({ produkId }: Props) {
  const [ownerId, setOwnerId] = useState<string | null>(null);

  // Ambil owner_id dari session Supabase (kalau sudah ada auth)
  useEffect(() => {
    const supabase = createClientComponentClient();
    supabase.auth.getUser().then(({ data }) => {
      setOwnerId(data.user?.id ?? null);
    });
  }, []);

  const { data, loading, error } = usePricingFinal({ produkId, ownerId });

  if (!produkId) return null;

  return (
    <div className="rounded-2xl border p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-lg font-semibold">HPP Final</h3>
        {loading && <span className="text-sm opacity-70">Loading…</span>}
      </div>

      {error && (
        <div className="mb-3 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {data && (
        <div className="space-y-1 text-sm">
          <div className="text-base">
            <b>Total HPP:</b> Rp {formatIDR(data.total_hpp)}
          </div>
          <div>Bahan: Rp {formatIDR(data.hpp?.bahan_per_porsi)}</div>
          <div>Overhead: Rp {formatIDR(data.hpp?.overhead_per_porsi)}</div>
          <div>Tenaga Kerja: Rp {formatIDR(data.hpp?.tenaga_kerja_per_porsi)}</div>

          {data.note && (
            <div className="pt-2 text-xs opacity-80">
              Catatan: {data.note}
            </div>
          )}
        </div>
      )}

      {!loading && !error && !data && (
        <div className="text-sm opacity-70">Belum ada data.</div>
      )}
    </div>
  );
}
