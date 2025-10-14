"use client";
import { useRouter, useSearchParams } from "next/navigation";
export default function PricingClient() {
  const sp = useSearchParams(); const produkId = sp.get("produk_id") ?? "";
  return (<div className="p-4"><h1 className="text-xl font-semibold">Pricing</h1><div>produk_id: {produkId || "(kosong)"}</div></div>);
}
