'use client';

import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LabelList,
} from 'recharts';
import { buildHeaders } from '@/lib/api';

type Row = {
  name: string;           // label sumbu X
  margin: number;         // dalam persen (0-100) atau 0-1? terserah sumber data, kita normalisasi
};

export default function AnalyticsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setErr(null);
        // Silakan ubah endpoint sesuai BE kamu; ini cuma placeholder aman.
        const res = await fetch('/api/dashboard/analytics', {
          headers: buildHeaders(),
          cache: 'no-store',
        });

        if (!res.ok) {
          // kalau endpoint ini belum ada, biarkan tanpa melempar error fatal
          setRows([]);
          return;
        }

        const json = await res.json().catch(() => []);
        // Normalisasi ke { name, margin }
        const mapped: Row[] = Array.isArray(json)
          ? json.map((r: any, i: number) => ({
              name: r?.name ?? r?.produk ?? `Item ${i + 1}`,
              // terima margin 0–1 atau 0–100 → ubah ke 0–100
              margin: normalizePercent(r?.margin ?? r?.margin_pct ?? r?.margin_user_persen),
            }))
          : [];

        if (alive) setRows(mapped);
      } catch (e: any) {
        if (alive) setErr(e?.message ?? 'Gagal memuat data');
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Analytics</h1>

      {err && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {err}
        </div>
      )}

      <div className="h-80 rounded-xl border p-3">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              formatter={(v: any, k: any) => {
                const n = Number(v);
                return [`${Number.isFinite(n) ? n.toFixed(1) : v}%`, k];
              }}
            />
            <Bar dataKey="margin" fill="#0ea5e9" isAnimationActive>
              <LabelList
                dataKey="margin"
                position="top"
                formatter={(v: any) => {
                  const n = Number(v ?? 0);
                  return `${Number.isFinite(n) ? n.toFixed(1) : 0}%`;
                }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** Terima input 0–1 atau 0–100 → pulangkan 0–100 */
function normalizePercent(raw: any): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0;
  if (n <= 1 && n >= 0) return n * 100;
  return n;
}
