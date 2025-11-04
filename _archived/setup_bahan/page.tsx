'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import Link from 'next/link';

/* ================= Helpers ================= */
function rupiah(n: number | string | null | undefined) {
  const x = typeof n === 'string' ? Number(n) : n ?? 0;
  try {
    return x.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
  } catch {
    return `Rp ${x || 0}`;
  }
}

/* ================= Types ================= */
type Bahan = {
  id: string;
  nama_bahan: string;
  harga?: number | null;
  volume_default?: number | null;
  satuan?: string | null;
  created_at?: string;
};

/* ============== UI: Tabs ============== */
function SetupTabs() {
  const base = '/setup';
  const tabs = [
    { key: 'bahan', label: 'Bahan', href: `${base}` },
    { key: 'overhead', label: 'Overhead', href: `${base}/overhead` },
    { key: 'tenaga', label: 'Tenaga Kerja', href: `${base}/tenaga-kerja` },
    { key: 'aset', label: 'Aset', href: `${base}/aset` },
  ];
  const activeKey = 'bahan';

  return (
    <div className="flex gap-3">
      {tabs.map(t => (
        <Link
          key={t.key}
          href={t.href}
          className={[
            'rounded-full px-5 py-2 text-sm font-semibold transition',
            activeKey === t.key
              ? 'bg-red-600 text-white shadow'
              : 'bg-white text-gray-800 hover:bg-gray-100 border border-gray-200',
          ].join(' ')}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}

/* ============== Page ============== */
export default function SetupBahanPage() {
  const [list, setList] = useState<Bahan[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch('/api/setup/bahan', { cache: 'no-store' });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text?.slice(0, 200) || `HTTP ${res.status}`);
        }
        const json = await res.json();
        const rows: Bahan[] = (json?.data ?? json ?? []).map((x: any) => ({
          id: x.id ?? x.bahan_id ?? crypto.randomUUID(),
          nama_bahan: x.nama_bahan ?? x.nama ?? '',
          harga: x.harga ?? x.price ?? null,
          volume_default: x.volume_default ?? x.volume ?? x.purchase_qty ?? null,
          satuan: x.satuan ?? x.unit ?? x.purchase_unit ?? null,
          created_at: x.created_at,
        }));
        if (alive) setList(rows);
      } catch (e: any) {
        if (alive) setErr(e?.message || 'Gagal memuat data.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((r) => r.nama_bahan?.toLowerCase().includes(q));
  }, [list, query]);

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight">Setup</h1>
      </div>

      <div className="mb-6">
        <SetupTabs />
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <button
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-white font-semibold hover:bg-red-700 active:scale-[0.99]"
              onClick={() => alert('TODO: buka modal Tambah Bahan')}
            >
              <span>Tambah Bahan</span>
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <div className="relative w-full md:w-[560px]">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari Bahan (ex: kopi arabika)"
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 pl-10 text-sm outline-none ring-0 focus:border-gray-400"
            />
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>
        </div>

        {err && (
          <div className="mx-5 mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {err}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full border-t border-gray-100">
            <thead>
              <tr className="text-left text-sm text-gray-500">
                <th className="px-6 py-3 font-semibold">Nama Bahan</th>
                <th className="px-6 py-3 font-semibold">Harga</th>
                <th className="px-6 py-3 font-semibold">Volume</th>
                <th className="px-6 py-3 font-semibold">Satuan</th>
                <th className="px-6 py-3 font-semibold text-right">Edit/Hapus</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5} className="px-6 py-6 text-center text-sm text-gray-500">
                    Memuat data…
                  </td>
                </tr>
              )}

              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-500">
                    Belum ada data
                  </td>
                </tr>
              )}

              {!loading &&
                filtered.map((row) => (
                  <tr key={row.id} className="border-t border-gray-100 hover:bg-gray-50/60">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {row.nama_bahan}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-800">
                      {row.harga != null ? rupiah(row.harga) : '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-800">
                      {row.volume_default != null ? row.volume_default : '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-800">
                      {row.satuan || '—'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          className="rounded-lg border border-gray-200 p-2 hover:bg-white"
                          onClick={() => alert(`TODO: Edit ${row.nama_bahan}`)}
                          aria-label="Edit"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4 text-gray-700" />
                        </button>
                        <button
                          className="rounded-lg border border-gray-200 p-2 hover:bg-white"
                          onClick={() => confirm(`Hapus ${row.nama_bahan}?`) && alert('TODO: Delete')}
                          aria-label="Hapus"
                          title="Hapus"
                        >
                          <Trash2 className="h-4 w-4 text-gray-700" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-6 py-4 text-xs text-gray-500">
          <span>Total: {filtered.length}</span>
          <span>Tips: kalau error “Cannot GET /”, cek route proxy FE & Nginx</span>
        </div>
      </div>
    </div>
  );
}
