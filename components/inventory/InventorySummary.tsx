"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type Summary = { bahan_id: string; bahan_nama?: string; satuan?: string; saldo?: number };

export default function InventorySummary() {
  const [rows, setRows] = useState<Summary[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        // BE endpoint ringkasan stok final (via proxy):
        const data = await apiFetch("/inventory/summary");
        // terima bentuk { ok:boolean, data: Summary[] } atau langsung array:
        const list = Array.isArray(data) ? data : (data?.data ?? []);
        setRows(list);
      } catch (e: any) {
        setErr(e.message || "Gagal memuat ringkasan");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="text-sm text-gray-500">Memuat ringkasan stok…</div>;
  if (err) return <div className="text-sm text-red-600">Error: {err}</div>;
  if (!rows.length) return <div className="text-sm">Belum ada data stok.</div>;

  return (
    <div className="space-y-2">
      <div className="text-lg font-semibold">Ringkasan Stok</div>
      <div className="rounded-xl border p-3 overflow-x-auto">
        <table className="min-w-[600px] w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2">Bahan</th>
              <th className="py-2">Saldo</th>
              <th className="py-2">Satuan</th>
              <th className="py-2">ID</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.bahan_id} className="border-b last:border-0">
                <td className="py-2">{r.bahan_nama ?? r.bahan_id}</td>
                <td className="py-2">{r.saldo ?? 0}</td>
                <td className="py-2">{r.satuan ?? "-"}</td>
                <td className="py-2 text-xs text-gray-500">{r.bahan_id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
