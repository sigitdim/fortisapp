// lib/pricing.ts
export type PricingFinal = {
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
};

export async function fetchPricingFinal(opts: {
  ownerId: string;
  produkId: string;
  signal?: AbortSignal;
}): Promise<PricingFinal> {
  const { ownerId, produkId, signal } = opts;
  const url = `https://api.fortislab.id/pricing/final?produk_id=${encodeURIComponent(
    produkId
  )}`;

  const r = await fetch(url, {
    method: "GET",
    headers: {
      "x-owner-id": ownerId,
    },
    signal,
    cache: "no-store",
  });

  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(`Pricing API error ${r.status}: ${text || r.statusText}`);
  }
  return (await r.json()) as PricingFinal;
}
