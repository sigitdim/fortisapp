"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
} from "recharts";

type SeriesPoint = { t: string; y: number };
type LogsResponse = { ok: boolean; count: number; series: SeriesPoint[]; raw?: any[] };

const toIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(n);
const shortDate = (iso: string) =>
  new Date(iso).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export default function BahanLogsPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [data, setData] = useState<LogsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [raw, setRaw] = useState<string | null>(null); // debug: tampung body mentah
  const [showJSON, setShowJSON] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        setRaw(null);

        const res = await fetch(`/api/bahan/${id}/logs`, {
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        });

        const text = await res.text();
        setRaw(text); // simpan mentah buat debug

        if (!res.ok) throw new Error(`HTTP ${res.status} - ${text}`);

        const json: LogsResponse = JSON.parse(text);
        setData(json);
      } catch (e: any) {
        setErr(e?.message ?? "Gagal memuat data.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const chartData = useMemo(() => {
    if (!data?.series) return [];
    return data.series.map((p) => ({ t: p.t, y: p.y }));
  }, [data]);

  if (loading) return <div className="p-6">Loading…</div>;
  if (err)
    return (
      <div className="p-6">
        <div className="text-red-600 font-semibold">Error: {err}</div>
        {raw && (
          <pre className="mt-3 text-xs bg-gray-50 border rounded p-3 overflow-auto">{raw}</pre>
        )}
      </div>
    );

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Histori Harga Bahan</h1>
        <button className="rounded-md px-3 py-1 border" onClick={() => setShowJSON((s) => !s)}>
          {showJSON ? "Sembunyikan JSON" : "Tampilkan JSON"}
        </button>
      </div>

      <div className="text-sm text-gray-600">
        Total poin: <b>{data?.count ?? 0}</b>
      </div>

      {showJSON && (
        <pre className="text-xs bg-gray-50 border rounded p-3 overflow-auto">
{JSON.stringify(data?.series ?? [], null, 2)}
        </pre>
      )}

      <div className="h-80 w-full border rounded-lg p-2">
        {chartData.length === 0 ? (
          <div className="h-full grid place-items-center text-gray-500">Belum ada data.</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="t" tickFormatter={shortDate} minTickGap={24} />
              <YAxis tickFormatter={(v) => new Intl.NumberFormat("id-ID").format(v as number)} />
              <Tooltip formatter={(v: any) => [toIDR(v as number), "Harga"]} labelFormatter={(l: any) => shortDate(String(l))} />
              <Line type="monotone" dataKey="y" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
