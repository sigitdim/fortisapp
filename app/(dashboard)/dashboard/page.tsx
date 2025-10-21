// app/dashboard/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

/* ========= ENV ========= */
const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.fortislab.id";
const OWNER_ID = "f6269e9a-bc6d-4f8b-aa45-08affc769e5a";

/* ========= Types ========= */
type Produk = { id: string; nama: string; harga_jual_user?: number | null };
type HppResp = {
  ok: boolean;
  owner_id: string;
  produk_id: string;
  hpp: {
    bahan_per_porsi: number;
    overhead_per_porsi: number;
    tenaga_kerja_per_porsi: number;
  };
  note?: string;
  total_hpp?: number;
};
type Promo = {
  id: string;
  nama: string;
  aktif: boolean;
  start_date: string;
  end_date: string;
  type: string;
};

type Row = {
  produk_id: string;
  nama: string;
  hpp: number;
  harga: number;
  profit: number;
  margin: number; // 0..1
};

/* ========= Helpers ========= */
const h = {
  headers() {
    return {
      "Content-Type": "application/json",
      "x-owner-id": OWNER_ID,
    };
  },
  async get<T>(path: string): Promise<T> {
    const r = await fetch(`${API_URL}${path}`, { headers: h.headers(), cache: "no-store" });
    if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
    return r.json();
  },
};

const fmtRp = (n: number) =>
  n.toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

const todayISO = () => new Date().toISOString().slice(0, 10);
const inRange = (d: string, start: string, end: string) => d >= start && d <= end;

/* ========= Smart fetchers ========= */
async function fetchProduk(): Promise<Produk[]> {
  try {
    const j1 = await h.get<{ ok: boolean; data: Produk[] }>("/setup/produk");
    if (j1?.data) return j1.data;
    return [];
  } catch {
    try {
      const j2 = await h.get<{ ok: boolean; data: Produk[] }>("/produk");
      if (j2?.data) return j2.data;
    } catch {}
    return [];
  }
}

async function fetchPromos(): Promise<Promo[]> {
  try {
    const j = await h.get<{ ok: boolean; data: Promo[] }>("/promo");
    return j?.data || [];
  } catch {
    return [];
  }
}

async function fetchHpp(produk_id: string): Promise<number> {
  const j = await h.get<HppResp>(`/pricing/final?produk_id=${encodeURIComponent(produk_id)}`);
  // prefer total_hpp jika tersedia, fallback jumlah field
  const t =
    typeof j.total_hpp === "number"
      ? j.total_hpp
      : (j.hpp?.bahan_per_porsi || 0) + (j.hpp?.overhead_per_porsi || 0) + (j.hpp?.tenaga_kerja_per_porsi || 0);
  return t || 0;
}

/* ========= Component ========= */
export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [produk, setProduk] = useState<Produk[]>([]);
  const [promos, setPromos] = useState<Promo[]>([]);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const [pList, promoList] = await Promise.all([fetchProduk(), fetchPromos()]);

        // Ambil HPP setiap produk paralel
        const hpps = await Promise.all(
          pList.map(async (p) => {
            try {
              const hpp = await fetchHpp(p.id);
              return [p.id, hpp] as const;
            } catch {
              return [p.id, 0] as const;
            }
          })
        );
        const hppMap = new Map(hpps);

        // Build rows: harga_jual_user mungkin null -> 0 (biar kelihatan kritis)
        const rowsBuilt: Row[] = pList.map((p) => {
          const hpp = Number(hppMap.get(p.id) || 0);
          const harga = Number(p.harga_jual_user || 0);
          const profit = Math.max(0, harga - hpp);
          const margin = harga > 0 ? profit / harga : 0;
          return { produk_id: p.id, nama: p.nama, hpp, harga, profit, margin };
        });

        setProduk(pList);
        setPromos(promoList);
        setRows(rowsBuilt);
      } catch (e: any) {
        setErr(e?.message ?? "Gagal memuat dashboard");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const kpi = useMemo(() => {
    const countProduk = rows.length;
    const avgMargin = rows.length
      ? rows.reduce((a, b) => a + b.margin, 0) / rows.length
      : 0;
    const kritis = rows.filter((r) => r.margin < 0.2).length;

    const today = todayISO();
    const promoAktif = promos.filter(
      (p) => p.aktif && inRange(today, (p.start_date || "").slice(0, 10), (p.end_date || "").slice(0, 10))
    ).length;

    const totalProfit = rows.reduce((a, b) => a + b.profit, 0);

    return { countProduk, avgMargin, promoAktif, kritis, totalProfit };
  }, [rows, promos]);

  const topProduk = useMemo(
    () => [...rows].sort((a, b) => b.margin - a.margin).slice(0, 5),
    [rows]
  );
  const lowProduk = useMemo(
    () => rows.filter((r) => r.margin < 0.2).sort((a, b) => a.margin - b.margin).slice(0, 10),
    [rows]
  );

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="mt-2 text-sm text-gray-500">Memuat ringkasan…</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <span className="text-sm text-gray-500">
          {new Date().toLocaleString("id-ID")}
        </span>
      </header>

      {err && (
        <div className="rounded-lg border border-red-300 bg-red-50 text-red-800 px-4 py-3 text-sm">
          {String(err)}
        </div>
      )}

      {/* KPI Cards */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard title="Produk Aktif" value={kpi.countProduk.toString()} />
        <KpiCard title="Rata-rata Margin" value={(kpi.avgMargin * 100).toFixed(1) + "%"} />
        <KpiCard title="Promo Aktif" value={kpi.promoAktif.toString()} />
        <KpiCard title="Produk Kritis (<20%)" value={kpi.kritis.toString()} />
        <KpiCard title="Total Profit (display)" value={fmtRp(kpi.totalProfit)} />
      </section>

      {/* Grafik Margin per Produk */}
      <section className="rounded-2xl border p-4">
        <h2 className="text-lg font-semibold mb-3">Margin per Produk</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-gray-500">Belum ada data produk.</p>
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={rows.map((r) => ({ name: r.nama, marginPct: Number((r.margin * 100).toFixed(1)) }))}
                margin={{ top: 10, right: 20, bottom: 30, left: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-20} textAnchor="end" interval={0} height={60} />
                <YAxis unit="%" />
                <Tooltip formatter={(v: any) => `${v}%`} />
                <Bar dataKey="marginPct" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Top Produk */}
      <section className="rounded-2xl border p-4">
        <h2 className="text-lg font-semibold mb-3">Top Produk (by Margin)</h2>
        {topProduk.length === 0 ? (
          <p className="text-sm text-gray-500">Tidak ada data.</p>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-[680px] w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-3">Produk</th>
                  <th className="py-2 pr-3">HPP</th>
                  <th className="py-2 pr-3">Harga</th>
                  <th className="py-2 pr-3">Profit</th>
                  <th className="py-2 pr-3">Margin</th>
                </tr>
              </thead>
              <tbody>
                {topProduk.map((r) => (
                  <tr key={r.produk_id} className="border-b">
                    <td className="py-2 pr-3 font-medium">{r.nama}</td>
                    <td className="py-2 pr-3">{fmtRp(r.hpp)}</td>
                    <td className="py-2 pr-3">{fmtRp(r.harga)}</td>
                    <td className="py-2 pr-3">{fmtRp(r.profit)}</td>
                    <td className="py-2 pr-3">{(r.margin * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Produk Kritis */}
      <section className="rounded-2xl border p-4">
        <h2 className="text-lg font-semibold mb-3">Produk Kritis (Margin &lt; 20%)</h2>
        {lowProduk.length === 0 ? (
          <p className="text-sm text-gray-500">Tidak ada yang kritis 🎉</p>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-[680px] w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-3">Produk</th>
                  <th className="py-2 pr-3">HPP</th>
                  <th className="py-2 pr-3">Harga</th>
                  <th className="py-2 pr-3">Profit</th>
                  <th className="py-2 pr-3">Margin</th>
                </tr>
              </thead>
              <tbody>
                {lowProduk.map((r) => (
                  <tr key={r.produk_id} className="border-b">
                    <td className="py-2 pr-3 font-medium">{r.nama}</td>
                    <td className="py-2 pr-3">{fmtRp(r.hpp)}</td>
                    <td className="py-2 pr-3">{fmtRp(r.harga)}</td>
                    <td className="py-2 pr-3">{fmtRp(r.profit)}</td>
                    <td className="py-2 pr-3">{(r.margin * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

/* ========= UI bits ========= */
function KpiCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border p-4">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}
