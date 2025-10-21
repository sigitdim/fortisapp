// app/setup/bahan/[id]/logs/page.tsx
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

/* =========================
 *  ENV & CONSTANTS
 * ========================= */
const API = process.env.NEXT_PUBLIC_API_URL || "https://api.fortislab.id"; // fallback prod
const OWNER_ID =
  process.env.NEXT_PUBLIC_OWNER_ID ||
  "f6269e9a-bc6d-4f8b-aa45-08affc769e5a"; // fallback dev/test

/* =========================
 *  TYPES
 * ========================= */
type SeriesPoint = { t: string; y: number };

type LogsResponse = {
  ok: boolean;
  count: number;
  series: SeriesPoint[];
  raw: unknown[];
};

type PatchResp = {
  ok: boolean;
  bahan_id: string;
  harga_lama?: number | null;
  harga_baru?: number | null;
  affected_count?: number;
};

/* =========================
 *  UTILS
 * ========================= */
const isUUID = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

const fmtRupiah = (n?: number | null) =>
  typeof n === "number"
    ? new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(n)
    : "-";

/* =========================
 *  SMART FETCH HELPERS (Proxy dulu, Direct bila perlu)
 * ========================= */
async function getLogsSmart(id: string): Promise<LogsResponse> {
  // 1) coba proxy FE → /api/bahan/:id/logs
  try {
    const r = await fetch(`/api/bahan/logs/${id}`, {
      headers: { "x-owner-id": OWNER_ID },
      cache: "no-store",
    });
    if (r.ok) return (await r.json()) as LogsResponse;
  } catch {}

  // 2) fallback direct ke BE
  const r2 = await fetch(`${API}/bahan/logs/${id}`, {
    headers: { "x-owner-id": OWNER_ID },
    cache: "no-store",
  });
  if (!r2.ok) throw new Error(`GET logs failed: ${r2.status}`);
  return (await r2.json()) as LogsResponse;
}

async function patchHargaSmart(id: string, hargaBaru: number, changedBy: string) {
  // 1) coba proxy FE → /api/bahan/:id
  try {
    const r = await fetch(`/api/bahan/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-owner-id": OWNER_ID,
      },
      body: JSON.stringify({ harga_baru: hargaBaru, changed_by: changedBy }),
    });
    if (r.ok) return (await r.json()) as PatchResp;
  } catch {}

  // 2) fallback direct ke BE
  const r2 = await fetch(`${API}/bahan/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "x-owner-id": OWNER_ID,
    },
    body: JSON.stringify({ harga_baru: hargaBaru, changed_by: changedBy }),
  });
  if (!r2.ok) throw new Error(`PATCH failed: ${r2.status}`);
  return (await r2.json()) as PatchResp;
}

/* =========================
 *  PAGE COMPONENT
 * ========================= */
export default function BahanLogsPage() {
  const { id: rawId } = useParams<{ id: string }>();
  const router = useRouter();
  const id = decodeURIComponent(rawId || "");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [series, setSeries] = useState<SeriesPoint[]>([]);
  const [raw, setRaw] = useState<unknown[]>([]);

  const [hargaBaru, setHargaBaru] = useState<string>("");
  const [changedBy, setChangedBy] = useState<string>("manual-test");
  const [lastPatch, setLastPatch] = useState<PatchResp | null>(null);

  // harga terakhir dari series
  const hargaTerakhir = useMemo(() => {
    if (!series?.length) return null;
    return series[series.length - 1]?.y ?? null;
  }, [series]);

  useEffect(() => {
    if (!id) return;
    if (!isUUID(id)) {
      setErr("Param :id bukan UUID valid. Cek URL kamu.");
      return;
    }
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function refresh() {
    setLoading(true);
    setErr(null);
    try {
      const data = await getLogsSmart(id);
      setSeries(data.series || []);
      setRaw(data.raw || []);
    } catch (e: any) {
      setErr(e?.message || "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }

  async function onPatchHarga() {
    const n = Number(hargaBaru);
    if (!Number.isFinite(n) || n <= 0) {
      setErr("Harga baru harus angka > 0");
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const resp = await patchHargaSmart(id, n, changedBy);
      setLastPatch(resp);
      await refresh();
      setHargaBaru("");
    } catch (e: any) {
      setErr(e?.message || "Gagal update harga");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Histori Harga Bahan</h1>
        <button
          onClick={refresh}
          className="px-3 py-2 rounded-xl border text-sm hover:bg-gray-50"
          disabled={loading}
        >
          {loading ? "Memuat…" : "Refresh"}
        </button>
      </div>

      {/* Info ID + Owner */}
      <div className="text-sm text-gray-600">
        <div>
          <span className="font-medium">Bahan ID:</span> {id}
        </div>
        <div>
          <span className="font-medium">x-owner-id:</span> {OWNER_ID}
        </div>
      </div>

      {/* Alert Error */}
      {err && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">
          {err}
        </div>
      )}

      {/* Harga Terakhir */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border p-4">
          <div className="text-sm text-gray-500">Harga Terakhir</div>
          <div className="text-2xl font-bold">{fmtRupiah(hargaTerakhir)}</div>
        </div>
        <div className="rounded-2xl border p-4">
          <div className="text-sm text-gray-500">Total Titik Log</div>
          <div className="text-2xl font-bold">{series?.length ?? 0}</div>
        </div>
        <div className="rounded-2xl border p-4">
          <div className="text-sm text-gray-500">Endpoint</div>
          <div className="text-xs break-all">{API}</div>
        </div>
      </div>

      {/* Chart */}
      <div className="rounded-2xl border p-4">
        <div className="mb-3 font-medium">Grafik Histori Harga</div>
        <div className="h-72 w-full">
          <ResponsiveContainer>
            <LineChart data={series} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="t" tick={{ fontSize: 12 }} minTickGap={24} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: any) => fmtRupiah(Number(v))} />
              <Line type="monotone" dataKey="y" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* PATCH Form */}
      <div className="rounded-2xl border p-4 space-y-3">
        <div className="font-medium">Update Harga Bahan (PATCH /bahan/:id)</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            value={hargaBaru}
            onChange={(e) => setHargaBaru(e.target.value)}
            placeholder="Harga baru (angka)"
            className="border rounded-xl px-3 py-2"
            inputMode="numeric"
          />
          <input
            value={changedBy}
            onChange={(e) => setChangedBy(e.target.value)}
            placeholder="changed_by (bebas: uuid / teks)"
            className="border rounded-xl px-3 py-2"
          />
          <button
            onClick={onPatchHarga}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-black text-white hover:opacity-90"
          >
            {loading ? "Memproses…" : "Kirim PATCH"}
          </button>
        </div>
        {lastPatch && (
          <div className="text-sm text-gray-700">
            <div className="font-mono">{JSON.stringify(lastPatch)}</div>
          </div>
        )}
      </div>

      {/* Raw Table (optional quick inspect) */}
      <div className="rounded-2xl border p-4">
        <div className="mb-3 font-medium">Raw Logs (debug)</div>
        <pre className="text-xs bg-gray-50 p-3 rounded-xl overflow-auto max-h-64">
          {JSON.stringify(raw, null, 2)}
        </pre>
      </div>
    </div>
  );
}
