// app/pricing/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { api, fetchProdukList } from "@/lib/api";

type PricingRow = {
  produk_id: string;
  nama_produk: string;
  hpp_total_per_porsi: number | null;
  harga_jual_user: number | null;
  profit_user_per_porsi: number | null;
  margin_user_persen: number | null;
  harga_rekomendasi?: number | null;
  harga_rek_standar?: number | null;
  harga_rek_premium?: number | null;
};

export default function PricingPage() {
  const [rows, setRows] = useState<PricingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [targetMargin, setTargetMargin] = useState(30);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const list = await fetchProdukList();
        const results = await Promise.all(list.map(async (p) => {
          try {
            const j = await api(`/pricing/final?produk_id=${encodeURIComponent(p.id)}`);
            const d = j?.data || j;
            const hppRaw = (d?.hpp_total_per_porsi ?? d?.hpp ?? null);
            const hpp = hppRaw == null ? null : Number(hppRaw);
            return {
              produk_id: p.id,
              nama_produk: p.nama,
              hpp_total_per_porsi: Number.isFinite(hpp) ? hpp : null,
              harga_jual_user: d?.harga_jual_user ?? null,
              profit_user_per_porsi: d?.profit_user_per_porsi ?? null,
              margin_user_persen: d?.margin_user_persen ?? null,
              harga_rekomendasi: d?.harga_rekomendasi ?? null,
              harga_rek_standar: d?.harga_rek_standar ?? null,
              harga_rek_premium: d?.harga_rek_premium ?? null,
            } as PricingRow;
          } catch {
            return {
              produk_id: p.id,
              nama_produk: p.nama,
              hpp_total_per_porsi: null,
              harga_jual_user: null,
              profit_user_per_porsi: null,
              margin_user_persen: null,
            } as PricingRow;
          }
        }));
        setRows(results);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(r => r.nama_produk.toLowerCase().includes(s));
  }, [rows, q]);

  async function aiSuggest(produk_id: string) {
    // Backend proxy: menyimpan logs otomatis
    const j = await api(`/ai/suggest`, { method: "POST", body: { produk_id } });
    const d = (j?.data || j) as { harga_rekomendasi?: number; hpp?: number };
    setRows(prev => prev.map(r =>
      r.produk_id === produk_id
        ? { ...r, harga_rekomendasi: d?.harga_rekomendasi ?? r.harga_rekomendasi,
            hpp_total_per_porsi: d?.hpp ?? r.hpp_total_per_porsi }
        : r
    ));
  }

  async function applyPrice(produk_id: string, harga: number) {
    try {
      await api(`/pricing/apply`, { method: "POST", body: { produk_id, harga_jual_user: harga } });
    } catch {
      await api(`/produk/${produk_id}`, { method: "PATCH", body: { harga_jual_user: harga } });
    }
    const j = await api(`/pricing/final?produk_id=${encodeURIComponent(produk_id)}`);
    const d = j?.data || j;
    setRows(prev => prev.map(r => r.produk_id === produk_id ? {
      ...r,
      harga_jual_user: d?.harga_jual_user ?? harga,
      profit_user_per_porsi: d?.profit_user_per_porsi ?? r.profit_user_per_porsi,
      margin_user_persen: d?.margin_user_persen ?? r.margin_user_persen,
      harga_rekomendasi: d?.harga_rekomendasi ?? r.harga_rekomendasi,
    } : r));
    alert("Harga tersimpan ✔");
  }

  function fmt(x: number | null | undefined, cur = false) {
    if (x == null) return "-";
    if (!cur) return Number(x).toLocaleString("id-ID");
    return Number(x).toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold">Pricing — COGS & Margin</h1>
        {loading && <span className="text-sm opacity-70">Loading…</span>}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <input
          value={q}
          onChange={e=>setQ(e.target.value)}
          placeholder="Cari produk…"
          className="border rounded-xl px-3 py-2 w-64"
        />
        <div className="flex items-center gap-3">
          <label className="text-sm">Target Margin AI: {targetMargin}%</label>
          <input type="range" min={10} max={80} value={targetMargin}
            onChange={e=>setTargetMargin(Number(e.target.value))}/>
        </div>
      </div>

      <div className="overflow-auto border rounded-2xl">
        <table className="min-w-[960px] w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="border-b">
              <th className="text-left p-3">Produk</th>
              <th className="text-right p-3">HPP</th>
              <th className="text-right p-3">Harga Jual</th>
              <th className="text-right p-3">Profit</th>
              <th className="text-right p-3">Margin %</th>
              <th className="text-right p-3">Harga Rekomendasi AI</th>
              <th className="text-right p-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => {
              const [hargaInput, setHargaInput] = useState<string | null>(null) as any;
              const hargaNow = hargaInput ?? (row.harga_jual_user ?? 0).toString();
              return (
                <tr key={row.produk_id} className="border-b hover:bg-gray-50/60">
                  <td className="p-3 font-medium">{row.nama_produk}</td>
                  <td className="p-3 text-right">{fmt(row.hpp_total_per_porsi, true)}</td>
                  <td className="p-3 text-right">
                    <input
                      className="border rounded-lg px-2 py-1 w-32 text-right"
                      value={hargaNow}
                      onChange={e=>setHargaInput(e.target.value.replace(/\D/g,""))}
                    />
                  </td>
                  <td className="p-3 text-right">{fmt(row.profit_user_per_porsi, true)}</td>
                  <td className="p-3 text-right">{row.margin_user_persen != null ? `${row.margin_user_persen.toFixed(1)}%` : "-"}</td>
                  <td className="p-3 text-right">
                    {fmt(row.harga_rekomendasi ?? row.harga_rek_standar ?? null, true)}
                  </td>
                  <td className="p-3 text-right space-x-2">
                    <button onClick={()=>aiSuggest(row.produk_id)} className="px-3 py-1 rounded-lg border">
                      AI Suggest
                    </button>
                    <button onClick={()=>applyPrice(row.produk_id, Number(hargaNow || 0))}
                      className="px-3 py-1 rounded-lg bg-black text-white">
                      Apply
                    </button>
                  </td>
                </tr>
              );
            })}
            {!filtered.length && !loading && (
              <tr><td className="p-6 text-center text-gray-500" colSpan={7}>Tidak ada data</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
