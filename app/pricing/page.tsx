// app/pricing/page.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

/* ========= Types ========= */
type PricingRow = {
  produk_id: string;
  nama_produk: string;
  hpp_total_per_porsi: number | null;
  harga_rekomendasi: number | null;
  harga_jual_user: number | null;
  profit_user_per_porsi: number | null;
  margin_user_persen: number | null;
};

/* ========= Helpers ========= */
const fmt = (n: number | null | undefined) =>
  n == null ? "-" : new Intl.NumberFormat("id-ID").format(n);

const num = (v: any) => {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/* ========= Data loader (tanpa hook terpisah) ========= */
async function fetchPricingView(): Promise<PricingRow[]> {
  // Ambil semua kolom biar tahan perubahan nama kolom minor di backend
  const { data, error } = await supabase.from("v_pricing_final").select("*");
  if (error) throw error;

  const rows = (data ?? []).map((r: any) => ({
    produk_id: r.produk_id ?? r.id,
    nama_produk: r.nama_produk ?? r.produk ?? "",
    hpp_total_per_porsi: num(r.hpp_total_per_porsi ?? r.hpp_total),
    harga_rekomendasi: num(r.harga_rekomendasi),
    harga_jual_user: num(r.harga_jual_user ?? r.harga_jual),
    profit_user_per_porsi: num(r.profit_user_per_porsi ?? r.profit),
    margin_user_persen: num(r.margin_user_persen ?? r.margin),
  })) as PricingRow[];

  // Urutkan dikit biar rapi
  rows.sort((a, b) => a.nama_produk.localeCompare(b.nama_produk, "id"));
  return rows;
}

/* ========= Page ========= */
export default function PricingPage() {
  const [rows, setRows] = useState<PricingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const refetch = async () => {
    setLoading(true);
    setErr(null);
    try {
      const d = await fetchPricingView();
      setRows(d);
    } catch (e: any) {
      setErr(e?.message ?? "Gagal memuat data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refetch();
  }, []);

  const saveHarga = async (row: PricingRow, val: number) => {
    setSavingId(row.produk_id);
    setMsg(null);

    // Optimistic UI (boleh dihapus kalau gak suka)
    const prev = rows.slice();
    setRows(rows.map(r => r.produk_id === row.produk_id ? { ...r, harga_jual_user: val } : r));

    const { error } = await supabase
      .from("produk")
      .update({ harga_jual_user: val })
      .eq("id", row.produk_id);

    if (error) {
      setRows(prev);
      setMsg("Gagal simpan: " + error.message);
    } else {
      await refetch(); // kunci: angka lain ikut backend (profit, margin, rekomendasi)
      setMsg("Harga tersimpan & disinkronkan dari backend ✅");
    }
    setSavingId(null);
  };

  const exportCSV = () => {
    const header = [
      "produk_id","nama_produk","hpp_total_per_porsi","harga_rekomendasi",
      "harga_jual_user","profit_user_per_porsi","margin_user_persen",
    ];
    const lines = rows.map(r => [
      r.produk_id,
      csvSafe(r.nama_produk),
      safeNum(r.hpp_total_per_porsi),
      safeNum(r.harga_rekomendasi),
      safeNum(r.harga_jual_user),
      safeNum(r.profit_user_per_porsi),
      safeNum(r.margin_user_persen),
    ].join(","));
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "pricing.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="p-6">Loading…</div>;
  if (err) return <div className="p-6 text-red-600">Error: {err}</div>;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Produk / Pricing (v_pricing_final)</h1>
        <div className="flex gap-2">
          <button className="rounded-md bg-gray-100 px-3 py-1" onClick={refetch}>
            Refresh
          </button>
          <button className="rounded-md bg-gray-900 text-white px-3 py-1" onClick={exportCSV}>
            Export CSV
          </button>
        </div>
      </div>

      {msg && <div className="rounded-md bg-green-100 p-2 text-green-800">{msg}</div>}

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left">Produk</th>
              <th className="p-2 text-right">HPP / porsi</th>
              <th className="p-2 text-right">Harga rekomendasi</th>
              <th className="p-2 text-right">Harga jual (user)</th>
              <th className="p-2 text-right">Profit / porsi</th>
              <th className="p-2 text-right">Margin %</th>
              <th className="p-2 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.produk_id} className="border-b">
                <td className="p-2">{r.nama_produk}</td>
                <td className="p-2 text-right">{fmt(r.hpp_total_per_porsi)}</td>
                <td className="p-2 text-right">{fmt(r.harga_rekomendasi)}</td>
                <td className="p-2 text-right">
                  <InlineNum
                    value={r.harga_jual_user ?? 0}
                    disabled={savingId === r.produk_id}
                    onSave={(v) => saveHarga(r, v)}
                  />
                </td>
                <td className="p-2 text-right">{fmt(r.profit_user_per_porsi)}</td>
                <td className="p-2 text-right">
                  <MarginBadge v={r.margin_user_persen} />
                </td>
                <td className="p-2 text-right">
                  <button
                    className="px-3 py-1 rounded-md bg-gray-100 hover:bg-gray-200"
                    onClick={refetch}
                    disabled={savingId === r.produk_id}
                  >
                    Refresh
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="p-2 text-center text-gray-500" colSpan={7}>
                  Belum ada data.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ========= Small components ========= */
function InlineNum({
  value, onSave, disabled
}: { value: number; onSave: (val: number) => void; disabled?: boolean; }) {
  const [v, setV] = useState(String(value));
  return (
    <div className="flex items-center gap-2 justify-end">
      <input
        type="number"
        className="w-28 rounded-md border px-2 py-1"
        value={v}
        disabled={disabled}
        onChange={(e) => setV(e.target.value)}
      />
      <button
        className="px-2 py-1 rounded-md bg-black text-white disabled:opacity-40"
        disabled={disabled}
        onClick={() => onSave(Number(v))}
      >
        Save
      </button>
    </div>
  );
}

function MarginBadge({ v }: { v: number | null | undefined }) {
  if (v == null) return <span>-</span>;
  const low = v < 20;
  const cls = low ? "text-red-600 font-semibold" : "text-green-700";
  return <span className={cls}>{v.toFixed(1)}%</span>;
}

/* ========= CSV helpers ========= */
function csvSafe(text: string) {
  // Bungkus jika ada koma/quote/linebreak
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}
function safeNum(n: number | null | undefined) {
  return n == null ? "" : String(n);
}
