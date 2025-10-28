"use client";

import { useEffect, useState } from "react";
import { getJson } from "@/lib/api";

type Promo = {
  id: string;
  nama: string;
  tipe: "percent" | "nominal";
  nilai: number;
  produk_ids: string[] | null;
  aktif: boolean;
};

type PromoResp = { ok: boolean; data: Promo[] };

export default function PromoPage() {
  const [items, setItems] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      setErr(null);
      const json = await getJson<PromoResp>("/promo");
      if (!json?.ok) throw new Error("Response not ok");
      setItems(Array.isArray(json.data) ? json.data : []);
    } catch (e: any) {
      setErr(e?.message || "Gagal memuat promo");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <main className="p-4 md:p-6 space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Promo</h1>
          <p className="text-sm text-gray-500">
            Data dari tabel <code>public.promo</code> (BE 20 Okt 2025).
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="rounded-xl px-4 py-2 border text-sm shadow-sm hover:shadow transition disabled:opacity-60"
        >
          {loading ? "Memuat…" : "Refresh"}
        </button>
      </header>

      {err && (
        <div className="border border-red-200 bg-red-50 text-red-800 p-3 rounded-xl text-sm">
          {err}
        </div>
      )}

      {!err && loading && (
        <div className="animate-pulse border rounded-xl p-4">Memuat data promo…</div>
      )}

      {!err && !loading && items.length === 0 && (
        <div className="border rounded-xl p-6 text-center text-gray-500">
          Belum ada data promo. Tambahkan di Supabase (<code>public.promo</code>).
        </div>
      )}

      {!err && !loading && items.length > 0 && (
        <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => {
            const produkCount = p.produk_ids?.length ?? 0;
            const tipeLabel =
              p.tipe === "percent" ? `${p.nilai}%` : `Rp ${formatIDR(p.nilai)}`;
            return (
              <li key={p.id} className="rounded-2xl border p-4 shadow-sm hover:shadow transition">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-medium">{p.nama}</h2>
                  <span
                    className={[
                      "text-xs px-2 py-1 rounded-full border",
                      p.aktif
                        ? "bg-green-50 text-green-700 border-green-200"
                        : "bg-gray-50 text-gray-600 border-gray-200",
                    ].join(" ")}
                  >
                    {p.aktif ? "AKTIF" : "NONAKTIF"}
                  </span>
                </div>

                <div className="mt-2 text-sm text-gray-600 space-y-1">
                  <div>
                    <span className="inline-block w-28 text-gray-500">Tipe</span>
                    <span className="font-medium">
                      {p.tipe === "percent" ? "Percent" : "Nominal"}
                    </span>
                  </div>
                  <div>
                    <span className="inline-block w-28 text-gray-500">Nilai</span>
                    <span className="font-medium">{tipeLabel}</span>
                  </div>
                  <div>
                    <span className="inline-block w-28 text-gray-500">Produk</span>
                    <span className="font-medium">{produkCount} item</span>
                  </div>
                  <div className="text-[11px] text-gray-400 break-all">ID: {p.id}</div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}

function formatIDR(n: number) {
  try {
    return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(n);
  } catch {
    return String(n);
  }
}
