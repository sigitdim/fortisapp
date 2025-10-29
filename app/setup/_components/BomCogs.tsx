'use client';

import React, { useEffect, useMemo, useState, startTransition } from 'react';

type Bahan = {
  id: string;
  nama: string;
  satuan?: string;
  harga_per_satuan?: number;
  harga?: number;
};

type ReseqRow = {
  rid: string;
  bahanId?: string;
  nama?: string;
  qty?: number;
  unit?: string;
};

const toNum = (v: any): number | undefined => {
  if (v === null || v === undefined || v === '') return undefined;
  const s = String(v).replace(/[^0-9.-]/g, '');
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
};

export default function BomCogs() {
  const [bahan, setBahan] = useState<Bahan[]>([]);
  const [rows, setRows] = useState<ReseqRow[]>([]);

  const load = async () => {
    // TODO: isi fetch nyata (ke BE) lalu panggil setBahan/setRows
    // contoh aman: biarkan kosong agar compile & run
  };

  useEffect(() => {
    startTransition(() => load());
  }, []);

  const bahanById = useMemo(() => {
    const m = new Map<string, Bahan>();
    bahan.forEach((x) => m.set(x.id, x));
    return m;
  }, [bahan]);

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-2">BOM &amp; COGS</h2>
      <div className="text-sm text-gray-500">
        Placeholder aman. Isi fungsi <code>load()</code> dan UI sesuai data BE.
      </div>
      <div className="mt-4 rounded-lg border p-3">
        <div className="font-medium">Total Bahan: {bahan.length}</div>
        <div className="mt-1 text-xs text-gray-500">Index Map: {bahanById.size}</div>
      </div>
    </div>
  );
}
