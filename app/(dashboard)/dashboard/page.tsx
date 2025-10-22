'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/app/lib/api';
import ExportCsvButton from '@/app/components/ExportCsvButton';
// Chart siap pakai jika mau dihidupkan:
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

type MarginRow = {
  nama_produk: string;
  hpp: number;
  harga_jual: number;
  margin_pct: number;
};

type LowStockRow = {
  bahan_nama: string;
  saldo_stok: number;
  satuan_dasar: string;
};

type StockLog = {
  bahan_nama: string;
  qty: number;
  type: 'in'|'out';
  catatan?: string;
};

type PromoRec = {
  nama_produk: string;
  rekomendasi: string;
  alasan?: string;
};

type Overview = {
  margin_top: MarginRow[];
  margin_bottom: MarginRow[];
  low_stock: LowStockRow[];
  recent_stock_in: StockLog[];
  recent_stock_out: StockLog[];
  promo_recommendations: PromoRec[];
  meta?: { low_stock_threshold?: number; recent_days?: number; generated_at?: string };
};

export default function DashboardPage(){
  const [ov, setOv] = useState<Overview|null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string|null>(null);
  const [ownerId, setOwnerId] = useState<string|undefined>(undefined);
  const lowStockParam = 20; // ganti bila perlu

  useEffect(()=>{
    try{
      const ls = typeof window !== 'undefined' ? window.localStorage.getItem('owner_id') : null;
      if (ls) setOwnerId(ls);
    }catch{}
  },[]);

  async function load(){
    try{
      setLoading(true); setErr(null);
      const headers:any = {};
      if (ownerId) headers['x-owner-id'] = ownerId;

      const r:any = await api(`/dashboard/overview?low_stock=${lowStockParam}`, { headers });
      const data:Overview = r?.data ?? r;
      const norm = {
        margin_top: Array.isArray((data as any)?.margin_top) ? data.margin_top : [],
        margin_bottom: Array.isArray((data as any)?.margin_bottom) ? data.margin_bottom : [],
        low_stock: Array.isArray((data as any)?.low_stock) ? data.low_stock : [],
        recent_stock_in: Array.isArray((data as any)?.recent_stock_in) ? data.recent_stock_in : [],
        recent_stock_out: Array.isArray((data as any)?.recent_stock_out) ? data.recent_stock_out : [],
        promo_recommendations: Array.isArray((data as any)?.promo_recommendations) ? data.promo_recommendations : [],
        meta: (data as any)?.meta ?? {}
      } as Overview;
      setOv(norm);
    }catch(e:any){
      setErr(e?.message || 'Gagal memuat dashboard');
      setOv(null);
    }finally{
      setLoading(false);
    }
  }

  useEffect(()=>{ if(ownerId!==undefined) load(); }, [ownerId]);

  const marginAll: MarginRow[] = useMemo(()=> (ov?.margin_top||[]).concat(ov?.margin_bottom||[]), [ov]);
  const totalProduk = marginAll.length;
  const avgMarginPct = useMemo(()=> marginAll.length ? Math.round( (marginAll.reduce((s,r)=>s+(+r.margin_pct||0),0)/marginAll.length) * 10)/10 : 0, [marginAll]);

  const exportRows = useMemo(()=>{
    return [
      ... (ov?.margin_top||[]).map(x=>({ section:'margin_top', ...x })),
      ... (ov?.margin_bottom||[]).map(x=>({ section:'margin_bottom', ...x })),
      ... (ov?.low_stock||[]).map(x=>({ section:'low_stock', ...x })),
      ... (ov?.recent_stock_in||[]).map(x=>({ section:'recent_stock_in', ...x })),
      ... (ov?.recent_stock_out||[]).map(x=>({ section:'recent_stock_out', ...x })),
      ... (ov?.promo_recommendations||[]).map(x=>({ section:'promo_recommendations', ...x })),
    ];
  }, [ov]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-2">
          <button onClick={load} className="px-3 py-2 rounded border hover:bg-gray-50 text-sm">
            {loading ? 'Loading…' : 'Refresh'}
          </button>
          <ExportCsvButton filename="dashboard_overview.csv" rows={exportRows}/>
        </div>
      </div>

      {err && <div className="text-red-600 text-sm">{err}</div>}
      {ov?.meta && (
        <div className="text-xs text-gray-500">
          low_stock threshold: {ov.meta.low_stock_threshold ?? 10} · recent_days: {ov.meta.recent_days ?? 7}
          {ov.meta.generated_at ? <> · generated: {new Date(ov.meta.generated_at).toLocaleString()}</> : null}
        </div>
      )}

      <div className="grid md:grid-cols-4 gap-4">
        <Card title="Total Produk (punya margin)" value={totalProduk.toLocaleString()} />
        <Card title="Rata-rata Margin (%)" value={`${avgMarginPct}%`} />
        <Card title="Low Stock" value={(ov?.low_stock?.length||0).toLocaleString()} />
        <Card title="Promo Rekomendasi" value={(ov?.promo_recommendations?.length||0).toLocaleString()} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Section title="Produk Margin Tertinggi">
          <MiniTable cols={['Produk','Harga Jual','Margin %']} rows={(ov?.margin_top||[]).map(m=>[
            m.nama_produk,
            (m.harga_jual||0).toLocaleString(),
            (Math.round((m.margin_pct||0)*10)/10)+'%'
          ])}/>
        </Section>

        <Section title="Produk Margin Terendah">
          <MiniTable cols={['Produk','Harga Jual','Margin %']} rows={(ov?.margin_bottom||[]).map(m=>[
            m.nama_produk,
            (m.harga_jual||0).toLocaleString(),
            (Math.round((m.margin_pct||0)*10)/10)+'%'
          ])}/>
        </Section>

        <Section title="Stok Rendah">
          { (ov?.low_stock?.length||0) ? (
            <MiniTable cols={['Bahan','Saldo','Satuan']} rows={(ov?.low_stock||[]).map(s=>[
              s.bahan_nama, (s.saldo_stok||0).toLocaleString(), s.satuan_dasar
            ])}/>
          ) : <Empty text="Tidak ada bahan di bawah ambang batas."/>}
        </Section>

        <Section title="Mutasi Stok Terbaru">
          { ((ov?.recent_stock_in?.length||0) + (ov?.recent_stock_out?.length||0)) ? (
            <MiniTable cols={['Bahan','Qty','Tipe','Catatan']} rows={
              [
                ...(ov?.recent_stock_in||[]).map(l=>[l.bahan_nama, (l.qty||0).toLocaleString(), 'IN', l.catatan||'-']),
                ...(ov?.recent_stock_out||[]).map(l=>[l.bahan_nama, (l.qty||0).toLocaleString(), 'OUT', l.catatan||'-']),
              ]
            }/>
          ) : <Empty text="Belum ada mutasi 7 hari terakhir."/>}
        </Section>

        <Section title="Rekomendasi Promo" className="lg:col-span-2">
          { (ov?.promo_recommendations?.length||0) ? (
            <MiniTable cols={['Produk','Rekomendasi','Alasan']} rows={(ov?.promo_recommendations||[]).map(p=>[
              p.nama_produk, p.rekomendasi, p.alasan || '-'
            ])}/>
          ) : <Empty text="Belum ada rekomendasi promo."/>}
        </Section>
      </div>

      {/* Slot chart jika dibutuhkan ke depan */}
      {/* 
      <div className="rounded-2xl border p-4">
        <div className="mb-2 font-semibold">Margin per Produk</div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={marginAll.slice(0,30)}>
              <XAxis dataKey="nama_produk" tick={{fontSize:12}} interval={0} angle={-20} height={70}/>
              <YAxis />
              <Tooltip />
              <Bar dataKey="margin_pct" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      */}
    </div>
  );
}

function Card({title,value}:{title:string; value:string}){
  return (
    <div className="rounded-2xl border p-4 bg-white">
      <div className="text-gray-500 text-sm">{title}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}

function Section({title, children, className}:{title:string; children:any; className?:string}){
  return (
    <div className={`rounded-2xl border p-4 bg-white ${className||''}`}>
      <div className="mb-2 font-semibold">{title}</div>
      {children}
    </div>
  );
}

function Empty({text}:{text:string}){ return <div className="text-sm text-gray-500">{text}</div>; }

function MiniTable({cols, rows}:{cols:string[]; rows:(string|number)[][]}){
  return (
    <div className="overflow-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500">
            {cols.map((c,i)=><th key={i} className="py-2 pr-4">{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r,i)=>(
            <tr key={i} className="border-t">
              {r.map((c,j)=><td key={j} className="py-2 pr-4">{c as any}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
