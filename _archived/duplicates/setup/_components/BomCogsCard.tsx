'use client';
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/app/lib/api';

type Bahan = { id:string; nama:string; satuan?:string; harga_per_satuan?:number };
type Produk = { id:string; nama:string };

type Row = {
  bahan_id: string;
  nama: string;
  qty: number;
  satuan?: string;
  harga_satuan?: number;
};

export default function BomCogsCard(){
  const [produkList, setProdukList] = useState<Produk[]>([]);
  const [bahanList, setBahanList] = useState<Bahan[]>([]);
  const [produkId, setProdukId] = useState<string>('');
  const [rows, setRows] = useState<Row[]>([]);
  const [output, setOutput] = useState<number>(1);
  const [hargaJual, setHargaJual] = useState<number | ''>('');
  const [alokOH, setAlokOH] = useState<number>(0);
  const [alokTK, setAlokTK] = useState<number>(0);

  // fetch minimal (kalau /produk belum ada di BE, biarin kosong)
  useEffect(()=>{ (async ()=>{
    try { const r = await api('/produk'); setProdukList(r?.data ?? []);} catch {}
    try { const r = await api('/setup/bahan'); setBahanList(r?.data ?? []);} catch {}
  })(); },[]);

  function addBahan(id:string){
    const b = bahanList.find(x=>x.id===id);
    if(!b) return;
    setRows(prev=>[...prev, {
      bahan_id: b.id, nama: b.nama, qty: 1,
      satuan: b.satuan, harga_satuan: b.harga_per_satuan
    }]);
  }

  const subtotal = (r:Row) => (r.qty || 0) * (r.harga_satuan || 0);
  const totalBahan = useMemo(()=> rows.reduce((s,r)=> s + subtotal(r), 0), [rows]);
  const cogsPerBatch = totalBahan + alokOH + alokTK;
  const cogsPerUnit = output > 0 ? cogsPerBatch / output : 0;

  const profitPerUnit = typeof hargaJual==='number' ? (hargaJual - cogsPerUnit) : 0;
  const marginPct = typeof hargaJual==='number' && hargaJual>0 ? (profitPerUnit / hargaJual * 100) : 0;

  return (
    <div className="rounded-2xl border shadow-sm bg-white overflow-hidden">
      <div className="p-5 border-b">
        <h2 className="text-xl font-semibold">Resep / BOM & Perhitungan COGS</h2>
      </div>

      <div className="p-5 space-y-6">
        {/* Top grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm text-gray-500">Produk</label>
            <div className="relative">
              <select
                className="w-full border rounded-xl px-3 py-2 appearance-none"
                value={produkId}
                onChange={e=>setProdukId(e.target.value)}
              >
                <option value="">Pilih produk...</option>
                {produkList.map(p=>(
                  <option key={p.id} value={p.id}>{p.nama}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="text-sm text-gray-500">Alokasi Overhead / unit (Rp)</div>
              <div className="text-lg">{alokOH.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Alokasi TK / unit (Rp)</div>
              <div className="text-lg">{alokTK.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Output per batch (unit)</div>
              <input
                type="number" min={1}
                className="mt-1 w-full border rounded-xl px-3 py-2"
                value={output}
                onChange={e=>setOutput(Math.max(1, Number(e.target.value || 1)))}
              />
            </div>
          </div>
        </div>

        {/* Tambah bahan */}
        <div className="space-y-2">
          <label className="text-sm text-gray-500">Tambah Bahan ke Resep</label>
          <div className="flex gap-2">
            <select className="border rounded-xl px-3 py-2 w-full" onChange={e=>{ if(e.target.value){ addBahan(e.target.value); e.target.value=''; }}}>
              <option value="">Pilih bahan...</option>
              {bahanList.map(b=>(
                <option key={b.id} value={b.id}>{b.nama}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tabel bahan */}
        <div className="rounded-2xl border overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-left">Bahan</th>
                <th className="p-3 text-right">Qty</th>
                <th className="p-3 text-left">Satuan</th>
                <th className="p-3 text-right">Harga Satuan</th>
                <th className="p-3 text-right">Subtotal</th>
                <th className="p-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.length===0 ? (
                <tr><td className="p-4 text-center text-gray-500" colSpan={6}>Belum ada bahan</td></tr>
              ) : rows.map((r,i)=>(
                <tr key={r.bahan_id} className={i%2 ? 'bg-white' : 'bg-gray-50/40'}>
                  <td className="p-3">{r.nama}</td>
                  <td className="p-3 text-right">
                    <input
                      type="number" min={0} step="0.01"
                      className="w-24 border rounded px-2 py-1 text-right"
                      value={r.qty}
                      onChange={e=>{
                        const v = Number(e.target.value || 0);
                        setRows(prev => prev.map(x => x.bahan_id===r.bahan_id ? {...x, qty: v} : x));
                      }}
                    />
                  </td>
                  <td className="p-3">{r.satuan || '-'}</td>
                  <td className="p-3 text-right">{(r.harga_satuan ?? 0).toLocaleString()}</td>
                  <td className="p-3 text-right">{subtotal(r).toLocaleString()}</td>
                  <td className="p-3 text-center">
                    <button
                      className="px-3 py-1 rounded border hover:bg-red-50"
                      onClick={()=> setRows(prev=> prev.filter(x=>x.bahan_id!==r.bahan_id))}
                    >Hapus</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Ringkasan & harga jual */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="rounded-2xl border p-4">
            <div className="text-sm text-gray-500">COGS per unit</div>
            <div className="text-2xl font-semibold">{cogsPerUnit.toLocaleString()}</div>
          </div>
          <div className="rounded-2xl border p-4">
            <div className="text-sm text-gray-500">Harga jual (opsional)</div>
            <input
              type="number" min={0}
              className="mt-1 w-full border rounded-xl px-3 py-2"
              value={hargaJual}
              onChange={e=> setHargaJual(e.target.value==='' ? '' : Number(e.target.value))}
              placeholder="Masukkan harga jual"
            />
          </div>
          <div className="rounded-2xl border p-4">
            <div className="text-sm text-gray-500">Margin (Rp / %)</div>
            <div className="text-lg">
              {typeof hargaJual==='number'
                ? `${(profitPerUnit).toLocaleString()} / ${marginPct.toFixed(1)}%`
                : '-'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
