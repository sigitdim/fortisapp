"use client";

import { useEffect, useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, BarChart, Bar } from "recharts";

/* ===== ENV ===== */
const OWNER_ID = process.env.NEXT_PUBLIC_OWNER_ID || "";
const REPORT_HPP_PATH = process.env.NEXT_PUBLIC_REPORT_HPP_PATH || "/report/hpp";
const HEALTH_PATH = process.env.NEXT_PUBLIC_HEALTH_PATH || "/health";
const VERSION_PATH = process.env.NEXT_PUBLIC_VERSION_PATH || "/version";

/* ===== utils ===== */
function cx(...cls:(string|boolean|undefined)[]){return cls.filter(Boolean).join(" ");}
const num=(v:any)=>v==null?undefined:typeof v==="number"?v:(Number(String(v).replace(/[^\d\.\-]/g,""))||undefined);
const pct=(v:any)=>{const n=num(v);if(n==null)return;return n>1?n/100:n;}
const toRp=(n?:number)=>typeof n==="number"?`Rp ${n.toLocaleString("id-ID")}`:"Rp -";
const toPct=(n?:number)=>typeof n==="number"?`${(n*100).toFixed(1)}%`:"-";
function downloadJSON(filename:string,data:unknown){const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=Object.assign(document.createElement("a"),{href:url,download:filename});document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);}
function downloadCSV(filename:string,rows:Record<string,any>[]) {if(!rows?.length)return;const headers=Object.keys(rows[0]);const csv=[headers.join(","),...rows.map(r=>headers.map(h=>{const v=r[h]??"";const s=typeof v==="string"?v.replace(/"/g,'""'):String(v);return `"${s}"`;}).join(","))].join("\n");const blob=new Blob([csv],{type:"text/csv;charset=utf-8;"});const url=URL.createObjectURL(blob);const a=Object.assign(document.createElement("a"),{href:url,download:filename});document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);}

/* ===== types ===== */
type HppRow={produk_id:string;produk:string;total_biaya_bahan:number;jumlah_bahan:number;hpp_per_porsi?:number;harga_jual?:number;margin_nominal?:number;margin_pct?:number;tanggal?:string;};
type HppApiResp={ok?:boolean;data?:any[];message?:string}|any;
type AnalyticsData={total_hpp?:number;avg_margin_pct?:number;total_produk?:number;total_transaksi?:number;trend?:{tanggal:string;margin_pct_avg:number}[];top_produk?:{produk:string;margin_pct?:number;margin_nominal?:number}[];[k:string]:any;};

/* ===== normalizer HPP ===== */
function normRow(x:any):HppRow|null{
  if(!x) return null;
  const produk_id=x.produk_id||x.product_id||x.id||"";
  const produk=x.nama_produk??x.produk??x.nama??x.name??"-";
  const total_biaya_bahan=num(x.total_biaya_bahan)??0;
  const jumlah_bahan=Number(x.jumlah_bahan??0);
  const hpp_per_porsi=num(x.hpp_per_porsi)??num(x.hpp)??undefined;
  const harga_jual=num(x.harga_jual)??undefined;
  let margin_nominal=num(x.margin_nominal);
  if(margin_nominal==null&&hpp_per_porsi!=null&&harga_jual!=null) margin_nominal=harga_jual-hpp_per_porsi;
  const margin_pct=pct(x.margin_pct);
  const tanggal=x.tanggal??x.date??undefined;
  return {produk_id:String(produk_id||produk),produk:String(produk||"-"),total_biaya_bahan,jumlah_bahan,hpp_per_porsi,harga_jual,margin_nominal,margin_pct,tanggal};
}

/* ===== Health badge ===== */
function HealthBadge(){
  const [status,setStatus]=useState<"ok"|"down"|"loading">("loading");
  const [version,setVersion]=useState<string|undefined>();
  async function ping(){try{const[h,v]=await Promise.all([fetch(`/api${HEALTH_PATH}`,{cache:"no-store"}).then(r=>r.json()).catch(()=>null),fetch(`/api${VERSION_PATH}`,{cache:"no-store"}).then(r=>r.json()).catch(()=>null)]);setStatus(h?.ok?"ok":"down");setVersion(v?.version||v?.data?.version);}catch{setStatus("down");}}
  useEffect(()=>{ping();const t=setInterval(ping,5*60*1000);return()=>clearInterval(t);},[]);
  const chip=status==="loading"?"bg-gray-200 text-gray-700":status==="ok"?"bg-emerald-100 text-emerald-700 border border-emerald-300":"bg-red-100 text-red-700 border border-red-300";
  return <div className={`px-3 py-1 rounded-xl text-xs ${chip}`}>API: {status==="ok"?"✅":status==="loading"?"…":"❌"} {version?`v${version}`:""}</div>;
}

/* ===== Page ===== */
export default function ReportsPage(){
  const [tab,setTab]=useState<"hpp"|"analytics">("hpp");
  return(
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Dashboard Reports</h1>
        <div className="flex items-center gap-3">
          <HealthBadge/>
          <div className="inline-flex rounded-2xl border overflow-hidden">
            <button className={cx("px-4 py-2 text-sm",tab==="hpp"&&"bg-black text-white")} onClick={()=>setTab("hpp")}>HPP</button>
            <button className={cx("px-4 py-2 text-sm",tab==="analytics"&&"bg-black text-white")} onClick={()=>setTab("analytics")}>Analytics</button>
          </div>
        </div>
      </div>
      {tab==="hpp"?<HppTab/>:<AnalyticsSection/>}
    </div>
  );
}

/* ===== HPP Tab ===== */
function HppTab(){
  const [rows,setRows]=useState<HppRow[]>([]);
  const [loading,setLoading]=useState(true);
  const [status,setStatus]=useState<string>("fetching…");
  const [limit,setLimit]=useState(100);
  const [q,setQ]=useState("");

  useEffect(()=>{(async()=>{try{
    setLoading(true); setStatus("fetching…");
    const url=`/api${REPORT_HPP_PATH}?limit=${limit}`;
    const res=await fetch(url,{headers:{"x-owner-id":OWNER_ID,"Content-Type":"application/json"},cache:"no-store"});
    const json=await res.json() as HppApiResp;
    if(!res.ok||!json) throw new Error(json?.message||"Gagal memuat");
    const arr=Array.isArray(json.data)?json.data:[];
    setRows(arr.map(normRow).filter(Boolean) as HppRow[]);
    const pretty=url.startsWith("/api")?url.slice(4):url;
    setStatus(`OK via ${pretty} • Rows: ${arr.length}`);
  }catch(e:any){ setStatus(e.message||"error"); } finally{ setLoading(false);} })();},[limit]);

  const filtered=useMemo(()=> q? rows.filter(r=>r.produk.toLowerCase().includes(q.toLowerCase())):rows,[rows,q]);

  return(
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Cari produk…" className="border px-3 py-2 rounded-xl"/>
        <select value={String(limit)} onChange={e=>setLimit(Number(e.target.value))} className="border px-3 py-2 rounded-xl">
          <option value="50">50</option><option value="100">100</option><option value="250">250</option>
        </select>
        <div className="ml-auto text-xs text-gray-500">{status}</div>
        <button onClick={()=>downloadCSV(`hpp_${Date.now()}.csv`,filtered as any)} className="px-3 py-2 rounded-xl border">Export CSV</button>
        <button onClick={()=>downloadJSON(`hpp_${Date.now()}.json`,filtered)} className="px-3 py-2 rounded-xl border">Export JSON</button>
      </div>

      <div className="border rounded-2xl overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider">Nama Produk</th>
              <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider">Total Biaya Bahan</th>
              <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider">Jumlah Bahan</th>
              <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider">HPP/Porsi</th>
              <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider">Margin %</th>
            </tr>
          </thead>
          <tbody>
            {loading?Array.from({length:8}).map((_,i)=><SkeletonRow key={i}/>):
              filtered.map(r=>(
                <tr key={r.produk_id} className="border-t">
                  <td className="p-3 font-medium">{r.produk}</td>
                  <td className="p-3">{toRp(r.total_biaya_bahan)}</td>
                  <td className="p-3">{r.jumlah_bahan}</td>
                  <td className="p-3">{r.hpp_per_porsi!=null?toRp(r.hpp_per_porsi):"Rp -"}</td>
                  <td className="p-3">{toPct(r.margin_pct)}</td>
                </tr>
              ))
            }
            {!loading && filtered.length===0 && (<tr><td colSpan={5} className="p-6 text-center text-gray-500">Tidak ada data.</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SkeletonRow(){return(
  <tr className="animate-pulse">
    <td className="p-3"><div className="h-4 w-40 bg-gray-200 rounded"/></td>
    <td className="p-3"><div className="h-4 w-24 bg-gray-200 rounded"/></td>
    <td className="p-3"><div className="h-4 w-16 bg-gray-200 rounded"/></td>
    <td className="p-3"><div className="h-4 w-16 bg-gray-200 rounded"/></td>
    <td className="p-3"><div className="h-4 w-16 bg-gray-200 rounded"/></td>
  </tr>
);}

/* ===== Analytics Tab (aktif) ===== */
function AnalyticsSection(){
  const [since,setSince]=useState("7d");
  const [status,setStatus]=useState("fetching…");
  const [data,setData]=useState<AnalyticsData>({});
  const [trend,setTrend]=useState<{tanggal:string;margin_pct_avg:number}[]>([]);
  const [top,setTop]=useState<{produk:string;margin_pct?:number;margin_nominal?:number}[]>([]);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{(async()=>{
    try{
      setLoading(true);
      const paths=[`/api/analytics/owner?since=${encodeURIComponent(since)}`,`/api/analytics/overview?since=${encodeURIComponent(since)}`,`/api/analytics/owner`];
      let j:any=null, ok=false, used="";
      for(const u of paths){
        const res=await fetch(u,{headers:{"x-owner-id":OWNER_ID,"Content-Type":"application/json"},cache:"no-store"});
        const jj=await res.json().catch(()=>null);
        if(res.ok && jj){ j=jj; ok=true; used=u; break; }
      }
      if(!ok || !j){ setStatus("endpoint analytics belum tersedia"); setData({}); setTrend([]); setTop([]); setLoading(false); return; }

      const d:any=j.data ?? j;
      const payload:AnalyticsData = {
        total_hpp: num(d.total_hpp ?? d.sum_hpp ?? d.hpp_total) ?? 0,
        avg_margin_pct: pct(d.avg_margin_pct ?? d.margin_avg ?? d.margin_persen_avg ?? d.avg_margin_percent),
        total_produk: num(d.total_produk ?? d.produk_count ?? d.count_produk),
        total_transaksi: num(d.total_transaksi ?? d.tx_count ?? d.orders),
        trend: Array.isArray(d.trend) ? d.trend.map((t:any)=>({tanggal:String(t.tanggal ?? t.date ?? t.day), margin_pct_avg: Number(pct(t.margin_pct_avg ?? t.avg_margin_pct ?? t.margin)) || 0})) : [],
        top_produk: Array.isArray(d.top_produk ?? d.topProducts) ? (d.top_produk ?? d.topProducts).map((x:any)=>({produk:String(x.produk ?? x.nama ?? x.name ?? x.product), margin_pct:pct(x.margin_pct ?? x.margin_persen ?? x.margin_percent), margin_nominal:num(x.margin_nominal ?? x.margin ?? x.profit)})) : []
      };
      setData(payload);
      setTrend(payload.trend || []);
      setTop((payload.top_produk || []).slice(0,10));
      const pretty = used.startsWith("/api") ? used.slice(4) : used;
      setStatus(`OK via ${pretty}`);
    }catch(e:any){
      setStatus(e.message||"Gagal memuat analytics");
      setData({}); setTrend([]); setTop([]);
    }finally{ setLoading(false); }
  })();},[since]);

  const kpi = (title:string, value:any)=>(
    <div className="rounded-2xl border p-4">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  );

  return(
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <select value={since} onChange={e=>setSince(e.target.value)} className="border px-3 py-2 rounded-xl">
          <option value="7d">7 hari</option><option value="14d">14 hari</option><option value="30d">30 hari</option><option value="90d">90 hari</option>
        </select>
        <div className="ml-auto text-xs text-gray-500">Status: {status}</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {kpi("Total HPP", toRp(data.total_hpp))}
        {kpi("Rata-rata Margin", toPct(data.avg_margin_pct))}
        {kpi("Total Produk", data.total_produk ?? "-")}
        {kpi("Total Transaksi", data.total_transaksi ?? "-")}
      </div>

      <div className="border rounded-2xl p-4">
        <div className="mb-2 font-medium">Tren Margin Rata-rata</div>
        <div className="w-full h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3"/>
              <XAxis dataKey="tanggal"/>
              <YAxis tickFormatter={(v)=> (v*100).toFixed(0)+"%"} />
              <Tooltip formatter={(v)=> (typeof v==="number" ? (v*100).toFixed(1)+"%" : v)} />
              <Line type="monotone" dataKey="margin_pct_avg" dot={false}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="border rounded-2xl p-4">
        <div className="mb-2 font-medium">Top Produk — Margin Tertinggi</div>
        <div className="w-full h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={top}>
              <CartesianGrid strokeDasharray="3 3"/>
              <XAxis dataKey="produk"/>
              <YAxis tickFormatter={(v)=> (v*100).toFixed(0)+"%"} />
              <Tooltip formatter={(v)=> (typeof v==="number" ? (v*100).toFixed(1)+"%" : v)} />
              <Bar dataKey="margin_pct"/>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 flex gap-2">
          <button onClick={()=>downloadCSV(`analytics_top_${since}.csv`, top as any)} className="px-3 py-2 rounded-xl border">Export CSV</button>
          <button onClick={()=>downloadJSON(`analytics_${since}.json`, {since, ...data})} className="px-3 py-2 rounded-xl border">Export JSON</button>
        </div>
      </div>
    </div>
  );
}
