"use client";
import React from "react";
import {
  LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") || "https://api.fortislab.id";
const OWNER_ID =
  process.env.NEXT_PUBLIC_OWNER_ID ||
  "f6269e9a-bc6d-4f8b-aa45-08affc769e5a";

type Props = {
  open: boolean;
  onClose: () => void;
  bahanId: string | null;
  nama?: string;
};

type TryResult = {
  ok: boolean;
  url: string;
  status?: number;
  message?: string;
  raw?: any;
};

type LogPoint = { t: string; harga: number };

export default function LogsBahanDrawer({ open, onClose, bahanId, nama }: Props) {
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string>("");
  const [diag, setDiag] = React.useState<TryResult[]>([]);
  const [data, setData] = React.useState<LogPoint[]>([]);
  const [priceText, setPriceText] = React.useState("");

  React.useEffect(() => {
    if (!open || !bahanId) return;
    (async () => {
      setLoading(true);
      setErr("");
      setDiag([]);
      setData([]);
      const tried: TryResult[] = [];
      const candidates = [
        `${API_BASE}/setup/bahan/${bahanId}/logs`,
        `${API_BASE}/bahan/${bahanId}/logs`,
        // FE proxy (kalau kamu punya app/api/bahan/[...parts] yang nerusin ke BE)
        `/api/bahan/${bahanId}/logs`,
      ];
      for (const url of candidates) {
        try {
          const res = await fetch(url, {
            headers: {
              "Content-Type": "application/json",
              "x-owner-id": OWNER_ID,
            },
            cache: "no-store",
          });
          if (!res.ok) {
            const text = await res.text();
            tried.push({ ok: false, url, status: res.status, message: text?.slice(0, 500) });
            continue;
          }
          const json = await res.json();
          tried.push({ ok: true, url, raw: json });

          const arr = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];
          const norm: LogPoint[] = arr
            .map((it: any) => {
              const t =
                it.ts || it.created_at || it.tanggal || it.time || it.logged_at || null;
              const harga =
                it.harga ?? it.harga_per_satuan ?? it.price ?? it.nilai ?? null;
              if (!t || harga == null) return null;
              const d = new Date(t);
              if (isNaN(d.getTime())) return null;
              const n = Number(harga);
              if (isNaN(n)) return null;
              return { t: d.toISOString(), harga: n };
            })
            .filter(Boolean) as LogPoint[];

          if (norm.length > 0) {
            // urutkan biar grafik rapi
            norm.sort((a, b) => a.t.localeCompare(b.t));
            setData(norm);
            setDiag(tried);
            setLoading(false);
            return;
          }
        } catch (e: any) {
          tried.push({ ok: false, url, message: e?.message?.slice(0, 500) });
        }
      }
      setDiag(tried);
      setErr("Logs belum bisa dimuat dari server.");
      setLoading(false);
    })();
  }, [open, bahanId]);

  async function quickUpdate() {
    if (!bahanId) return;
    const n = Number(priceText);
    if (isNaN(n) || n < 0) {
      alert("Harga tidak valid");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/setup/bahan/${bahanId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-owner-id": OWNER_ID,
        },
        body: JSON.stringify({ harga_per_satuan: n }),
      });
      if (!res.ok) throw new Error(await res.text());
      alert("Harga diperbarui.");
    } catch (e: any) {
      alert(`Gagal update harga: ${e?.message || e}`);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-[480px] max-w-[95vw] bg-white shadow-2xl p-5 overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-xl font-semibold">Logs Bahan</h2>
            <p className="text-sm text-gray-500">{nama || bahanId}</p>
          </div>
          <button className="px-3 py-1.5 rounded-lg border" onClick={onClose}>Close</button>
        </div>

        {err ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-sm text-yellow-700 mb-3">
            {err} Fitur update harga tetap bisa dipakai.
          </div>
        ) : null}

        <details className="rounded-xl border p-3 mb-3">
          <summary className="cursor-pointer font-medium">Diagnosa endpoint yang dicoba</summary>
          <div className="mt-2 space-y-2 text-xs">
            {diag.map((d, i) => (
              <div key={i} className="p-2 rounded-lg bg-gray-50">
                <div><b>URL:</b> {d.url}</div>
                <div><b>OK:</b> {String(d.ok)} {d.status ? `(status ${d.status})` : ""}</div>
                {d.message ? <div><b>Msg:</b> {d.message}</div> : null}
                {d.raw ? <pre className="overflow-auto max-h-40">{JSON.stringify(d.raw, null, 2)}</pre> : null}
              </div>
            ))}
          </div>
        </details>

        <div className="rounded-xl border p-3 mb-3">
          <h3 className="font-semibold mb-1">Grafik Harga dari Logs</h3>
          {loading ? (
            <div className="text-sm text-gray-500">Memuat…</div>
          ) : data.length === 0 ? (
            <div className="text-sm text-gray-500">Belum ada data log.</div>
          ) : (
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer>
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="t"
                    tickFormatter={(v) => new Date(v).toLocaleDateString("id-ID")}
                  />
                  <YAxis />
                  <Tooltip
                    labelFormatter={(v) =>
                      new Date(v as string).toLocaleString("id-ID")
                    }
                    formatter={(val) => [`Rp ${new Intl.NumberFormat("id-ID").format(Number(val))}`, "Harga"]}
                  />
                  <Line type="monotone" dataKey="harga" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="rounded-xl border p-3">
          <h3 className="font-semibold mb-2">Update Harga Cepat</h3>
          <div className="flex gap-2">
            <input
              className="flex-1 px-3 py-2 rounded-xl border"
              value={priceText}
              onChange={(e) => setPriceText(e.target.value.replace(/[^\d.]/g, ""))}
              placeholder="30000"
              inputMode="numeric"
            />
            <button className="px-3 py-2 rounded-xl bg-black text-white" onClick={quickUpdate}>
              Simpan
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Harga diperbarui via PUT /setup/bahan/:id (fallback POST upsert jika BE mengizinkan).
          </p>
        </div>
      </div>
    </div>
  );
}

