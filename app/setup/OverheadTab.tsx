"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { toNum, rupiah } from "@/lib/num";

type OverheadItem = {
  id: string;
  nama: string;
  biaya_bulanan?: number | string | null;
  catatan?: string | null;
};

export default function OverheadTab() {
  const [rows, setRows] = useState<OverheadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      setErr(null);
      // BE bisa balikin { ok, data } atau langsung array — handle keduanya
      const res = await apiFetch("/setup/overhead");
      const list: OverheadItem[] = Array.isArray(res) ? res : (res?.data ?? []);
      setRows(list || []);
    } catch (e: any) {
      setErr(e?.message || "Gagal memuat overhead");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const total = useMemo(
    () => rows.reduce((sum, r) => sum + toNum(r.biaya_bulanan), 0),
    [rows]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xl font-semibold">Overhead Bulanan</div>
          <div className="text-sm text-gray-500">Total: <b>{rupiah(total)}</b></div>
        </div>
        <button
          onClick={load}
          className="rounded-xl border px-3 py-1 text-sm hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      {loading && <div className="text-sm text-gray-500">Memuat…</div>}
      {err && <div className="text-sm text-red-600">Error: {err}</div>}

      {!loading && !err && (
        <div className="rounded-xl border p-3 overflow-x-auto">
          <table className="min-w-[640px] w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2">Nama</th>
                <th className="py-2">Biaya / bulan</th>
                <th className="py-2">Catatan</th>
                <th className="py-2">ID</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td className="py-3 text-gray-500" colSpan={4}>Belum ada data overhead.</td></tr>
              ) : rows.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="py-2">{r.nama}</td>
                  <td className="py-2">{rupiah(toNum(r.biaya_bulanan))}</td>
                  <td className="py-2">{r.catatan ?? "-"}</td>
                  <td className="py-2 text-xs text-gray-500">{r.id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
