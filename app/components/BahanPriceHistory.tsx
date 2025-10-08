"use client";

import { useEffect, useMemo, useState } from "react";
import { getJson } from "@/lib/api";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

type SeriesPoint = { t: string; y: number };
type LogsResponse = {
  ok: boolean;
  count: number;
  series: SeriesPoint[];
  raw: unknown[];
};

function formatDateLabel(iso: string) {
  // Tampilkan local (Asia/Jakarta) tanpa lib tambahan
  const d = new Date(iso);
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export default function BahanPriceHistory({ id }: { id: string }) {
  const [data, setData] = useState<LogsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    getJson<LogsResponse>(`/bahan/logs/${id}`)
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch((e: any) => {
        if (!cancelled) setErr(e?.message ?? "Gagal memuat data");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Siapkan data untuk grafik
  const chartData = useMemo(
    () =>
      (data?.series ?? []).map((p) => ({
        // Recharts enaknya pakai field biasa
        timeLabel: formatDateLabel(p.t),
        timeISO: p.t,
        harga: Number(p.y),
      })),
    [data?.series]
  );

  if (loading) return <div className="text-sm text-gray-500">Memuat grafik…</div>;
  if (err) return <div className="text-sm text-red-600">Error: {err}</div>;
  if (!data) return <div className="text-sm text-gray-500">Tidak ada data.</div>;

  return (
    <div className="space-y-6">
      {/* Tahap awal: tampilkan JSON apa adanya */}
      <div>
        <div className="font-semibold mb-2">Raw series (debug):</div>
        <pre className="rounded-xl bg-gray-900 text-gray-100 p-4 text-xs overflow-auto">
{JSON.stringify(data.series, null, 2)}
        </pre>
      </div>

      {/* Grafik line chart */}
      <div className="border rounded-2xl p-4">
        <div className="font-semibold mb-3">Grafik Harga Bahan</div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="timeLabel"
                tickMargin={8}
                minTickGap={24}
                angle={-10}
                height={50}
              />
              <YAxis
                dataKey="harga"
                tickFormatter={(v) =>
                  new Intl.NumberFormat("id-ID").format(Number(v))
                }
              />
              <Tooltip
                formatter={(value, name, _props) => {
                  if (name === "harga") {
                    return [
                      new Intl.NumberFormat("id-ID", {
                        style: "currency",
                        currency: "IDR",
                        maximumFractionDigits: 0,
                      }).format(Number(value)),
                      "Harga",
                    ];
                  }
                  return [value, name];
                }}
                labelFormatter={(label, payload) => {
                  const iso = payload?.[0]?.payload?.timeISO as string | undefined;
                  if (!iso) return label as string;
                  return new Intl.DateTimeFormat("id-ID", {
                    dateStyle: "full",
                    timeStyle: "short",
                  }).format(new Date(iso));
                }}
              />
              <Line
                type="monotone"
                dataKey="harga"
                dot={{ r: 3 }}
                strokeWidth={2}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
