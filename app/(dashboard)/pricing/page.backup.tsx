"use client";

import { useState } from "react";
import { useOwner } from "@/app/providers/owner-provider";
import { usePricingFinal } from "@/lib/usePricingFinal";

export default function PricingPage() {
  const { ownerId } = useOwner();
  const [produkId, setProdukId] = useState<string>(""); // TODO: isi dari list produkmu
  const { data, loading, err } = usePricingFinal(produkId, ownerId);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Pricing</h1>

      <div className="flex gap-2">
        <input
          className="border rounded px-3 py-2 w-[420px]"
          placeholder="produk_id (UUID)"
          value={produkId}
          onChange={(e) => setProdukId(e.target.value)}
        />
        <button className="border rounded px-4 py-2" onClick={() => { /* trigger useEffect */ }}>
          Load
        </button>
      </div>

      {ownerId ? (
        <div className="text-sm text-gray-600">owner: {ownerId}</div>
      ) : (
        <div className="text-sm text-red-600">Belum login</div>
      )}

      {loading && <div>Loading…</div>}
      {err && <div className="text-red-600">Error: {err}</div>}
      {data && (
        <div className="rounded-2xl border p-4">
          <div className="font-medium mb-2">Hasil /pricing/final</div>
          <pre className="text-sm">{JSON.stringify(data, null, 2)}</pre>
          <div className="mt-2">Total HPP: <b>{data.total_hpp}</b></div>
        </div>
      )}
    </div>
  );
}
