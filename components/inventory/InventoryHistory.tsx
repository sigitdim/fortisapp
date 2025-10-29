"use client";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
// gunakan Recharts sesuai setup kita
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, AreaChart, Area } from "recharts";

type Log = {
  id: string;
  created_at: string;
  bahan_id: string;
  bahan_nama?: string;
  satuan?: string;
  qty: number;
  tipe: "in" | "out" | "adjust" | "void";
};

export default function InventoryHistory() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await apiFetch("/inventory/history?limit=200"); // siapkan di BE
        const list = Array.isArray(data) ? data : (data?.data ?? []);
        setLogs(list);
      } catch (e: any) {
        setErr(e.message || "Gagal memuat riwayat");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const series = useMemo(() => {
    // agregasi per tanggal (YYYY-MM-DD)
    const byDate: Record<string, { date: string; IN: number; OUT: number; ADJ: number; VOID: number }> = {};
    for (const l of logs) {
      const d = (l.created_at || "").slice(0, 10);
      if (!byDate[d]) byDate[d] = { date: d, IN: 0, OUT: 0, ADJ: 0, VOID: 0 };
      if (l.tipe === "in") byDate[d].IN += l.qty || 0;
      else if (l.tipe === "out") byDate[d].OUT += l.qty || 0;
      else if (l.tipe === "adjust") byDate[d].ADJ += l.qty || 0;
      else if (l.tipe === "void") byDate[d].VOID += l.qty || 0;
    }
    return Object.values(byDate).sort((a,b)=> a.date.localeCompare(b.date));
  }, [logs]);

  if (loading) return <div className="text-sm text-gray-500">Memuat riwayat…</div>;
  if (err) return <div className="text-sm text-red-600">Error: {err}</div>;
  if (!logs.length) return <div className="text-sm">Belum ada riwayat.</div>;

  return (
    <div className="space-y-3">
      <div className="text-lg font-semibold">Grafik Riwayat Stok</div>
      <div className="h-64 w-full rounded-xl border p-3">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="IN" />
            <Line type="monotone" dataKey="OUT" />
            <Line type="monotone" dataKey="ADJ" />
            <Line type="monotone" dataKey="VOID" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="h-64 w-full rounded-xl border p-3">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Area type="monotone" dataKey="IN" stackId="1" />
            <Area type="monotone" dataKey="OUT" stackId="1" />
            <Area type="monotone" dataKey="ADJ" stackId="1" />
            <Area type="monotone" dataKey="VOID" stackId="1" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
