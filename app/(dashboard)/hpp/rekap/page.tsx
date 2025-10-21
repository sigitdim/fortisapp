"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type AnyRow = Record<string, any>;
type Row = {
  produk_id: string;
  nama_produk: string | null;
  bahan: number | null;
  overhead: number | null;
  tenaga: number | null;
  total: number | null;
};

const rupiah = (n: number | null | undefined) => {
  if (n == null || Number.isNaN(n)) return "-";
  try {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
  } catch { return `Rp ${Math.round(Number(n)).toLocaleString("id-ID")}`; }
};

// pilih field pertama yang tersedia
function pick<T=any>(o: AnyRow, keys: string[], fallback: any = null): T | null {
  for (const k of keys) {
    if (k in o && o[k] != null) return o[k] as T;
  }
  return fallback;
}

export default function HppRekapPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [debugKeys, setDebugKeys] = useState<string[]>([]);

  async function load() {
    setLoading(true); setErr(null);
    const { data, error } = await supabase.from("v_hpp_final").select("*").limit(1000);
    if (error) { setErr(error.message); setRows([]); setLoading(false); return; }
    const a = (data || []) as AnyRow[];
    // catat keys buat debug cepat
    setDebugKeys(Array.from(new Set(a.flatMap((r) => Object.keys(r)))).sort());

    const mapped: Row[] = a.map((r) => {
      const bahan = pick<number>(r, ["bahan_per_porsi","hpp_bahan","hpp_bahan_per_porsi","bahan"]);
      const overhead = pick<number>(r, ["overhead_per_porsi","hpp_overhead","overhead"]);
      const tenaga = pick<number>(r, ["tenaga_kerja_per_porsi","hpp_tenaga_kerja","tenaga_kerja"]);
      const total = pick<number>(r, ["hpp_total_per_porsi","hpp_total","hpp"]) ??
        ((bahan || 0) + (overhead || 0) + (tenaga || 0));
      return {
        produk_id: pick<string>(r, ["produk_id","id_produk","id"]) || crypto.randomUUID(),
        nama_produk: pick<string>(r, ["nama_produk","produk_nama","nama"]) || "(tanpa nama)",
        bahan: Number.isFinite(bahan as number) ? bahan! : 0,
        overhead: Number.isFinite(overhead as number) ? overhead! : 0,
        tenaga: Number.isFinite(tenaga as number) ? tenaga! : 0,
        total: Number.isFinite(total as number) ? total! : 0,
      };
    });
    setRows(mapped);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const kpi = useMemo(() => {
    const totalProduk = rows.length;
    const totalHpp = rows.reduce((acc, r) => acc + (r.total || 0), 0);
    const avgHpp = totalProduk ? Math.round(totalHpp / totalProduk) : 0;
    const zeroHpp = rows.filter((r) => !r.total).length;
    return { totalProduk, avgHpp, zeroHpp };
  }, [rows]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) => (r.nama_produk || "").toLowerCase().includes(term));
  }, [rows, q]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Rekap HPP</h1>

      <div className="grid sm:grid-cols-3 gap-3">
        <div className="p-4 border rounded-2xl shadow-sm"><div className="text-gray-500 text-sm">Total Produk</div><div className="text-2xl font-semibold">{kpi.totalProduk}</div></div>
        <div className="p-4 border rounded-2xl shadow-sm"><div className="text-gray-500 text-sm">Rata-rata HPP</div><div className="text-2xl font-semibold">{rupiah(kpi.avgHpp)}</div></div>
        <div className="p-4 border rounded-2xl shadow-sm"><div className="text-gray-500 text-sm">Belum Ada HPP</div><div className="text-2xl font-semibold">{kpi.zeroHpp}</div></div>
      </div>

      <div className="flex items-center gap-3">
        <input className="border rounded-lg px-3 py-2 w-full max-w-md" placeholder="Cari nama produk…" value={q} onChange={(e) => setQ(e.target.value)} />
        <button onClick={load} className="px-3 py-2 border rounded-lg" title="Reload">Reload</button>
      </div>

      <div className="p-4 border rounded-2xl shadow-sm overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-4">Produk</th>
              <th className="py-2 pr-4">Bahan</th>
              <th className="py-2 pr-4">Overhead</th>
              <th className="py-2 pr-4">Tenaga Kerja</th>
              <th className="py-2 pr-4">Total HPP</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.produk_id} className="border-b hover:bg-gray-50">
                <td className="py-2 pr-4">{r.nama_produk}</td>
                <td className="py-2 pr-4">{rupiah(r.bahan)}</td>
                <td className="py-2 pr-4">{rupiah(r.overhead)}</td>
                <td className="py-2 pr-4">{rupiah(r.tenaga)}</td>
                <td className="py-2 pr-4 font-medium">{rupiah(r.total)}</td>
              </tr>
            ))}
            {filtered.length === 0 && !loading && (
              <tr><td colSpan={5} className="py-6 text-center text-gray-500">Tidak ada data</td></tr>
            )}
          </tbody>
        </table>
        {loading && <p className="text-sm text-gray-500 mt-3">Memuat…</p>}
        {err && <p className="text-sm text-red-600 mt-3">{err}</p>}
        {/* Debug cepat: daftar kolom view yang tersedia */}
        <details className="mt-3 text-xs text-gray-500">
          <summary>Debug: kolom tersedia</summary>
          <pre className="bg-gray-50 p-2 rounded">{JSON.stringify(debugKeys, null, 2)}</pre>
        </details>
      </div>
    </div>
  );
}
