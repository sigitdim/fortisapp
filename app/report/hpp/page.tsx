"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

/* ======== ENV & Utils ======== */
const OWNER_ID = process.env.NEXT_PUBLIC_OWNER_ID || "";
const DEFAULT_LIMIT = 100;

function rupiah(n?: number | null) {
  if (n == null || Number.isNaN(n)) return "-";
  try { return new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(Number(n)); }
  catch { return `Rp ${Math.round(Number(n)).toLocaleString("id-ID")}`; }
}
function persen(n?: number | null) {
  if (n == null || Number.isNaN(n)) return "-";
  const pct = Number(n) * 100; return `${pct.toFixed(pct % 1 === 0 ? 0 : 2)}%`;
}

/* ======== Types ======== */
type HppRow = {
  owner_id: string; produk_id: string; nama_produk: string;
  total_biaya_bahan: number; jumlah_bahan: number; hpp_per_porsi: number;
  harga_jual: number | null; margin_nominal: number | null; margin_pct: number | null;
};
type HppResp = { ok: boolean; data: HppRow[]; next_cursor?: string | null };

/* ======== Margin helpers ======== */
function calcMarginPct(r: HppRow): number | null {
  if (typeof r.margin_pct === "number") return r.margin_pct;
  if (typeof r.hpp_per_porsi === "number" && typeof r.harga_jual === "number" && r.harga_jual > 0) {
    return (r.harga_jual - r.hpp_per_porsi) / r.harga_jual;
  }
  return null;
}
function calcMarginNominal(r: HppRow): number | null {
  if (typeof r.margin_nominal === "number") return r.margin_nominal;
  if (typeof r.hpp_per_porsi === "number" && typeof r.harga_jual === "number") {
    return r.harga_jual - r.hpp_per_porsi;
  }
  return null;
}
function priceForTarget(hpp: number, targetPct: number) {
  const t = targetPct / 100; if (t >= 1) return null; return hpp / (1 - t);
}

/* ======== Pretty UI atoms ======== */
function Btn(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className="", ...rest } = props;
  return (
    <button
      {...rest}
      className={"inline-flex items-center gap-2 rounded-2xl px-4 py-2 border shadow-[0_1px_0_rgba(0,0,0,0.04)] hover:shadow transition bg-white/80 backdrop-blur border-slate-200 "+className}
    />
  );
}
function Card({ children, className="" }: {children:React.ReactNode; className?:string}) {
  return <div className={`rounded-3xl border border-slate-200/80 bg-white/80 backdrop-blur shadow-sm ${className}`}>{children}</div>;
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
function Skeleton({ className = "" }: { className?: string }) { return <div className={`animate-pulse bg-slate-200/60 ${className}`} />; }
function MarginChip({ value }: { value: number | null }) {
  if (value === null || Number.isNaN(value)) return <span className="text-slate-400">-</span>;
  const bad=value<0, ok=value>=0 && value<30, great=value>=30;
  const base="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium";
  return <span className={bad?`${base} bg-red-100 text-red-700`:ok?`${base} bg-amber-100 text-amber-700`:`${base} bg-emerald-100 text-emerald-700`}>{value.toFixed(2)}%</span>;
}

/* ======== Local Storage & QS ======== */
const LS_KEY = "report_hpp_ui_v5";
const saveUI = (v:any)=>{ try{localStorage.setItem(LS_KEY,JSON.stringify(v));}catch{} };
const loadUI = <T,>(fb:T):T => { try{const raw=localStorage.getItem(LS_KEY); return raw?{...fb,...JSON.parse(raw)}:fb;}catch{return fb;} };

function readQS() {
  if (typeof window === "undefined") return {};
  const sp = new URLSearchParams(window.location.search);
  const num = (k:string, d:any)=> sp.get(k)!=null ? Number(sp.get(k)) : d;
  const bool = (k:string, d:boolean)=> sp.get(k)!=null ? sp.get(k)==="1" : d;
  const obj:any = {
    q: sp.get("q") ?? "",
    statusMargin: sp.get("status") ?? "all",
    minMarginPct: num("minPct", -100),
    hppMin: sp.get("hppMin")!=null ? Number(sp.get("hppMin")) : "",
    hppMax: sp.get("hppMax")!=null ? Number(sp.get("hppMax")) : "",
    onlyNoPrice: bool("noPrice", false),
    limit: num("limit", DEFAULT_LIMIT),
    sortKey: (sp.get("sortKey") ?? "nama_produk"),
    sortDir: (sp.get("sortDir") ?? "asc"),
  };
  return obj;
}
function writeQS(state: {
  q:string; statusMargin:string; minMarginPct:number; hppMin:number|""; hppMax:number|""; onlyNoPrice:boolean; limit:number;
  sortKey:string; sortDir:string;
}) {
  if (typeof window === "undefined") return;
  const sp = new URLSearchParams();
  if (state.q) sp.set("q", state.q);
  if (state.statusMargin !== "all") sp.set("status", state.statusMargin);
  if (state.minMarginPct !== -100) sp.set("minPct", String(state.minMarginPct));
  if (state.hppMin !== "") sp.set("hppMin", String(state.hppMin));
  if (state.hppMax !== "") sp.set("hppMax", String(state.hppMax));
  if (state.onlyNoPrice) sp.set("noPrice","1");
  if (state.limit !== DEFAULT_LIMIT) sp.set("limit", String(state.limit));
  if (state.sortKey !== "nama_produk") sp.set("sortKey", state.sortKey);
  if (state.sortDir !== "asc") sp.set("sortDir", state.sortDir);
  const qs = sp.toString();
  const url = `${window.location.pathname}${qs?`?${qs}`:""}`;
  window.history.replaceState(null, "", url);
}

/* ======== Page ======== */
export default function ReportHppPage() {
  const [rows, setRows] = useState<HppRow[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // UI state
  const [q, setQ] = useState(""); const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [sortKey, setSortKey] = useState<keyof HppRow | "margin_score">("nama_produk");
  const [sortDir, setSortDir] = useState<"asc"|"desc">("asc");
  const [minMarginPct, setMinMarginPct] = useState<number>(-100);
  const [hppMin, setHppMin] = useState<number | "">("");
  const [hppMax, setHppMax] = useState<number | "">("");
  const [onlyNoPrice, setOnlyNoPrice] = useState(false);
  const [statusMargin, setStatusMargin] = useState<"all"|"minus"|"low"|"great">("all");
  const [showCols, setShowCols] = useState({
    jumlah_bahan:true, total_biaya_bahan:true, hpp_per_porsi:true,
    harga_jual:true, margin_nominal:true, margin_pct:true,
  });

  // AI Suggestions
  const [targetMargin, setTargetMargin] = useState<number>(30);
  const [openSuggest, setOpenSuggest] = useState<boolean>(false);

  // chart ref (download)
  const chartWrapRef = useRef<HTMLDivElement>(null);

  // Hydrate from QS/LS
  useEffect(()=> {
    const qs = readQS();
    const stored:any = loadUI({
      q,limit,sortKey,sortDir,minMarginPct,hppMin,hppMax,onlyNoPrice,statusMargin,showCols,targetMargin
    });
    const merge = { ...stored, ...qs };
    setQ(merge.q); setLimit(merge.limit);
    setSortKey(merge.sortKey); setSortDir(merge.sortDir);
    setMinMarginPct(merge.minMarginPct);
    setHppMin(merge.hppMin); setHppMax(merge.hppMax);
    setOnlyNoPrice(merge.onlyNoPrice);
    setStatusMargin(merge.statusMargin);
    setShowCols(merge.showCols);
    if (typeof merge.targetMargin === "number") setTargetMargin(merge.targetMargin);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  // Persist
  useEffect(()=>{ 
    const state = {q,limit,sortKey,sortDir,minMarginPct,hppMin,hppMax,onlyNoPrice,statusMargin,showCols,targetMargin};
    saveUI(state);
    writeQS({ 
      q,limit,sortKey:String(sortKey),sortDir,minMarginPct,
      hppMin,hppMax,onlyNoPrice,statusMargin
    });
  }, [q,limit,sortKey,sortDir,minMarginPct,hppMin,hppMax,onlyNoPrice,statusMargin,targetMargin,showCols]);

  useEffect(()=>{ void refresh(); },[]);

  async function fetchPage(cursor?: string | null, append=false){
    if (!OWNER_ID){ setErrorMsg("NEXT_PUBLIC_OWNER_ID belum di-set."); setLoading(false); return; }
    setLoading(true); setErrorMsg("");
    try{
      const url=new URL("/api/report/hpp", window.location.origin);
      url.searchParams.set("limit", String(limit||DEFAULT_LIMIT)); if(cursor) url.searchParams.set("cursor", cursor);
      const res=await fetch(url.toString(),{headers:{"x-owner-id":OWNER_ID},cache:"no-store"});
      if(!res.ok) throw new Error(`HTTP ${res.status}`);
      const json:HppResp=await res.json(); if(!json.ok) throw new Error("Backend response not ok");
      setRows(prev=>append?[...prev,...json.data]:json.data); setNextCursor(json.next_cursor??null);
    }catch(e:any){ setErrorMsg(e?.message||"Gagal memuat data"); } finally{ setLoading(false); }
  }
  async function refresh(){ setNextCursor(null); await fetchPage(null,false); }
  async function loadMore(){ if(!nextCursor) return; await fetchPage(nextCursor,true); }

  const filteredSorted = useMemo(()=>{
    const key = (sortKey==="margin_score"?"margin_pct":sortKey) as keyof HppRow;
    const data = rows.filter((r)=>{
      const m = calcMarginPct(r);
      const passSearch = !q || r.nama_produk?.toLowerCase().includes(q.toLowerCase()) || r.produk_id?.toLowerCase().includes(q.toLowerCase());
      const passMin = m==null ? (minMarginPct<=-100) : (m*100 >= (isNaN(minMarginPct)?-100:minMarginPct));
      const passPrice = onlyNoPrice ? r.harga_jual==null : true;
      const passHppMin = hppMin==="" ? true : (r.hpp_per_porsi??0) >= Number(hppMin);
      const passHppMax = hppMax==="" ? true : (r.hpp_per_porsi??0) <= Number(hppMax);
      const passStatus = (()=>{ const v=(m??0)*100;
        if(statusMargin==="all") return true; if(statusMargin==="minus") return v<0;
        if(statusMargin==="low") return v>=0 && v<30; return v>=30; })();
      return passSearch && passMin && passPrice && passHppMin && passHppMax && passStatus;
    });
    const sorted = [...data].sort((a,b)=>{
      const aa = key==="margin_pct" ? (calcMarginPct(a) ?? -Infinity) : ((a as any)[key] ?? -Infinity);
      const bb = key==="margin_pct" ? (calcMarginPct(b) ?? -Infinity) : ((b as any)[key] ?? -Infinity);
      if (typeof aa==="string" && typeof bb==="string") return sortDir==="asc"? aa.localeCompare(bb): bb.localeCompare(aa);
      const comp = Number(aa) - Number(bb); return sortDir==="asc"? comp : -comp;
    });
    return sorted;
  },[rows,q,sortKey,sortDir,minMarginPct,onlyNoPrice,hppMin,hppMax,statusMargin]);

  const chartData = useMemo(()=>(
    filteredSorted
      .map(r=>({ name: r.nama_produk || r.produk_id.slice(0,6), hpp:r.hpp_per_porsi, jual:r.harga_jual, margin_rp: calcMarginNominal(r) ?? 0, margin_pct: (calcMarginPct(r)??0)*100 }))
      .filter(d=>!Number.isNaN(d.margin_pct))
      .sort((a,b)=>b.margin_pct-a.margin_pct)
      .slice(0,20)
  ),[filteredSorted]);

  const distrib = useMemo(()=>{
    let minus=0, low=0, great=0;
    filteredSorted.forEach(r=>{ const v=(calcMarginPct(r)??0)*100;
      if(v<0) minus++; else if(v<30) low++; else great++;
    });
    return { minus, low, great, total: filteredSorted.length };
  },[filteredSorted]);

  const worst = useMemo(()=>{
    return [...filteredSorted]
      .map(r=>({ row:r, m:(calcMarginPct(r) ?? null) }))
      .filter(x=>x.m!==null)
      .sort((a,b)=>Number(a.m) - Number(b.m))
      .slice(0,5);
  },[filteredSorted]);

  function onChangeSort(k: keyof HppRow | "margin_score"){
    if (k===sortKey) setSortDir(d=>d==="asc"?"desc":"asc"); else { setSortKey(k); setSortDir("asc"); }
  }

  // Download
  function downloadChartSVG() {
    const svg = chartWrapRef.current?.querySelector("svg"); if (!svg) return;
    const xml = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `top_margin_chart_${Date.now()}.svg`; a.click();
    URL.revokeObjectURL(url);
  }
  function downloadChartPNG() {
    const svg = chartWrapRef.current?.querySelector("svg") as SVGSVGElement | null; if (!svg) return;
    const xml = new XMLSerializer().serializeToString(svg);
    const img = new Image(); const svg64 = btoa(unescape(encodeURIComponent(xml)));
    img.onload = () => {
      const canvas = document.createElement("canvas"); canvas.width = img.width; canvas.height = img.height;
      const ctx = canvas.getContext("2d"); if (!ctx) return; ctx.drawImage(img, 0, 0);
      const url = canvas.toDataURL("image/png"); const a = document.createElement("a");
      a.href = url; a.download = `top_margin_chart_${Date.now()}.png`; a.click();
    };
    img.src = "data:image/svg+xml;base64," + svg64;
  }

  function exportSuggestCSV() {
    const headers = ["produk_id","nama_produk","hpp_per_porsi","harga_jual","margin_pct_now","target_margin_pct","harga_saran"];
    const lines = [headers.join(",")];
    worst.forEach(({row, m})=>{
      const target = targetMargin;
      const saran = priceForTarget(row.hpp_per_porsi, target);
      const line = [
        row.produk_id,
        `"${(row.nama_produk||"").replace(/"/g,'""')}"`,
        String(row.hpp_per_porsi ?? ""),
        String(row.harga_jual ?? ""),
        String(m==null?"":(m*100).toFixed(2)),
        String(target),
        saran? Math.ceil(saran).toString() : ""
      ];
      lines.push(line.join(","));
    });
    const blob = new Blob([lines.join("\n")], { type:"text/csv;charset=utf-8;"});
    const url = URL.createObjectURL(blob); const a=document.createElement("a");
    a.href=url; a.download=`ai_suggestions_${Date.now()}.csv`; a.click(); URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_200px_at_10%_-10%,#e0e7ff_20%,transparent),radial-gradient(900px_200px_at_90%_-20%,#d1fae5_15%,transparent)]">
      {/* Header */}
      <section className="relative">
        <div className="max-w-7xl mx-auto px-6 pt-10 pb-6">
          <Card className="px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h1 className="text-[28px] md:text-[34px] font-extrabold tracking-tight">Report HPP Per Produk</h1>
                <p className="text-sm text-slate-600">Sumber <code>/report/hpp</code> — Owner: <span className="font-medium">{OWNER_ID||"(ENV kosong)"}</span></p>
              </div>
              <div className="hidden md:flex gap-2">
                <a href="/analytics"><Btn>Analytics</Btn></a>
                <Btn onClick={downloadChartSVG}>Download SVG</Btn>
                <Btn onClick={downloadChartPNG}>Download PNG</Btn>
                <Btn onClick={()=>window.print()}>Print / PDF</Btn>
              </div>
            </div>
          </Card>

          {/* KPI */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mt-4">
            <Kpi title="Produk (ditampilkan)" value={String(filteredSorted.length)} />
            <Kpi title="Total HPP (page)" value={rupiah(filteredSorted.reduce((s,r)=>s+(r.total_biaya_bahan||0),0))} />
            <Kpi title="Rerata Margin %" value={(() => {
              const vals = filteredSorted.map((r)=>calcMarginPct(r)).filter((v):v is number=>typeof v==="number");
              if (!vals.length) return "-"; const avg = vals.reduce((a,b)=>a+b,0)/vals.length; return persen(avg);
            })()} />
            <Kpi title="Ada Harga Jual" value={String(filteredSorted.filter(r=>!!r.harga_jual).length)} />
            <Kpi title="Margin Minus" value={String(distrib.minus)} />
            <Kpi title="Margin ≥30%" value={String(distrib.great)} />
          </div>
        </div>
      </section>

      {/* Toolbar */}
      <div className="sticky top-0 z-20 border-b bg-white/80 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-3 flex flex-wrap gap-3 items-center justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Cari nama / produk_id…" className="px-3 py-2 border rounded-2xl w-64 focus:outline-none focus:ring" />
            <select value={statusMargin} onChange={(e)=>setStatusMargin(e.target.value as any)} className="px-3 py-2 border rounded-2xl">
              <option value="all">Semua status margin</option><option value="minus">Margin Minus</option><option value="low">Margin Rendah (&lt;30%)</option><option value="great">Margin Bagus (≥30%)</option>
            </select>
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500">Min Margin %</label>
              <input type="number" value={minMarginPct} onChange={(e)=>setMinMarginPct(Number(e.target.value))} className="w-20 px-2 py-2 border rounded-2xl" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500">HPP</label>
              <input type="number" placeholder="min" value={hppMin} onChange={(e)=>setHppMin(e.target.value===""? "": Number(e.target.value))} className="w-24 px-2 py-2 border rounded-2xl" />
              <span className="text-slate-400">—</span>
              <input type="number" placeholder="max" value={hppMax} onChange={(e)=>setHppMax(e.target.value===""? "": Number(e.target.value))} className="w-24 px-2 py-2 border rounded-2xl" />
            </div>
            <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={onlyNoPrice} onChange={(e)=>setOnlyNoPrice(e.target.checked)} /><span>Tanpa Harga Jual</span></label>
            <select value={String(limit)} onChange={(e)=>setLimit(Number(e.target.value))} className="px-3 py-2 border rounded-2xl">
              {[50,100,200,300,500].map(n=><option key={n} value={n}>Limit {n}</option>)}
            </select>
            <Btn onClick={()=>{setNextCursor(null);fetchPage(null,false);}}>Terapkan</Btn>
          </div>

          <div className="flex items-center gap-2">
            <ColumnMenu show={showCols} setShow={setShowCols} />
            <ExportCsvButton rows={filteredSorted} />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 space-y-6 py-6">
        {errorMsg && <div className="p-3 rounded-2xl border bg-red-50 text-red-700">{errorMsg}</div>}
        {!OWNER_ID && (<div className="p-3 rounded-2xl border bg-yellow-50"><strong>Perlu konfigurasi:</strong> isi <code>NEXT_PUBLIC_OWNER_ID</code>.</div>)}

        {/* AI Suggestion */}
        <Card className="p-4 relative">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Saran Otomatis</h3>
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500">Target Margin %</label>
              <input type="number" value={targetMargin} onChange={(e)=>setTargetMargin(Number(e.target.value))} className="w-24 px-2 py-2 border rounded-2xl" />
              <Btn onClick={exportSuggestCSV}>Export Saran</Btn>
              <Btn onClick={()=>setOpenSuggest(v=>!v)}>{openSuggest ? "Tutup" : "Lihat"}</Btn>
            </div>
          </div>

          {openSuggest && (
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="p-2 text-left">Produk</th>
                    <th className="p-2 text-left">Margin % Now</th>
                    <th className="p-2 text-left">HPP</th>
                    <th className="p-2 text-left">Harga Jual</th>
                    <th className="p-2 text-left">Saran Harga (Target)</th>
                  </tr>
                </thead>
                <tbody>
                  {worst.map(({row, m})=>{
                    const saran = priceForTarget(row.hpp_per_porsi, targetMargin);
                    return (
                      <tr key={row.produk_id} className="border-t">
                        <td className="p-2">
                          <div className="font-medium">{row.nama_produk || "-"}</div>
                          <div className="text-[11px] text-slate-500">{row.produk_id}</div>
                        </td>
                        <td className="p-2">{m==null? "-" : `${(m*100).toFixed(2)}%`}</td>
                        <td className="p-2">{rupiah(row.hpp_per_porsi)}</td>
                        <td className="p-2">{row.harga_jual==null? "-" : rupiah(row.harga_jual)}</td>
                        <td className="p-2">{saran? rupiah(Math.ceil(saran)) : "-"}</td>
                      </tr>
                    );
                  })}
                  {worst.length===0 && (
                    <tr><td className="p-3 text-slate-500" colSpan={5}>Tidak ada data untuk disarankan.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Chart */}
        <Card className="p-4" >
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-lg">Top Margin % (maks 20 pertama)</h2>
            <span className="text-xs text-slate-500">{chartData.length} bar</span>
          </div>
          <div className="w-full h-64" ref={chartWrapRef}>
            {loading ? <Skeleton className="h-full w-full rounded-2xl" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" /><YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="margin_pct" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Table */}
        <Card className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr className="text-left">
                <Th label="Nama Produk" sortKey="nama_produk" activeKey={sortKey} dir={sortDir} onSort={onChangeSort} />
                {showCols.jumlah_bahan && <Th label="Jumlah Bahan" sortKey="jumlah_bahan" activeKey={sortKey} dir={sortDir} onSort={onChangeSort} />}
                {showCols.total_biaya_bahan && <Th label="Total Biaya Bahan" sortKey="total_biaya_bahan" activeKey={sortKey} dir={sortDir} onSort={onChangeSort} />}
                {showCols.hpp_per_porsi && <Th label="HPP / Porsi" sortKey="hpp_per_porsi" activeKey={sortKey} dir={sortDir} onSort={onChangeSort} />}
                {showCols.harga_jual && <Th label="Harga Jual" sortKey="harga_jual" activeKey={sortKey} dir={sortDir} onSort={onChangeSort} />}
                {showCols.margin_nominal && <Th label="Margin (Rp)" sortKey="margin_nominal" activeKey={sortKey} dir={sortDir} onSort={onChangeSort} />}
                {showCols.margin_pct && <Th label="Margin (%)" sortKey="margin_score" activeKey={sortKey} dir={sortDir} onSort={onChangeSort} />}
              </tr>
            </thead>
            <tbody>
              {loading ? Array.from({length:8}).map((_,i)=>(
                <tr key={i} className="border-t"><td colSpan={7} className="p-3"><Skeleton className="h-6 w-full rounded" /></td></tr>
              )) : (filteredSorted.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-slate-500">Tidak ada data yang cocok.</td></tr>
              ) : filteredSorted.map((r)=>(
                <tr key={r.produk_id} className="border-t hover:bg-slate-50 transition">
                  <td className="p-3">
                    <div className="font-medium">{r.nama_produk || "-"}</div>
                    <div className="text-[11px] text-slate-500">{r.produk_id}</div>
                  </td>
                  {showCols.jumlah_bahan && <td className="p-3">{r.jumlah_bahan ?? "-"}</td>}
                  {showCols.total_biaya_bahan && <td className="p-3">{rupiah(r.total_biaya_bahan)}</td>}
                  {showCols.hpp_per_porsi && <td className="p-3">{rupiah(r.hpp_per_porsi)}</td>}
                  {showCols.harga_jual && <td className="p-3">{r.harga_jual==null? "-" : rupiah(r.harga_jual)}</td>}
                  {showCols.margin_nominal && <td className="p-3">{calcMarginNominal(r)==null? "-" : rupiah(calcMarginNominal(r)!)}</td>}
                  {showCols.margin_pct && <td className="p-3"><MarginChip value={(calcMarginPct(r) ?? null) !== null ? (calcMarginPct(r)!*100) : null} /></td>}
                </tr>
              )))}
            </tbody>
          </table>
        </Card>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-600">{filteredSorted.length} item ditampilkan (dari {rows.length} dimuat)</div>
          <Btn onClick={loadMore} disabled={!nextCursor || loading} className="disabled:opacity-50">
            {nextCursor ? (loading ? "Memuat…" : "Muat Halaman Berikutnya") : "Tidak ada halaman berikutnya"}
          </Btn>
        </div>
      </div>
    </div>
  );
}

/* ======== Tooltip ======== */
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

/* ======== Table bits ======== */
function Th({ label, sortKey, activeKey, dir, onSort }:{
  label: string; sortKey: keyof HppRow | "margin_score"; activeKey: keyof HppRow | "margin_score"; dir:"asc"|"desc";
  onSort:(k:keyof HppRow|"margin_score")=>void;
}) {
  const active = activeKey===sortKey;
  return (
    <th className="p-3 font-medium whitespace-nowrap">
      <button type="button" className={`inline-flex items-center gap-1 ${active?"text-black":"text-slate-600"}`} onClick={()=>onSort(sortKey)} title="Urutkan">
        <span>{label}</span><span className="text-[10px]">{active?(dir==="asc"?"▲":"▼"):"↕"}</span>
      </button>
    </th>
  );
}
function ColumnMenu({ show, setShow }:{ show:any; setShow:(v:any)=>void }) {
  return (
    <div className="relative">
      <details>
        <summary className="list-none cursor-pointer rounded-2xl px-4 py-2 border hover:shadow transition bg-white/80 backdrop-blur">Kolom</summary>
        <div className="absolute right-0 mt-2 w-56 bg-white border rounded-2xl shadow-md p-3 z-10">
          {Object.keys(show).map((k)=>(
            <label key={k} className="flex items-center justify-between py-1 text-sm">
              <span>{k.replaceAll("_"," ")}</span>
              <input type="checkbox" checked={!!show[k]} onChange={(e)=>setShow({...show,[k]:e.target.checked})} />
            </label>
          ))}
        </div>
      </details>
    </div>
  );
}
function ExportCsvButton({ rows }: { rows: HppRow[] }) {
  function csvEscape(s?: string) {
    if (s == null) return "";
    const needs = s.includes(",") || s.includes('"') || s.includes("\n");
    let out = s.replace(/"/g, '""');
    return needs ? `"${out}"` : out;
  }
  function handle() {
    const headers = [
      "produk_id","nama_produk","jumlah_bahan","total_biaya_bahan",
      "hpp_per_porsi","harga_jual","margin_nominal","margin_pct"
    ];
    const lines = [headers.join(",")];
    rows.forEach((r) => {
      const marginNom =
        typeof r.margin_nominal === "number"
          ? r.margin_nominal
          : (typeof r.harga_jual === "number" && typeof r.hpp_per_porsi === "number"
              ? r.harga_jual - r.hpp_per_porsi
              : null);

      const marginPct =
        typeof r.margin_pct === "number"
          ? r.margin_pct
          : (typeof r.harga_jual === "number" && r.harga_jual > 0
              ? (r.harga_jual - (r.hpp_per_porsi ?? 0)) / r.harga_jual
              : null);

      const row = [
        r.produk_id,
        csvEscape(r.nama_produk),
        String(r.jumlah_bahan ?? ""),
        String(r.total_biaya_bahan ?? ""),
        String(r.hpp_per_porsi ?? ""),
        String(r.harga_jual ?? ""),
        String(marginNom ?? ""),
        String(marginPct ?? ""),
      ];
      lines.push(row.join(","));
    });

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report_hpp_${new Date().toISOString().slice(0,19).replace(/[:T]/g,"-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  return <Btn onClick={handle}>Export CSV</Btn>;
}
