'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export type HppItem = {
  produk_id: string;
  produk_nama: string;
  kategori?: string | null;
  hpp_total_per_porsi?: number | null;
  rekomendasi_harga?: number | null;
  margin_user_persen?: number | null;
};

export type BomRow = {
  bahan_nama: string;
  qty: number;
  unit: string;
  subtotal: number;
};

const OWNER_ID = process.env.NEXT_PUBLIC_OWNER_ID || '';
const rupiah = (n: number | null | undefined) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);

async function getJSON<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { headers: { 'x-owner-id': OWNER_ID }, signal, cache: 'no-store' });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(txt || `HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
function toCSV(rows: Record<string, any>[], headers?: string[]) {
  if (!rows || !rows.length) return '';
  const keys = headers ?? Object.keys(rows[0]);
  const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [keys.join(','), ...rows.map(r => keys.map(k => esc(r[k])).join(','))].join('\n');
}

type Toast = { type: 'success' | 'error' | 'info'; message: string };

export default function BomCogsTab() {
  const [items, setItems] = useState<HppItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fallbackUsed, setFallbackUsed] = useState(false);

  const [sortKey, setSortKey] = useState<'produk_nama' | 'hpp_total_per_porsi' | 'rekomendasi_harga' | 'margin_user_persen'>('produk_nama');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const [toast, setToast] = useState<Toast | null>(null);
  const showToast = (t: Toast) => { setToast(t); setTimeout(() => setToast(null), 3500); };

  const [bomOpen, setBomOpen] = useState(false);
  const [bomLoading, setBomLoading] = useState(false);
  const [bomError, setBomError] = useState<string | null>(null);
  const [bomRows, setBomRows] = useState<BomRow[]>([]);
  const [bomProdukNama, setBomProdukNama] = useState<string>('');

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true); setError(null); setFallbackUsed(false);
    getJSON<{ ok: boolean; data: any[] }>(`/api/report/hpp`, ac.signal)
      .then(json => {
        const mapped: HppItem[] = (json?.data || []).map((d: any) => ({
          produk_id: d.produk_id ?? d.id ?? '',
          produk_nama: d.nama_produk ?? d.produk_nama ?? d.nama ?? 'Tanpa Nama',
          kategori: d.kategori ?? null,
          hpp_total_per_porsi: d.hpp_per_porsi ?? d.hpp_total_per_porsi ?? d.hpp ?? null,
          rekomendasi_harga: d.harga_rekomendasi ?? d.harga_jual_rekomendasi ?? d.harga_jual ?? null,
          margin_user_persen: d.margin_user_persen ?? d.margin_pct ?? null,
        }));
        setItems(mapped);
      })
      .catch((e) => {
        const msg = String(e?.message || '');
        if (/does not exist/i.test(msg) || /\bstatus 5\d\d\b/.test(msg)) {
          setItems([]); setFallbackUsed(true); setError(null);
        } else setError(msg);
      })
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, []);

  const totalProduk = useMemo(() => items.length, [items]);
  const sortedItems = useMemo(() => {
    const arr = [...items];
    arr.sort((a, b) => {
      const A: any = a[sortKey] ?? (typeof a[sortKey] === 'number' ? 0 : '');
      const B: any = b[sortKey] ?? (typeof b[sortKey] === 'number' ? 0 : '');
      if (typeof A === 'number' && typeof B === 'number') return sortDir === 'asc' ? A - B : B - A;
      const sA = String(A).toLowerCase(), sB = String(B).toLowerCase();
      return sortDir === 'asc' ? (sA < sB ? -1 : sA > sB ? 1 : 0) : (sA > sB ? -1 : sA < sB ? 1 : 0);
    });
    return arr;
  }, [items, sortKey, sortDir]);

  const toggleSort = (key: typeof sortKey) => { sortKey === key ? setSortDir(d => d === 'asc' ? 'desc' : 'asc') : (setSortKey(key), setSortDir('asc')); };

  const openBom = async (produk_id: string, produk_nama: string) => {
    setBomOpen(true); setBomLoading(true); setBomError(null); setBomRows([]); setBomProdukNama(produk_nama);
    try {
      const json = await getJSON<{ ok: boolean; data: BomRow[] }>(`/api/produk/${produk_id}/komposisi`);
      setBomRows(json?.data || []); showToast({ type: 'success', message: `Komposisi “${produk_nama}” dimuat.` });
    } catch (e: any) { setBomError(e?.message || 'Gagal memuat komposisi'); showToast({ type: 'error', message: 'Gagal memuat komposisi.' }); }
    finally { setBomLoading(false); }
  };

  const exportMainCSV = () => {
    const rows = sortedItems.map((x) => ({
      produk_id: x.produk_id, produk_nama: x.produk_nama,
      hpp_per_porsi: x.hpp_total_per_porsi ?? '', harga_rekomendasi: x.rekomendasi_harga ?? '', margin_persen: x.margin_user_persen ?? '',
    }));
    const csv = toCSV(rows, ['produk_id','produk_nama','hpp_per_porsi','harga_rekomendasi','margin_persen']);
    downloadBlob(`bom_cogs_${new Date().toISOString().slice(0,10)}.csv`, new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    showToast({ type: 'success', message: 'Export CSV berhasil.' });
  };
  const exportMainJSON = () => {
    const data = sortedItems.map((x) => ({
      produk_id: x.produk_id, produk_nama: x.produk_nama,
      hpp_per_porsi: x.hpp_total_per_porsi ?? null, harga_rekomendasi: x.rekomendasi_harga ?? null, margin_persen: x.margin_user_persen ?? null,
    }));
    downloadBlob(`bom_cogs_${new Date().toISOString().slice(0,10)}.json`, new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    showToast({ type: 'success', message: 'Export JSON berhasil.' });
  };

  const exportBomCSV = () => {
    const rows = bomRows.map((r) => ({ bahan_nama: r.bahan_nama, qty: r.qty, unit: r.unit, subtotal: r.subtotal }));
    const csv = toCSV(rows, ['bahan_nama','qty','unit','subtotal']);
    downloadBlob(`komposisi_${bomProdukNama.replace(/\s+/g,'_')}_${new Date().toISOString().slice(0,10)}.csv`, new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    showToast({ type: 'success', message: 'Export komposisi (CSV) berhasil.' });
  };
  const exportBomJSON = () => {
    downloadBlob(`komposisi_${bomProdukNama.replace(/\s+/g,'_')}_${new Date().toISOString().slice(0,10)}.json`, new Blob([JSON.stringify(bomRows, null, 2)], { type: 'application/json' }));
    showToast({ type: 'success', message: 'Export komposisi (JSON) berhasil.' });
  };

  return (
    <div className="p-4 space-y-4">
      {toast && (
        <div className="fixed top-4 right-4 z-[60]">
          <div className={[
              'rounded-xl shadow px-4 py-3 text-sm',
              toast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
              toast.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-slate-50 text-slate-700 border border-slate-200'
            ].join(' ')}>{toast.message}</div>
        </div>
      )}

      {fallbackUsed && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 text-amber-800 px-4 py-3">
          Data sementara kosong karena perbaikan BE <span className="font-semibold">/report/hpp</span>.
        </div>
      )}

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-2xl shadow p-4 bg-white">
          <div className="text-xs text-gray-500">Total Produk</div>
          <div className="text-2xl font-semibold">{totalProduk}</div>
        </div>
        <div className="rounded-2xl shadow p-4 bg-white">
          <div className="text-xs text-gray-500">Avg. HPP per porsi</div>
          <div className="text-xl font-semibold">
            {rupiah(items.length ? Math.round(items.reduce((acc, x) => acc + (x.hpp_total_per_porsi || 0), 0) / items.length) : 0)}
          </div>
        </div>
      </div>

      {/* Table + Toolbar */}
      <div className="rounded-2xl shadow overflow-hidden bg-white">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="font-semibold">BOM & COGS</div>
          <div className="flex items-center gap-2">
            <Link href="/analytics" className="px-3 py-1.5 rounded-lg bg-black text-white hover:opacity-90">Owner Analytics</Link>
            <button onClick={() => window.print()} className="px-3 py-1.5 rounded-lg border hover:bg-gray-50">Print / PDF</button>
            <button onClick={exportMainCSV} className="px-3 py-1.5 rounded-lg border hover:bg-gray-50">Export CSV</button>
            <button onClick={exportMainJSON} className="px-3 py-1.5 rounded-lg border hover:bg-gray-50">Export JSON</button>
          </div>
        </div>
        {loading ? (
          <div className="p-6 text-sm text-gray-500">Memuat data…</div>
        ) : error ? (
          <div className="p-6 text-sm text-red-600">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2">
                    <button className="inline-flex items-center gap-1 hover:underline" onClick={() => toggleSort('produk_nama')}>
                      Produk {sortKey === 'produk_nama' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                    </button>
                  </th>
                  <th className="text-right px-4 py-2">
                    <button className="inline-flex items-center gap-1 hover:underline" onClick={() => toggleSort('hpp_total_per_porsi')}>
                      HPP/Porsi {sortKey === 'hpp_total_per_porsi' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                    </button>
                  </th>
                  <th className="text-right px-4 py-2">
                    <button className="inline-flex items-center gap-1 hover:underline" onClick={() => toggleSort('rekomendasi_harga')}>
                      Rek. Harga {sortKey === 'rekomendasi_harga' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                    </button>
                  </th>
                  <th className="text-right px-4 py-2">
                    <button className="inline-flex items-center gap-1 hover:underline" onClick={() => toggleSort('margin_user_persen')}>
                      Margin (%) {sortKey === 'margin_user_persen' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                    </button>
                  </th>
                  <th className="px-4 py-2">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {sortedItems.length === 0 ? (
                  <tr><td className="px-4 py-6 text-gray-500" colSpan={5}>Belum ada data produk.</td></tr>
                ) : (
                  sortedItems.map((it) => (
                    <tr key={it.produk_id} className="border-t">
                      <td className="px-4 py-2">{it.produk_nama}</td>
                      <td className="px-4 py-2 text-right">{rupiah(it.hpp_total_per_porsi)}</td>
                      <td className="px-4 py-2 text-right">{rupiah(it.rekomendasi_harga)}</td>
                      <td className="px-4 py-2 text-right">{(it.margin_user_persen ?? 0).toFixed(1)}</td>
                      <td className="px-4 py-2">
                        <button onClick={() => openBom(it.produk_id, it.produk_nama)} className="px-3 py-1.5 rounded-lg bg-black text-white hover:opacity-90">
                          Lihat BOM
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal BOM */}
      {bomOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setBomOpen(false)} />
          <div className="relative z-10 w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="px-5 py-3 border-b flex items-center justify-between">
              <div className="font-semibold">Komposisi Bahan — {bomProdukNama}</div>
              <div className="flex items-center gap-2">
                <button onClick={exportBomCSV} className="px-3 py-1.5 rounded-lg border hover:bg-gray-50">Export CSV</button>
                <button onClick={exportBomJSON} className="px-3 py-1.5 rounded-lg border hover:bg-gray-50">Export JSON</button>
                <button onClick={() => setBomOpen(false)} className="px-3 py-1.5 rounded-lg border hover:bg-gray-50">Tutup</button>
              </div>
            </div>
            <div className="p-5">
              {bomLoading ? (
                <div className="text-sm text-gray-500">Memuat komposisi…</div>
              ) : bomError ? (
                <div className="text-sm text-red-600">{bomError}</div>
              ) : bomRows.length === 0 ? (
                <div className="text-sm text-gray-500">Belum ada komposisi.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-4 py-2">Bahan</th>
                        <th className="text-right px-4 py-2">Qty</th>
                        <th className="text-left px-4 py-2">Satuan</th>
                        <th className="text-right px-4 py-2">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bomRows.map((r, idx) => (
                        <tr key={idx} className="border-t">
                          <td className="px-4 py-2">{r.bahan_nama}</td>
                          <td className="px-4 py-2 text-right">{r.qty}</td>
                          <td className="px-4 py-2">{r.unit}</td>
                          <td className="px-4 py-2 text-right">{rupiah(r.subtotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t font-semibold">
                        <td className="px-4 py-2" colSpan={3}>Total Biaya Bahan</td>
                        <td className="px-4 py-2 text-right">
                          {rupiah(bomRows.reduce((acc, x) => acc + (x.subtotal || 0), 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
