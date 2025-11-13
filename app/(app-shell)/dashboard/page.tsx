'use client';

export const runtime = 'nodejs';

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { api } from '@/app/lib/api';

type MarginRow = { nama_produk: string; hpp: number; harga_jual: number; margin_pct: number; };
type LowStockRow = { bahan_nama: string; saldo_stok: number; satuan_dasar: string; };
type StockLog   = { bahan_nama: string; qty: number; type: 'in'|'out'; catatan?: string; };
type PromoRec   = { nama_produk: string; rekomendasi: string; alasan?: string; };
type Overview = {
  margin_top: MarginRow[]; margin_bottom: MarginRow[];
  low_stock: LowStockRow[]; recent_stock_in: StockLog[]; recent_stock_out: StockLog[];
  promo_recommendations: PromoRec[]; meta?: { low_stock_threshold?: number; recent_days?: number; generated_at?: string };
};

export default function DashboardPage() {
  const [ov, setOv] = useState<Overview|null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string|null>(null);
  const [ownerId, setOwnerId] = useState<string|undefined>(undefined);
  const [userName, setUserName] = useState<string>('User');
  const supabase = createClientComponentClient();

  const LOW_STOCK_PARAM = 20;

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const nm = data?.user?.user_metadata?.full_name || data?.user?.email || 'User';
      setUserName(nm.split('@')[0]);
    })();
  }, []);

  useEffect(() => {
    try {
      const ls = typeof window !== 'undefined' ? window.localStorage.getItem('owner_id') : null;
      if (ls) setOwnerId(ls); else setOwnerId('');
    } catch { setOwnerId(''); }
  }, []);

  async function load() {
    try {
      setLoading(true); setErr(null);
      const headers: any = {}; if (ownerId) headers['x-owner-id'] = ownerId;
      const r: any = await api(`/dashboard/overview?low_stock=${LOW_STOCK_PARAM}`, { headers });
      const d: Overview = r?.data ?? r;
      setOv({
        margin_top: Array.isArray(d?.margin_top) ? d.margin_top : [],
        margin_bottom: Array.isArray(d?.margin_bottom) ? d.margin_bottom : [],
        low_stock: Array.isArray(d?.low_stock) ? d.low_stock : [],
        recent_stock_in: Array.isArray(d?.recent_stock_in) ? d.recent_stock_in : [],
        recent_stock_out: Array.isArray(d?.recent_stock_out) ? d.recent_stock_out : [],
        promo_recommendations: Array.isArray(d?.promo_recommendations) ? d.promo_recommendations : [],
        meta: d?.meta ?? {}
      });
    } catch (e:any) {
      setErr(e?.message || 'Gagal memuat dashboard');
      setOv(null);
    } finally { setLoading(false); }
  }
  useEffect(() => { if (ownerId !== undefined) load(); }, [ownerId]);

  const marginAll: MarginRow[] = useMemo(() => (ov?.margin_top||[]).concat(ov?.margin_bottom||[]), [ov]);
  const totalProduk = marginAll.length;
  const avgMarginPct = useMemo(() =>
    marginAll.length ? Math.round((marginAll.reduce((s,r)=>s+(+r.margin_pct||0),0)/marginAll.length)*10)/10 : 0
  , [marginAll]);

return (
  <div className="mx-auto max-w-6xl px-6 py-6 space-y-6 bg-neutral-50">
    {/* HEADER */}
    <h1 className="mt-2 md:mt-4 text-2xl md:text-3xl font-extrabold tracking-tight">
      Welcome Back <span className="underline decoration-4 decoration-[#b91c1c]">{userName}</span> 👋
    </h1>

      {/* KPI */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <KpiCard title={totalProduk.toLocaleString()} subtitle="Total Product" icon="box" />
        <KpiCard title={`${avgMarginPct}%`} subtitle="Rata Rata Margin (%)" icon="gauge" />
      </div>

      {err && <div className="text-red-600 text-sm">{err}</div>}

      {/* MARGIN TABLES */}
      <div className="grid lg:grid-cols-2 gap-5">
        <Section title="Produk Margin Tertinggi">
          <MiniTable
            cols={['Nama','HPP','Harga Jual','Margin']}
            rows={(ov?.margin_top||[]).map(m=>[
              m.nama_produk, rupiah(m.hpp), rupiah(m.harga_jual), `${fmtPct(m.margin_pct)}%`
            ])}
            marginIndex={3} top
          />
        </Section>
        <Section title="Produk Margin Terendah">
          <MiniTable
            cols={['Nama','HPP','Harga Jual','Margin']}
            rows={(ov?.margin_bottom||[]).map(m=>[
              m.nama_produk, rupiah(m.hpp), rupiah(m.harga_jual), `${fmtPct(m.margin_pct)}%`
            ])}
            marginIndex={3} low
          />
        </Section>
      </div>

      {/* PROMO */}
      <Section title="Rekomendasi Promo">
        {(ov?.promo_recommendations?.length||0)
          ? <MiniTable cols={['Nama','Rekomendasi','Alasan']}
              rows={(ov?.promo_recommendations||[]).map(p=>[p.nama_produk, p.rekomendasi, p.alasan||'-'])}/>
          : <Empty text="Belum ada rekomendasi promo."/>}
      </Section>

      {/* STOCK & MUTASI */}
      <div className="grid lg:grid-cols-2 gap-5">
        <Section title="Stok Rendah">
          {(ov?.low_stock?.length||0)
            ? <MiniTable cols={['Nama','Sisa Stock']}
                rows={(ov?.low_stock||[]).map(s=>[s.bahan_nama, `${num(s.saldo_stok)} ${s.satuan_dasar}`])}/>
            : <Empty text="Tidak ada bahan di bawah ambang batas."/>}
        </Section>

        <Section title="Mutasi Stok Terakhir">
          {((ov?.recent_stock_in?.length||0)+(ov?.recent_stock_out?.length||0))
            ? <MiniTable cols={['Nama','Mutasi','Sisa Stock','Tanggal']}
                rows={[
                  ...(ov?.recent_stock_in||[]).map(l=>[
                    l.bahan_nama, badge('IN', `${num(l.qty)} ↑`,'up'), '-', todayOr(l.catatan)
                  ]),
                  ...(ov?.recent_stock_out||[]).map(l=>[
                    l.bahan_nama, badge('OUT', `${num(l.qty)} ↓`,'down'), '-', todayOr(l.catatan)
                  ]),
                ]}/>
            : <Empty text="Belum ada mutasi 7 hari terakhir."/>}
        </Section>
      </div>
    </div>
  );
}

/* ===== UI PRIMITIVES ===== */
function KpiCard({ title, subtitle, icon }:{ title:string; subtitle:string; icon:'box'|'gauge' }) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm flex items-center justify-between">
      <div>
        <div className="text-3xl font-extrabold">{title}</div>
        <div className="text-xs md:text-sm text-[#b91c1c] font-semibold">{subtitle}</div>
      </div>
      <div className="w-9 h-9 rounded-lg border flex items-center justify-center">
        {icon==='box'
          ? <svg viewBox="0 0 24 24" className="w-5 h-5"><path d="M3 7l9-4 9 4-9 4-9-4zm0 4l9 4 9-4v6l-9 4-9-4v-6z" /></svg>
          : <svg viewBox="0 0 24 24" className="w-5 h-5"><path d="M12 4a8 8 0 100 16 8 8 0 000-16zm0 7a1 1 0 011 1v5h-2v-5a1 1 0 011-1z"/></svg>
        }
      </div>
    </div>
  );
}

function Section({ title, children, className }:{ title:string; children:ReactNode; className?:string }) {
  return (
    <div className={`rounded-2xl border p-4 bg-white shadow-sm ${className||''}`}>
      <div className="mb-2 font-semibold">{title}</div>
      {children}
    </div>
  );
}

function Empty({ text }:{ text:string }) {
  return <div className="text-sm text-gray-500">{text}</div>;
}

function MiniTable({
  cols, rows, marginIndex, top, low,
}:{
  cols:string[]; rows:(string|number|ReactNode)[][];
  marginIndex?:number; top?:boolean; low?:boolean;
}) {
  return (
    <div className="overflow-auto">
      <table className="w-full text-xs md:text-sm">
        <thead>
          <tr className="text-left text-[#b91c1c] border-b border-neutral-200">
            {cols.map((c,i)=><th key={i} className="py-2 pr-4">{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r,i)=>(
            <tr key={i} className="border-b last:border-0 border-neutral-200">
              {r.map((c,j)=>{
                const isMargin = marginIndex===j;
                const color =
                  isMargin && top ? 'text-green-600 font-medium' :
                  isMargin && low ? 'text-red-600 font-medium' : '';
                return <td key={j} className={`py-2 pr-4 ${color}`}>{c as any}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ===== helpers format ===== */
function rupiah(n?:number|null){ if(n==null||Number.isNaN(n)) return '-'; return 'Rp ' + new Intl.NumberFormat('id-ID').format(Math.round(n)); }
function num(n?:number|null){ if(n==null||Number.isNaN(n)) return '0'; return new Intl.NumberFormat('id-ID').format(n); }
function fmtPct(n?:number|null){ if(n==null||Number.isNaN(n)) return 0; return Math.round(n); }
function todayOr(t?:string){ return t||'-'; }
function badge(_label:'IN'|'OUT', text:string, dir:'up'|'down'){
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border
      ${dir==='up' ? 'border-green-500 text-green-700' : 'border-red-500 text-red-700'}`}>
      {text}
    </span>
  );
}
