// @ts-nocheck
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, Legend,
} from 'recharts';

const OWNER_ID = process.env.NEXT_PUBLIC_OWNER_ID || '';
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';
const api = (p:string)=> (API_BASE ? `${API_BASE}${p}` : p);

type SummaryItem = { bahan_id:string; bahan_nama?:string; saldo:number; satuan?:string; status?:string };
type LogItem = {
  id:string; created_at:string; bahan_id:string; qty:number; tipe:'in'|'out'|'adjust'|'void';
  is_void:boolean; catatan?:string|null; saldo_before?:number; saldo_after?:number;
  bahan_nama?:string; satuan?:string;
};

async function fetchJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', 'x-owner-id': OWNER_ID, ...(options.headers||{}) },
    cache: 'no-store',
  });
  const j = await res.json().catch(()=> ({}));
  if (!res.ok || (j && typeof j==='object' && 'ok' in j && (j as any).ok===false)) {
    throw new Error((j as any)?.message || res.statusText || 'Request failed');
  }
  return ((j as any)?.data ?? j) as T;
}
const cn = (...a:(string|false|null|undefined)[])=>a.filter(Boolean).join(' ');
function Skeleton({className=''}:{className?:string}){return <div className={cn('animate-pulse rounded-lg bg-gray-100 dark:bg-slate-800',className)}/>}

function KPICard({label,value}:{label:string;value?:number}){
  return (<div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
    <div className="text-xs text-gray-500 dark:text-slate-400">{label}</div>
    {value===undefined ? <Skeleton className="h-6 w-16 mt-2"/> : <div className="text-2xl font-semibold mt-1">{value}</div>}
  </div>);
}

export function InventoryWidget(){
  const [loading,setLoading]=useState(true);
  const [err,setErr]=useState<string|null>(null);
  const [summary,setSummary]=useState<SummaryItem[]>([]);
  const [history,setHistory]=useState<LogItem[]>([]);
  const [lowThreshold,setLowThreshold]=useState<number>(5);

  const load=async()=>{
    setLoading(true); setErr(null);
    try{
      const sPayload = await fetchJson<any>(api(`/api/inventory/summary?t=${Date.now()}`));
      const sArr = Array.isArray(sPayload?.data)?sPayload.data:Array.isArray(sPayload)?sPayload:(sPayload?.items??[]);
      const sMapped:SummaryItem[] = sArr.map((x:any)=>({
        bahan_id: x.bahan_id ?? x.id ?? '',
        bahan_nama: x.bahan_nama ?? x.nama ?? '',
        saldo: Number(x.saldo ?? x.stok_total ?? 0),
        satuan: x.satuan ?? '-',
        status: x.status ?? undefined,
      })).filter(x=>x.bahan_id);
      setSummary(sMapped);

      const until=new Date(); const since=new Date(Date.now()-7*86400000);
      const q=new URLSearchParams({since: since.toISOString(), until: until.toISOString(), limit:'200'});
      const hPayload=await fetchJson<any>(api(`/api/inventory/history?${q.toString()}&t=${Date.now()}`));
      const hArr = Array.isArray(hPayload?.data)?hPayload.data:Array.isArray(hPayload)?hPayload:(hPayload?.items??[]);
      setHistory(hArr);
    }catch(e:any){ setErr(e.message||'Gagal memuat data inventory'); }
    finally{ setLoading(false); }
  };

  useEffect(()=>{ load(); },[]);
  useEffect(()=>{
    const h = ()=>load();
    window.addEventListener('inv:summary-reload', h as any);
    return ()=>window.removeEventListener('inv:summary-reload', h as any);
  },[]);

  const lowStock = useMemo(()=>{
    const lows = summary.filter(i=> (i.status?.toLowerCase?.()==='low') || (i.saldo<=lowThreshold));
    return lows.sort((a,b)=>a.saldo-b.saldo).slice(0,10);
  },[summary,lowThreshold]);

  const flowData = useMemo(()=>{
    const rows = history.filter(r=>!r.is_void).sort((a,b)=>+new Date(a.created_at)-+new Date(b.created_at));
    return rows.map(r=>({
      t:new Date(r.created_at).toLocaleString(),
      IN:  (r.tipe==='in' ? r.qty : (r.tipe==='adjust'&&r.qty>0? Math.abs(r.qty):0)),
      OUT: (r.tipe==='out'? -Math.abs(r.qty) : (r.tipe==='adjust'&&r.qty<0? -Math.abs(r.qty):0)),
    }));
  },[history]);

  const latestMutation = useMemo(()=> {
    return [...history].sort((a,b)=>+new Date(b.created_at)-+new Date(a.created_at)).slice(0,8);
  },[history]);

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl md:text-2xl font-semibold">Inventory Snapshot</h2>
        <button className="px-3 py-2 rounded-xl border dark:border-slate-700" onClick={load}>Refresh</button>
      </div>

      {err && <div className="mb-3 text-sm text-rose-600">{err}</div>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <KPICard label="Jumlah Bahan" value={loading?undefined:summary.length}/>
        <KPICard label="Total Stok" value={loading?undefined:summary.reduce((a,b)=>a+(b.saldo||0),0)}/>
        <KPICard label="Low Stock" value={loading?undefined:lowStock.length}/>
        <KPICard label="Mutasi (7 hari)" value={loading?undefined:history.length}/>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Low Stock */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-lg font-semibold">Stok Rendah</div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 dark:text-slate-400">Ambang</label>
              <input type="number" min={0} value={lowThreshold}
                onChange={e=>setLowThreshold(Number(e.target.value||0))}
                className="w-20 px-2 py-1 rounded-lg border dark:border-slate-700 bg-white dark:bg-slate-900"/>
            </div>
          </div>
          {loading ? <Skeleton className="h-24"/> : (
            lowStock.length===0 ? <div className="text-sm text-gray-500 dark:text-slate-400">Tidak ada bahan di bawah ambang batas.</div> :
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead><tr className="text-left text-gray-500 dark:text-slate-400">
                  <th className="py-2 pr-3">Bahan</th><th className="py-2 px-3">Saldo</th><th className="py-2 px-3">Satuan</th>
                </tr></thead>
                <tbody>
                  {lowStock.map(b=>(
                    <tr key={b.bahan_id} className="border-t dark:border-slate-700">
                      <td className="py-2 pr-3 font-medium">{b.bahan_nama||b.bahan_id}</td>
                      <td className="py-2 px-3">{b.saldo}</td>
                      <td className="py-2 px-3">{b.satuan||'-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Mutasi 7 hari */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
          <div className="text-lg font-semibold mb-2">Mutasi Stok (7 Hari)</div>
          {loading ? <Skeleton className="h-48"/> : (
            flowData.length ? (
              <div className="h-56 mb-3">
                <ResponsiveContainer>
                  <AreaChart data={flowData} margin={{left:8,right:8,top:10,bottom:0}}>
                    <defs>
                      <linearGradient id="gIN" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.6}/><stop offset="95%" stopColor="#10b981" stopOpacity={0.05}/></linearGradient>
                      <linearGradient id="gOUT" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.6}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0.05}/></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="t" hide/><YAxis/><Tooltip/><Legend/>
                    <Area type="monotone" dataKey="IN" stroke="#10b981" fill="url(#gIN)"/>
                    <Area type="monotone" dataKey="OUT" stroke="#ef4444" fill="url(#gOUT)"/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : <div className="text-sm text-gray-500 dark:text-slate-400">Belum ada mutasi 7 hari terakhir.</div>
          )}

          {!loading && latestMutation.length>0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 dark:text-slate-400">
                    <th className="py-2 pr-3">Waktu</th><th className="py-2 px-3">Bahan</th><th className="py-2 px-3">Qty</th>
                    <th className="py-2 px-3">Tipe</th><th className="py-2 px-3">Catatan</th><th className="py-2 px-3">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {latestMutation.map(r=>{
                    const delta = (r.saldo_before!=null&&r.saldo_after!=null) ? (r.saldo_after-r.saldo_before) : null;
                    return (
                      <tr key={r.id} className="border-t dark:border-slate-700">
                        <td className="py-2 pr-3">{new Date(r.created_at).toLocaleString()}</td>
                        <td className="py-2 px-3">{r.bahan_nama||r.bahan_id}</td>
                        <td className={cn('py-2 px-3', r.tipe==='in'?'text-emerald-600':r.tipe==='out'?'text-rose-600':'text-gray-700')}>
                          {r.tipe==='out' ? '-' : r.tipe==='adjust' ? (r.qty>=0?'+':'-') : '+'}{Math.abs(r.qty)} {r.satuan||''}
                        </td>
                        <td className="py-2 px-3">{r.tipe}</td>
                        <td className="py-2 px-3">{r.catatan||'-'}</td>
                        <td className="py-2 px-3">
                          {r.saldo_before!=null&&r.saldo_after!=null ? `${r.saldo_before} → ${r.saldo_after}${delta!=null?` (${delta>0?'+':''}${delta})`:''}` : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
