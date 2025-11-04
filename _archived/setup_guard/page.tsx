'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';

type TabKey = 'bahan' | 'overhead' | 'tenaga' | 'aset' | 'bom';
type Bahan = {
  id: string;
  nama_bahan: string;
  harga?: number | null;
  volume_default?: number | null;
  satuan?: string | null;
  created_at?: string;
};

function rupiah(n: number | string | null | undefined) {
  const x = typeof n === 'string' ? Number(n) : n ?? 0;
  try {
    return x.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
  } catch {
    return `Rp ${x || 0}`;
  }
}
function cleanHtmlError(htmlLike: string) {
  if (!htmlLike) return '';
  return htmlLike.replace(/<[^>]+>/g, '').trim().slice(0, 200);
}

function SetupTabs({ active }: { active: TabKey }) {
  const router = useRouter();
  const tabs: { key: TabKey; label: string }[] = [
    { key: 'bahan', label: 'Bahan' },
    { key: 'overhead', label: 'Overhead' },
    { key: 'tenaga', label: 'Tenaga Kerja' },
    { key: 'bom', label: 'BOM & COGS' },
    { key: 'aset', label: 'Aset' },
  ];
  return (
    <div className="flex gap-3">
      {tabs.map(t => (
        <button
          key={t.key}
          onClick={() => router.push(`/setup?tab=${t.key}`)}
          className={[
            'rounded-full px-5 py-2 text-sm font-semibold transition',
            active === t.key
              ? 'bg-red-600 text-white shadow'
              : 'bg-white text-gray-800 hover:bg-gray-100 border border-gray-200',
          ].join(' ')}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function BahanSection() {
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
          throw new Error(cleanHtmlError(text) || `HTTP ${res.status}`);
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
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      {/* Header card */}
      <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
        <button
          className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-white font-semibold hover:bg-red-700 active:scale-[0.99]"
          onClick={() => alert('TODO: Modal Tambah Bahan')}
        >
          <span>Tambah Bahan</span>
          <Plus className="h-4 w-4" />
        </button>

        {/* Search + tombol merah */}
        <div className="flex w-full max-w-[720px] items-center gap-3">
          <div className="relative flex-1">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ex : kopi arabika"
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 pl-10 text-sm outline-none ring-0 focus:border-gray-400"
            />
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>
          <button
            className="rounded-xl bg-red-600 px-4 py-2 text-white font-semibold hover:bg-red-700"
            onClick={() => {}}
          >
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              <span>Cari</span>
            </div>
          </button>
        </div>
      </div>

      {/* Error box */}
      {err && (
        <div className="mx-5 mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {err}
        </div>
      )}

      {/* Table */}
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
            {!loading && filtered.map((row) => (
              <tr key={row.id} className="border-t border-gray-100 hover:bg-gray-50/60">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{row.nama_bahan}</td>
                <td className="px-6 py-4 text-sm text-gray-800">{row.harga != null ? rupiah(row.harga) : '—'}</td>
                <td className="px-6 py-4 text-sm text-gray-800">{row.volume_default ?? '—'}</td>
                <td className="px-6 py-4 text-sm text-gray-800">{row.satuan || '—'}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-3">
                    <button
                      className="rounded-lg border border-gray-200 p-2 hover:bg-white"
                      onClick={() => alert(`TODO: Edit ${row.nama_bahan}`)}
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4 text-gray-700" />
                    </button>
                    <button
                      className="rounded-lg border border-gray-200 p-2 hover:bg-white"
                      onClick={() => confirm(`Hapus ${row.nama_bahan}?`) && alert('TODO: Delete')}
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

      {/* Footer */}
      <div className="flex items-center justify-between px-6 py-4 text-xs text-gray-500">
        <span>Total: {filtered.length}</span>
        <span>Tips: jika muncul “Cannot GET /”, cek mapping proxy FE → BE / Nginx.</span>
      </div>
    </div>
  );
}

export default function SetupPage() {
  const sp = useSearchParams();
  const raw = sp?.get('tab');
  const tab: TabKey =
    raw === 'bahan' || raw === 'overhead' || raw === 'tenaga' || raw === 'aset' || raw === 'bom'
      ? raw
      : 'bahan';

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight">Setup</h1>
      </div>
      <div className="mb-6">
        <SetupTabs active={tab} />
      </div>
      {tab === 'bahan' ? (
        <BahanSection />
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-sm text-gray-500">
          Halaman <span className="font-semibold">{tab.toUpperCase()}</span> belum diaktifkan di UI ini.
        </div>
      )}
    </div>
  );
}
