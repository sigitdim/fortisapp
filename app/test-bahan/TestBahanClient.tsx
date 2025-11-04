"use client";

import React, { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";

type Bahan = { id: string; nama_bahan: string; satuan?: string; harga?: number };

export default function TestBahanClient() {
  const [items, setItems] = useState<Bahan[]>([]);
  const [nama, setNama] = useState("");
  const [satuan, setSatuan] = useState("");
  const [harga, setHarga] = useState<number>(0);
  const [msg, setMsg] = useState<string|null>(null);

  async function load() {
    const r = await apiGet<{ ok: boolean; data: Bahan[] }>("/setup/bahan");
    setItems(r?.data || []);
  }

  useEffect(() => { load().catch(console.error); }, []);

  async function add() {
    setMsg(null);
    await apiPost("/setup/bahan", { nama_bahan: nama, satuan, harga });
    setNama(""); setSatuan(""); setHarga(0);
    await load();
    setMsg("✅ Tersimpan");
  }

  return (
    <div className="p-4">
      <h1 className="font-semibold mb-2">Test Bahan</h1>
      <div className="flex gap-2 mb-3">
        <input value={nama} onChange={e=>setNama(e.target.value)} placeholder="Nama bahan" className="border px-2 py-1 rounded"/>
        <input value={satuan} onChange={e=>setSatuan(e.target.value)} placeholder="Satuan" className="border px-2 py-1 rounded"/>
        <input value={harga} onChange={e=>setHarga(Number(e.target.value)||0)} placeholder="Harga" type="number" className="border px-2 py-1 rounded w-32"/>
        <button onClick={add} className="px-3 py-1 rounded border hover:bg-gray-50">Tambah</button>
      </div>
      {msg && <div className="text-sm mb-2">{msg}</div>}
      <ul className="text-sm list-disc pl-5">
        {items.map(b => (<li key={b.id}>{b.nama_bahan} {b.satuan?`(${b.satuan})`:''} {b.harga?`- Rp ${b.harga}`:''}</li>))}
      </ul>
    </div>
  );
}
