import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";

export type PricingFinalResp = {
  ok: boolean;
  owner_id: string;
  produk_id: string;
  hpp: {
    bahan_per_porsi: number;
    overhead_per_porsi: number;
    tenaga_kerja_per_porsi: number;
  };
  note?: string;
  total_hpp: number;
  harga_rek_standar?: number | null;
  harga_rek_premium?: number | null;
};

export function usePricingFinal(produkId?: string, ownerId?: string | null) {
  const [data, setData] = useState<PricingFinalResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!produkId || !ownerId) return;
    let cancelled = false;
    setLoading(true);
    setErr(null);
    apiGet<PricingFinalResp>(`/pricing/final?produk_id=${produkId}`, ownerId)
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setErr(String(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = True; };
  }, [produkId, ownerId]);

  return { data, loading, err };
}
