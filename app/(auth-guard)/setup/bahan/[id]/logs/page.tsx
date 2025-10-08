// app/(auth-guard)/setup/bahan/[id]/logs/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

type Point = { t: string; y: number };
type LogsResp = { ok: boolean; count: number; series: Point[]; raw: unknown[] };

// UUID (case-insensitive)
const isUUID = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

const formatIDR = (n: number | null | undefined) =>
  n == null
    ? "-"
    : new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }).format(n);

export default function LogsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = decodeURIComponent(params?.id ?? "");

  const [hargaBaru, setHargaBaru] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<LogsResp | null>(null);

  const badId = !id || id === "[id]" || !isUUID(id);

  const parsedSeries = useMemo(() => {
    if (!data?.series) return [] as { x: string; y: number }[];
    return data.series.map((p) => ({
      x: new Date(p.t).toLocaleString("id-ID", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }),
      y: p.y,
    }));
  }, [data]);

  const latestPrice = useMemo(() => (data?.series?.length ? data.series[data.series.length - 1].y : null), [data]);

  async function fetchLogs() {
    if (badId) return;
    setErr(null);
    try {
      const r = await fetch(`/api/bahan/logs/${id}`, { cache: "no-store" });
      if (!r.ok) throw new Error(`GET logs failed: ${r.status}`);
      const j = (await r.json()) as LogsResp;
      setData(j);
    } catch (e: any) {
      setErr(e?.message || "Gagal memuat logs");
    }
  }

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function patchHarga() {
    setErr(null);
    if (badId) {
      setErr("Parameter ID tidak valid. Buka halaman ini dari tombol Logs di tabel.");
      return;
    }
    const num = Number(hargaBaru);
    if (!hargaBaru || Number.isNaN(num)) {
      setErr("Masukkan harga valid");
      return;
    }

    setLoading(true);
    try {
      const r = await fetch(`/api/bahan/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ harga_baru: num }),
      });
      if (!r.ok) throw new Error(`PATCH gagal (${r.status})`);
      setHargaBaru("");
      await fetchLogs();
    } catch (e: any) {
      setErr(e?.message || "Gagal PATCH harga");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => router.push("/setup/bahan")} className="text-sm underline">
          ← Kembali ke Bahan
        </button>
        {!badId && (
          <div className="text-sm text-neutral-600">
            ID: <code className="bg-neutral-100 px-2 py-0.5 rounded">{id}</code>
          </div>
        )}
      </div>

      <h1 className="text-2xl font-bold">
        Histori Harga Bahan — {badId ? "(ID tidak valid)" : formatIDR(latestPrice)}
      </h1>

      {badId && (
        <div className="mt-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">
          Halaman ini harus dibuka dari tombol <b>Logs</b> di tabel <code>/setup/bahan</code> supaya
          parameter <code>id</code> berisi UUID bahan. URL yang benar: <code>/setup/bahan/&lt;UUID&gt;/logs</code> (bukan <code>[id]</code>).
        </div>
      )}

      {/* Input PATCH */}
      <div className="mt-6 rounded-2xl border p-4">
        <div className="flex items-center justify-between">
          <div className="font-medium">Update harga cepat</div>
          <button onClick={fetchLogs} className="text-sm underline">Refresh</button>
        </div>
        <div className="flex gap-3 items-center max-w-md mt-2">
          <input
            className="flex-1 border rounded-xl px-3 py-2"
            placeholder="contoh: 32500"
            value={hargaBaru}
            onChange={(e) => setHargaBaru(e.target.value)}
            inputMode="numeric"
            disabled={badId}
          />
          <button
            onClick={patchHarga}
            disabled={loading || badId}
            className="px-4 py-2 rounded-xl bg-black text-white disabled:opacity-50"
          >
            {loading ? "Menyimpan…" : "PATCH harga"}
          </button>
        </div>
        <div className="text-xs text-neutral-500 mt-2">
          Endpoint proxy: <code>/api/bahan/{id || "[id]"}</code> (body: {"{ harga_baru: number }"})
        </div>
        {err && <div className="text-red-600 mt-3 text-sm">Error: {err}</div>}
      </div>

      {/* Chart */}
      <div className="mt-6 rounded-2xl border p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="font-medium">Grafik harga</div>
          <div className="text-sm text-neutral-500">Total titik: {data?.count ?? 0}</div>
        </div>
        {parsedSeries.length === 0 ? (
          <div className="text-sm text-neutral-500">Belum ada data.</div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={parsedSeries} margin={{ left: 12, right: 8, top: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="x" interval={parsedSeries.length > 8 ? 3 : 0} tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => new Intl.NumberFormat("id-ID").format(v as number)} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: any) => formatIDR(Number(v))} />
                <Line type="monotone" dataKey="y" dot strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* JSON preview */}
      <div className="mt-6 rounded-2xl border p-4">
        <div className="font-medium mb-3">JSON series</div>
        <pre className="text-xs bg-neutral-50 p-3 rounded-xl overflow-auto max-h-72">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    </div>
  );
}