// @ts-nocheck
'use client';

import React, { useEffect, useState } from 'react';
import type { Produk } from '@/lib/api';
import { api } from '@/lib/api'; // objek helper: getJson/postJson/putJson/buildHeaders

export default function CogsPage() {
  const [produk, setProduk] = useState<Produk[]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // GET daftar produk dari BE (pakai tipe dari '@/lib/api')
  useEffect(() => {
    let ok = true;
    (async () => {
      try {
        const list = await api.getJson<Produk[]>('/produk');
        if (ok) setProduk(list ?? []);
      } catch (e: any) {
        setMsg(`Gagal memuat produk: ${e?.message ?? e}`);
      }
    })();
    return () => {
      ok = false;
    };
  }, []);

  // Contoh payload simpan COGS sederhana (isi sesuai kontrak BE)
  type CogsPayload = {
    items: Array<{
      produk_id: string;
      // tambahkan field lain sesuai BE kalau sudah fix
    }>;
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMsg(null);

      const payload: CogsPayload = {
        items: produk.map((p) => ({ produk_id: p.id })),
      };

      // JANGAN panggil api(...) langsung — gunakan postJson
      const j = await api.postJson<{ ok: boolean; message?: string }>(
        '/cogs/save',
        payload
      );

      if (!j?.ok) throw new Error(j?.message ?? 'BE response not ok');
      setMsg('BOM & COGS tersimpan via Backend ✅');
    } catch (e: any) {
      setMsg(`Gagal simpan: ${e?.message ?? e}`);
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(null), 3000);
    }
  };

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Setup &gt; COGS</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-3 py-1.5 rounded-md bg-black text-white disabled:opacity-50"
        >
          {saving ? 'Menyimpan…' : 'Simpan'}
        </button>
      </div>

      {msg && <div className="rounded-md border px-3 py-2 text-sm">{msg}</div>}

      <div className="rounded-lg border">
        <div className="px-3 py-2 text-sm text-gray-500">
          Total produk: {produk.length}
        </div>
        <div className="divide-y">
          {produk.map((p) => (
            <div key={p.id} className="px-3 py-2 text-sm">
              <div className="font-medium">{p.nama ?? ''}</div>
              <div className="text-xs text-gray-500">{p.id}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
