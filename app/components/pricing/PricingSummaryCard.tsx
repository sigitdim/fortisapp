"use client";

import React from "react";
import { formatIDR, percent } from "@/lib/format";
import { usePricingFinal } from "@/hooks/usePricingFinal";

type Props = {
  produkId: string | null | undefined;
};

export default function PricingSummaryCard({ produkId }: Props) {
  // kalau belum ada produk dipilih, jangan render apa-apa
  if (!produkId) return null;

  const { data, loading, error, marginText, refresh } = usePricingFinal(produkId);

  return (
    <div className="rounded-2xl border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-500">Ringkasan Pricing</div>
          <div className="text-lg font-semibold">
            {data?.nama_produk ?? "(produk)"}
          </div>
        </div>
        <button
          onClick={refresh}
          className="rounded-xl px-3 py-2 border hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      {loading && <div className="text-sm text-gray-500">Memuat…</div>}
      {error && (
        <div className="text-sm text-red-600">Gagal memuat: {error}</div>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="HPP / porsi" value={formatIDR(data?.hpp_total_per_porsi ?? 0)} />
          <Stat label="Harga user" value={formatIDR(data?.harga_jual_user ?? 0)} />
          <Stat label="Harga rekomendasi" value={formatIDR(data?.harga_rekomendasi ?? 0)} />
          <Stat label="Margin user" value={marginText} />
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-base font-semibold">{value}</div>
    </div>
  );
}
