'use client';

import React, { useEffect, useMemo, useState } from 'react';

type TK = {
  id: string;
  nama: string;
  gaji: number;
  created_at?: string;
  owner_id?: string;
};

type ApiList = { ok: boolean; data: TK[] } | { ok: true; count?: number; data: TK[] };

async function apiFetch<T = any>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  const text = await res.text().catch(() => '');
  if (!res.ok) throw new Error(`API ${init?.method || 'GET'} ${path} -> ${res.status} : ${text}`);
  try { return JSON.parse(text) as T; } catch { return text as unknown as T; }
}

export default function TenagaKerjaPage() {
  const [list, setList] = useState<TK[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [nama, setNama] = useState('');
  const [gaji, setGaji] = useState<string>('');

  const total = useMemo(() => list.reduce((a, b) => a + (Number(b.gaji) || 0), 0), [list]);

  async function load() {
    setErr(null);
    setLoading(true);
    try {
      const r = await apiFetch<ApiList>('/api/setup/tenaga_kerja');
      // BE bisa kirim {ok,true,data:[...]} atau {ok,true,count,n} – dua-duanya kita handle
      const data = (r as any).data as TK[];
      setList(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setErr(String(e?.message || e));
      setList([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd() {
    if (!nama.trim()) return alert('Nama wajib diisi');
    const val = Number(String(gaji).replace(/[^\d.-]/g, ''));
    if (!Number.isFinite(val) || val < 0) return alert('Gaji harus angka >= 0');

    setErr(null);
    try {
      await apiFetch('/api/setup/tenaga_kerja', {
        method: 'POST',
        body: JSON.stringify({ nama, gaji: val }),
      });
      setNama('');
      setGaji('');
      await load();
    } catch (e: any) {
      setErr(String(e?.message || e));
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus baris ini?')) return;
    setErr(null);
    try {
      await apiFetch(`/api/setup/tenaga_kerja/${id}`, { method: 'DELETE' });
      await load();
    } catch (e: any) {
      setErr(String(e?.message || e));
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Tenaga Kerja</h1>

      {err && (
        <div className="rounded-md border border-red-300 bg-red-50 text-red-800 p-3 text-sm">
          {err}
        </div>
      )}

      <div className="flex gap-2 items-center">
        <input
          value={nama}
          onChange={e => setNama(e.target.value)}
          placeholder="Nama"
          className="flex-1 px-3 py-2 rounded-md border"
        />
        <input
          value={gaji}
          onChange={e => setGaji(e.target.value)}
          placeholder="Gaji bulanan"
          className="w-56 px-3 py-2 rounded-md border"
        />
        <button
          onClick={handleAdd}
          className="px-4 py-2 rounded-md bg-black text-white"
        >
          Tambah (POST)
        </button>
        <button
          onClick={load}
          className="ml-auto px-3 py-2 rounded-md border"
        >
          Refresh
        </button>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-3 py-2">Nama</th>
              <th className="text-left px-3 py-2">Biaya</th>
              <th className="text-left px-3 py-2">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-3 py-3" colSpan={3}>Memuat…</td></tr>
            ) : list.length === 0 ? (
              <tr><td className="px-3 py-3" colSpan={3}>Belum ada data</td></tr>
            ) : (
              list.map(row => (
                <tr key={row.id} className="border-t">
                  <td className="px-3 py-2">{row.nama}</td>
                  <td className="px-3 py-2">Rp {Number(row.gaji || 0).toLocaleString('id-ID')}</td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => handleDelete(row.id)}
                      className="px-3 py-1 rounded-md border"
                    >Hapus</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot className="bg-gray-50 border-t">
            <tr>
              <td className="px-3 py-2 font-medium">Total</td>
              <td className="px-3 py-2 font-medium">Rp {total.toLocaleString('id-ID')}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
