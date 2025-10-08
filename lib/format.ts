"use client";

import { useEffect, useState } from "react";

export type HppFinal = {
  ok: boolean;
  owner_id?: string;
  produk_id?: string;
  hpp?: {
    bahan_per_porsi?: number;
    overhead_per_porsi?: number;
    tenaga_kerja_per_porsi?: number;
  };
  note?: string;
  total_hpp?: number;
};

type Options = {
  produkId?: string | null;
  ownerId?: string | null; // kalau nanti butuh x-owner-id, kita kirimkan
  enabled?: boolean;
};

export function usePricingFinal({ produkId, ownerId, enabled = true }: Options) {
  const [data, setData]   = useState<HppFinal | null>(null);
  const [loading, setL]   = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !produkId) return;

    const api = process.env.NEXT_PUBLIC_API_URL || "";
    const url = `${api}/pricing/final?produk_id=${encodeURIComponent(produkId)}`;

    let aborted = false;
    (async () => {
      try {
        setL(true);
        setError(null);

        const headers: HeadersInit = {};
        // BE sekarang gak mewajibkan header, tapi kalau suatu saat butuh:
        if (ownerId) headers["x-owner-id"] = ownerId;

        const res = await fetch(url, { headers, cache: "no-store" });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`HTTP ${res.status} – ${text}`);
        }
        const json: HppFinal = await res.json();
        if (!aborted) setData(json);
      } catch (e: any) {
        if (!aborted) setError(e?.message ?? "Gagal fetch pricing/final");
      } finally {
        if (!aborted) setL(false);
      }
    })();

    return () => { aborted = true; };
  }, [produkId, ownerId, enabled]);

  return { data, loading, error };
}
