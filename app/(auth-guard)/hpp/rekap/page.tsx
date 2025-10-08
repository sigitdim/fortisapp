"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Produk = {
  id: string;
  nama_produk: string;
  harga_jual: number | null;
};

type HppFinal = {
  produk_id: string;
  nama_produk: string;
  hpp_bahan_per_porsi: number | null;
  overhead_per_porsi: number | null;
  hpp_total_per_porsi: number | null;
  target_penjualan_final: number | null;
};

const toIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

export default function HPPRekapPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<
    Array<
      {
        produk_id: string;
        nama_produk: string;
        harga_jual: number | null;
        hpp_bahan: number;
        overhead: number;
        hpp_total: number;
        target: number | null;
      } & { margin: number | null; laba: number | null }
    >
  >([]);

  const [sortKey, setSortKey] = useState<"nama_produk" | "margin" | "hpp_total" | "harga_jual">("nama_produk");
  const [sortAsc, setSortAsc] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) {
        setRows([]);
        setLoading(false);
        return;
      }

      // 1) Ambil produk milik user
      const { data: produkList, error: ep } = await supabase
        .from("produk")
        .select("id,nama_produk,harga_jual")
        .eq("owner", uid)
        .order("nama_produk", { ascending: true });

      if (ep || !produkList?.length) {
        setRows([]);
        setLoading(false);
        return;
      }

      const ids = produkList.map((p) => p.id);
      // 2) Ambil v_hpp_final utk semua produk tsb
      const { data: finals, error: ef } = await supabase
        .from("v_hpp_final")
        .select("produk_id,nama_produk,hpp_bahan_per_porsi,overhead_per_porsi,hpp_total_per_porsi,target_penjualan_final")
        .in("produk_id", ids);

      const finalMap = new Map<string, HppFinal>();
      (finals ?? []).forEach((f) => finalMap.set(f.produk_id, f as any));

      // 3) Gabungkan & hitung margin
      const composed = (produkList as Produk[]).map((p) => {
        const f = finalMap.get(p.id);
        const hpp_bahan = Number(f?.hpp_bahan_per_porsi ?? 0);
        const overhead = Number(f?.overhead_per_porsi ?? 0);
        const hpp_total = Number(
          f?.hpp_total_per_porsi ?? hpp_bahan + overhead
        );
        const harga = Number(p.harga_jual ?? 0);
        const laba = harga > 0 ? harga - hpp_total : null;
        const margin = harga > 0 ? Math.round(((harga - hpp_total) / harga) * 100) : null;

        return {
          produk_id: p.id,
          nama_produk: p.nama_produk,
          harga_jual: p.harga_jual ?? 0,
          hpp_bahan,
          overhead,
          hpp_total,
          target: f?.target_penjualan_final ?? null,
          laba,
          margin,
        };
      });

      setRows(composed);
      setLoading(false);
    })();
  }, []);

  const sorted = useMemo(() => {
    const r = [...rows];
    r.sort((a, b) => {
      const dir = sortAsc ? 1 : -1;
      if (sortKey === "nama_produk") return a.nama_produk.localeCompare(b.nama_produk) * dir;
      if (sortKey === "margin") return ((a.margin ?? -9999) - (b.margin ?? -9999)) * dir;
      if (sortKey === "hpp_total") return (a.hpp_total - b.hpp_total) * dir;
      if (sortKey === "harga_jual") return ((a.harga_jual ?? 0) - (b.harga_jual ?? 0)) * dir;
      return 0;
    });
    return r;
  }, [rows, sortKey, sortAsc]);

  const header = (label: string, key: typeof sortKey) => (
    <button
      className="font-medium hover:underline"
      onClick={() => (setSortKey(key), setSortAsc(key === sortKey ? !sortAsc : true))}
      title="Klik untuk sort"
    >
      {label} {sortKey === key ? (sortAsc ? "↑" : "↓") : ""}
    </button>
  );

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Rekap HPP per Produk</h1>

      {loading ? (
        <div>Loading…</div>
      ) : (
        <div className="overflow-auto rounded-xl border">
          <table className="min-w-[900px] w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2 text-left">{header("Produk", "nama_produk")}</th>
                <th className="p-2 text-left">{header("Harga Jual", "harga_jual")}</th>
                <th className="p-2 text-left">HPP Bahan</th>
                <th className="p-2 text-left">Overhead</th>
                <th className="p-2 text-left">{header("HPP Total", "hpp_total")}</th>
                <th className="p-2 text-left">Target</th>
                <th className="p-2 text-left">{header("Margin", "margin")}</th>
                <th className="p-2 text-left">Laba/porsi</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => (
                <tr key={r.produk_id} className="border-t">
                  <td className="p-2">{r.nama_produk}</td>
                  <td className="p-2">{toIDR(r.harga_jual ?? 0)}</td>
                  <td className="p-2">{toIDR(r.hpp_bahan)}</td>
                  <td className="p-2">{toIDR(r.overhead)}</td>
                  <td className="p-2">{toIDR(r.hpp_total)}</td>
                  <td className="p-2">{r.target == null ? "—" : toIDR(r.target)}</td>
                  <td className={`p-2 ${r.margin != null && r.margin < 0 ? "text-red-600" : "text-green-700"}`}>
                    {r.margin == null ? "—" : `${r.margin}%`}
                  </td>
                  <td className="p-2">{r.laba == null ? "—" : toIDR(r.laba)}</td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-4 text-center text-gray-500">
                    Belum ada produk.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-gray-500">
        Sumber HPP dari <code>v_hpp_final</code>. Jika sebagian kolom kosong, minta backend refresh view/ETL.
      </p>
    </div>
  );
}
