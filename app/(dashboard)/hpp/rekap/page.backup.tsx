"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchRekapHPP, RekapRow } from "@/lib/hppRekap";
import { toRupiah } from "@/lib/rupiah";

type SortKey = "nama" | "harga" | "hpp" | "margin" | "laba";

export default function RekapHPPPage() {
  const [rows, setRows] = useState<RekapRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>("nama");
  const [q, setQ] = useState("");

  useEffect(() => {
    setLoading(true);
    fetchRekapHPP()
      .then(setRows)
      .catch((e) => setErr(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const mapped = rows.map((r) => {
      const hpp = Number(r.hpp_total_per_porsi ?? 0) || 0;
      const harga = Number(r.harga_jual_user ?? 0) || 0;
      const laba = Math.max(0, harga - hpp);
      const margin = harga > 0 ? (laba / harga) * 100 : 0;
      return { ...r, _hpp: hpp, _harga: harga, _laba: laba, _margin: margin };
    }).filter(r => !needle || (r.nama_produk || "").toLowerCase().includes(needle));

    switch (sortBy) {
      case "harga":  mapped.sort((a,b)=>b._harga - a._harga); break;
      case "hpp":    mapped.sort((a,b)=>b._hpp   - a._hpp);   break;
      case "laba":   mapped.sort((a,b)=>b._laba  - a._laba);  break;
      case "margin": mapped.sort((a,b)=>b._margin- a._margin);break;
      default:       mapped.sort((a,b)=> (a.nama_produk||"").localeCompare(b.nama_produk||""));
    }
    return mapped;
  }, [rows, sortBy, q]);

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Rekap HPP per Produk</h1>

      <div className="flex flex-wrap items-center gap-3">
        <input
          className="border rounded px-3 py-2"
          placeholder="Cari produk…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select className="border rounded px-3 py-2" value={sortBy} onChange={(e)=>setSortBy(e.target.value as SortKey)}>
          <option value="nama">Urut: Produk (A→Z)</option>
          <option value="harga">Urut: Harga Jual</option>
          <option value="hpp">Urut: HPP Total</option>
          <option value="laba">Urut: Laba / Porsi</option>
          <option value="margin">Urut: Margin</option>
        </select>
        {loading && <span className="text-sm text-gray-500">Loading…</span>}
        {err && <span className="text-sm text-red-600">Error: {err}</span>}
      </div>

      <div className="rounded-2xl border overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-700">
            <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-left">
              <th>Produk</th>
              <th>Harga Jual</th>
              <th>HPP Bahan</th>
              <th>Overhead</th>
              <th>Tenaga Kerja</th>
              <th>HPP Total</th>
              <th>Margin</th>
              <th>Laba/porsi</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-gray-500">
                  Belum ada produk.
                </td>
              </tr>
            ) : (
              filtered.map((r) => {
                const hpp = r._hpp!;
                const harga = r._harga!;
                const laba = r._laba!;
                const margin = r._margin!;
                return (
                  <tr key={r.produk_id} className="border-t [&>td]:px-4 [&>td]:py-2">
                    <td className="font-medium">{r.nama_produk || "-"}</td>
                    <td>{harga ? toRupiah(harga) : "-"}</td>
                    <td>{toRupiah(r.hpp_bahan_per_porsi ?? 0)}</td>
                    <td>{toRupiah(r.overhead_per_porsi ?? 0)}</td>
                    <td>{toRupiah(r.tenaga_kerja_per_porsi ?? 0)}</td>
                    <td className="font-medium">{toRupiah(hpp)}</td>
                    <td>{margin.toFixed(1)}%</td>
                    <td className="font-semibold">{toRupiah(laba)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <p className="text-sm text-gray-500">
        Sumber HPP dari <code>v_hpp_final</code>. Jika sebagian kolom kosong, minta backend refresh view/ETL.
      </p>
    </div>
  );
}
