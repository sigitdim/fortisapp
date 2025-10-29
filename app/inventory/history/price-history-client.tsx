'use client'
"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.fortislab.id";
const OWNER_ID = process.env.NEXT_PUBLIC_OWNER_ID || "";

type LogItem = {
  id: string;
  created_at: string;
  bahan_id: string;
  bahan_nama?: string;
  satuan?: string;
  harga_lama?: number;
  harga_baru?: number;
  changed_by?: string;
};

export default function PriceHistoryClient() {
  const sp = useSearchParams();
  const router = useRouter();
  const bahanId = sp?.get("bahan_id") || "";

  const [rows, setRows] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function fetchLogs(cursor?: string) {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      qs.set("limit", "200");
      if (bahanId) qs.set("bahan_id", bahanId);
      if (cursor) qs.set("cursor", cursor);

      const res = await fetch(`${API_URL}/inventory/history?${qs.toString()}`, {
        headers: { "x-owner-id": OWNER_ID },
        cache: "no-store",
      });
      const json = await res.json();
      if (json?.ok) {
        setRows((prev) => (cursor ? [...prev, ...json.data] : json.data));
        setNextCursor(json.next_cursor || null);
      } else {
        setRows([]);
        setNextCursor(null);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus log harga ini?")) return;
    setDeleting(id);
    try {
      const res = await fetch(`${API_URL}/inventory/history/${id}`, {
        method: "DELETE",
        headers: { "x-owner-id": OWNER_ID },
      });
      const json = await res.json();
      if (json?.ok) setRows((prev) => prev.filter((r) => r.id !== id));
    } finally {
      setDeleting(null);
    }
  }

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bahanId]);

  const chartData = useMemo(() => {
    const sorted = [...rows].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    return sorted.map((x) => ({
      t: new Date(x.created_at).toLocaleString("id-ID"),
      harga: Number(x.harga_baru ?? 0),
    }));
  }, [rows]);

  const title = rows[0]?.bahan_nama
    ? `Riwayat Harga • ${rows[0].bahan_nama}`
    : "Riwayat Harga";

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{title}</h1>
        <button
          onClick={() => router.push("/inventory?tab=history")}
          className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          ← Kembali ke Inventory
        </button>
      </div>

      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        {chartData.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-500">
            Belum ada log harga untuk bahan/rentang ini.
          </div>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="t" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `Rp ${Number(v).toLocaleString("id-ID")}`} />
                <Tooltip
                  formatter={(v: any) => `Rp ${Number(v).toLocaleString("id-ID")}`}
                  labelClassName="text-xs"
                />
                <Line type="monotone" dataKey="harga" dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="rounded-2xl border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr className="border-b">
                <th className="px-4 py-3">Tanggal</th>
                <th className="px-4 py-3">Bahan</th>
                <th className="px-4 py-3">Satuan</th>
                <th className="px-4 py-3">Harga Lama</th>
                <th className="px-4 py-3">Harga Baru</th>
                <th className="px-4 py-3">Changed By</th>
                <th className="px-4 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-gray-500">
                    Tidak ada data log harga.
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="border-b hover:bg-gray-50/60">
                  <td className="px-4 py-3">
                    {new Date(r.created_at).toLocaleString("id-ID")}
                  </td>
                  <td className="px-4 py-3">{r.bahan_nama || r.bahan_id}</td>
                  <td className="px-4 py-3">{r.satuan || "-"}</td>
                  <td className="px-4 py-3">Rp {Number(r.harga_lama ?? 0).toLocaleString("id-ID")}</td>
                  <td className="px-4 py-3">Rp {Number(r.harga_baru ?? 0).toLocaleString("id-ID")}</td>
                  <td className="px-4 py-3">{r.changed_by || "-"}</td>
                  <td className="px-4 py-3">
                    <button
                      className="rounded-lg border border-red-500 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                      onClick={() => handleDelete(r.id)}
                      disabled={deleting === r.id}
                    >
                      {deleting === r.id ? "Menghapus..." : "Delete"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-center gap-3 p-4">
          {loading && <span className="text-sm text-gray-500">Memuat…</span>}
          {!loading && nextCursor && (
            <button
              className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50"
              onClick={() => fetchLogs(nextCursor!)}
            >
              Muat Lebih Banyak
            </button>
          )}
          {!loading && !nextCursor && rows.length > 0 && (
            <span className="text-sm text-gray-400">Tidak ada data lagi</span>
          )}
        </div>
      </div>
    </div>
  );
}
