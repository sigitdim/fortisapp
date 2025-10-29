"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

/* ================== ENV & Utils ================== */
const OWNER_ID = process.env.NEXT_PUBLIC_OWNER_ID || "";
const HIDE_NOTE = process.env.NEXT_PUBLIC_HIDE_BE_FALLBACK_NOTE === "1";

function rupiah(n?: number | null) {
  if (n == null || Number.isNaN(n)) return "-";
  try {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(n));
  } catch { return `Rp ${Math.round(Number(n)).toLocaleString("id-ID")}`; }
}
function persen(n?: number | null) {
  if (n == null || Number.isNaN(n)) return "-";
  const pct = Number(n) * 100;
  return `${pct.toFixed(pct % 1 === 0 ? 0 : 2)}%`;
}
type HppRow = {
  owner_id: string; produk_id: string; nama_produk: string;
  total_biaya_bahan: number; jumlah_bahan: number; hpp_per_porsi: number;
  harga_jual: number | null; margin_nominal: number | null; margin_pct: number | null;
};
type HppResp = { ok: boolean; data: HppRow[]; next_cursor?: string | null };
type AnalyticsResp = {
  ok: boolean;
  data: {
    total_hpp: number;
    avg_margin_pct: number;
    total_produk: number;
    total_transaksi: number;
    trend: any[];
    top_produk: { nama_produk: string; margin_pct: number; margin_nominal?: number | null; hpp?: number | null; harga_jual?: number | null }[];
  };
};

/* ============== Helpers (margin fallback) ============== */
function calcMarginPctRow(r: HppRow): number | null {
  if (typeof r.margin_pct === "number") return r.margin_pct;
  if (typeof r.hpp_per_porsi === "number" && typeof r.harga_jual === "number" && r.harga_jual > 0) {
    return (r.harga_jual - r.hpp_per_porsi) / r.harga_jual;
  }
  return null;
}
function calcMarginNominalRow(r: HppRow): number | null {
  if (typeof r.margin_nominal === "number") return r.margin_nominal;
  if (typeof r.hpp_per_porsi === "number" && typeof r.harga_jual === "number") {
    return r.harga_jual - r.hpp_per_porsi;
  }
  return null;
}

/* ============== Deep-link (query string) ============== */
function readQS() {
  if (typeof window === "undefined") return { top: 10, q: "" };
  const sp = new URLSearchParams(window.location.search);
  const top = sp.get("top") ? Math.max(1, Number(sp.get("top"))) : 10;
  const q = sp.get("q") || "";
  return { top, q };
}
function writeQS(state: { top: number; q: string }) {
  if (typeof window === "undefined") return;
  const sp = new URLSearchParams();
  if (state.top !== 10) sp.set("top", String(state.top));
  if (state.q) sp.set("q", state.q);
  const qs = sp.toString();
  const url = `${window.location.pathname}${qs ? `?${qs}` : ""}`;
  window.history.replaceState(null, "", url);
}

/* ================== Tiny UI helpers ================== */
function Btn(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className = "", ...rest } = props;
  return (
    <button
      {...rest}
      className={
        "inline-flex items-center gap-2 rounded-2xl px-4 py-2 border shadow-[0_1px_0_rgba(0,0,0,0.04)] hover:shadow transition " +
        "bg-white/80 backdrop-blur border-slate-200 " + className
      }
    />
  );
}
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-3xl border border-slate-200/80 bg-white/80 backdrop-blur shadow-sm ${className}`} >
      {children}
    </div>
  );
}
function Kpi({ title, value }: { title: string; value: string }) {
  return (
    <Card className="p-5 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none rounded-3xl ring-1 ring-inset ring-white/50"
           style={{ background: "radial-gradient(1200px 120px at 0% -10%, rgba(99,102,241,0.08), transparent)" }} />
      <div className="relative">
        <div className="text-[12px] tracking-wide text-slate-500">{title}</div>
        <div className="text-[22px] font-semibold mt-1">{value}</div>
      </div>
    </Card>
  );
}
function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-200/60 ${className}`} />;
}

/* ================== Page ================== */
export default function AnalyticsOwnerPage() {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [kpi, setKpi] = useState({
    total_hpp: 0, avg_margin_pct: 0, total_produk: 0, total_transaksi: 0,
  });
  const [top, setTop] = useState<{ name: string; margin_pct: number; margin_rp?: number | null; hpp?: number | null; jual?: number | null; }[]>([]);
  const [noteFallback, setNoteFallback] = useState(false);

  // UI states
  const init = readQS();
  const [limitTop, setLimitTop] = useState<number>(init.top);
  const [q, setQ] = useState<string>(init.q);

  useEffect(() => { writeQS({ top: limitTop, q }); }, [limitTop, q]);

  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => { void loadData(); }, [limitTop]);

  async function loadData() {
    if (!OWNER_ID) { setErrorMsg("NEXT_PUBLIC_OWNER_ID belum di-set."); setLoading(false); return; }
    setLoading(true); setErrorMsg(""); setNoteFallback(false);

    try {
      // 1) Ambil analytics owner
      const res = await fetch("/api/analytics/owner", {
        headers: { "x-owner-id": OWNER_ID },
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: AnalyticsResp = await res.json();
      if (!json.ok) throw new Error("Backend response not ok");

      setKpi({
        total_hpp: json.data.total_hpp ?? 0,
        avg_margin_pct: json.data.avg_margin_pct ?? 0,
        total_produk: json.data.total_produk ?? 0,
        total_transaksi: json.data.total_transaksi ?? 0,
      });

      let tops = (json.data.top_produk || [])
        .map((t) => ({
          name: t.nama_produk,
          margin_pct: (t.margin_pct ?? 0) * 100,
          margin_rp: t.margin_nominal ?? null,
          hpp: t.hpp ?? null,
          jual: t.harga_jual ?? null,
        }));

      // 2) Fallback ke /report/hpp jika kosong
      if (!tops.length) {
        setNoteFallback(true);
        const r = await fetch("/api/report/hpp?limit=500", {
          headers: { "x-owner-id": OWNER_ID },
          cache: "no-store",
        });
        if (r.ok) {
          const h: HppResp = await r.json();
          if (h.ok) {
            tops = h.data
              .map((row) => {
                const mp = calcMarginPctRow(row);
                return {
                  name: row.nama_produk || row.produk_id.slice(0, 6),
                  margin_pct: (mp ?? 0) * 100,
                  margin_rp: calcMarginNominalRow(row),
                  hpp: row.hpp_per_porsi,
                  jual: row.harga_jual,
                };
              })
              .filter((d) => !Number.isNaN(d.margin_pct))
              .sort((a, b) => b.margin_pct - a.margin_pct);
          }
        }
      }

      setTop(tops.slice(0, Math.max(1, limitTop)));
    } catch (e: any) {
      setErrorMsg(e?.message || "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }

  const filteredTop = useMemo(() => {
    if (!q) return top;
    const s = q.toLowerCase();
    return top.filter((t) => (t.name || "").toLowerCase().includes(s));
  }, [top, q]);

  /* ============== Downloads ============== */
  function downloadSVG() {
    const root = chartRef.current;
    const svg = root?.querySelector("svg");
    if (!svg) return;
    const xml = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `analytics_top_${Date.now()}.svg`; a.click();
    URL.revokeObjectURL(url);
  }
  function downloadPNG() {
    const root = chartRef.current;
    const svg = root?.querySelector("svg") as SVGSVGElement | null;
    if (!svg) return;
    const xml = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    const svg64 = btoa(unescape(encodeURIComponent(xml)));
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width; canvas.height = img.height;
      const ctx = canvas.getContext("2d"); if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url; a.download = `analytics_top_${Date.now()}.png`; a.click();
    };
    img.src = "data:image/svg+xml;base64," + svg64;
  }
  function exportCSV() {
    const headers = ["nama_produk", "margin_pct", "margin_nominal", "hpp", "harga_jual"];
    const lines = [headers.join(",")];
    filteredTop.forEach((t) => {
      lines.push([
        `"${(t.name || "").replace(/"/g, '""')}"`,
        String(t.margin_pct?.toFixed(2) ?? ""),
        String(t.margin_rp ?? ""),
        String(t.hpp ?? ""),
        String(t.jual ?? ""),
      ].join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `analytics_top_${new Date().toISOString().slice(0,19).replace(/[:T]/g,"-")}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_200px_at_10%_-10%,#e0e7ff_20%,transparent),radial-gradient(900px_200px_at_90%_-20%,#d1fae5_15%,transparent)]">
      {/* Header */}
      <section className="relative">
        <div className="max-w-7xl mx-auto px-6 pt-10 pb-6">
          <Card className="px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h1 className="text-[28px] md:text-[34px] font-extrabold tracking-tight">Owner Analytics</h1>
                <p className="text-sm text-slate-600">
                  Sumber <code>/analytics/owner</code> — Owner: <span className="font-medium">{OWNER_ID || "(ENV kosong)"}</span>
                </p>
              </div>
              <div className="hidden md:flex gap-2">
                <a href="/report/hpp"><Btn>Report HPP</Btn></a>
                <Btn onClick={downloadSVG}>Download SVG</Btn>
                <Btn onClick={downloadPNG}>Download PNG</Btn>
                <Btn onClick={()=>window.print()}>Print / PDF</Btn>
              </div>
            </div>
          </Card>

          {/* KPI */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            <Kpi title="Total HPP" value={rupiah(kpi.total_hpp)} />
            <Kpi title="Avg Margin %" value={persen(kpi.avg_margin_pct)} />
            <Kpi title="Total Produk" value={String(kpi.total_produk)} />
            <Kpi title="Total Transaksi" value={String(kpi.total_transaksi)} />
          </div>
        </div>
      </section>

      {/* Toolbar */}
      <div className="sticky top-0 z-20 border-b bg-white/80 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-3 flex flex-wrap gap-3 items-center justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Cari nama produk…" className="px-3 py-2 border rounded-2xl w-64 focus:outline-none focus:ring" />
            <select value={String(limitTop)} onChange={(e)=>setLimitTop(Number(e.target.value))} className="px-3 py-2 border rounded-2xl">
              {[5,10,15,20,30].map(n => <option key={n} value={n}>Top {n}</option>)}
            </select>
            <Btn onClick={()=>loadData()}>Refresh</Btn>
          </div>
          <div className="flex items-center gap-2">
            <Btn onClick={exportCSV}>Export CSV</Btn>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 space-y-6 py-6">
        {errorMsg && <div className="p-3 rounded-2xl border bg-red-50 text-red-700">{errorMsg}</div>}
        {!OWNER_ID && (<div className="p-3 rounded-2xl border bg-yellow-50">
          <strong>Perlu konfigurasi:</strong> isi <code>NEXT_PUBLIC_OWNER_ID</code>.
        </div>)}

        <Card className="p-4" >
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-lg">Top Produk — Margin %</h2>
            <span className="text-xs text-slate-500">{filteredTop.length} produk</span>
          </div>
          <div className="w-full h-72" ref={chartRef}>
            {loading ? <Skeleton className="h-full w-full rounded-2xl" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filteredTop}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" /><YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="margin_pct" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          {!HIDE_NOTE && noteFallback && (
            <p className="text-xs text-slate-500 mt-2">Data top produk menggunakan fallback dari <code>/report/hpp</code>.</p>
          )}
        </Card>
      </div>
    </div>
  );
}

/* ============== Tooltip ============== */
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0]?.payload || {};
  return (
    <div className="rounded-2xl border bg-white/95 backdrop-blur p-3 shadow text-sm">
      <div className="font-medium mb-1">{label}</div>
      <div className="space-y-0.5">
        <div><span className="text-slate-500">Margin %:</span> {(p.margin_pct)?.toFixed(2)}%</div>
        <div><span className="text-slate-500">Margin Rp:</span> {rupiah(p.margin_rp)}</div>
        <div><span className="text-slate-500">HPP:</span> {rupiah(p.hpp)}</div>
        <div><span className="text-slate-500">Harga Jual:</span> {p.jual==null? "-" : rupiah(p.jual)}</div>
      </div>
    </div>
  );
}
