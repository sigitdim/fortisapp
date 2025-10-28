// app/setup/cogs/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { api, fetchProdukList } from "@/lib/api";

type Produk = { id: string; nama: string };
type Bahan = { id: string; nama: string; satuan?: string|null; harga_per_satuan?: number|null };
type TK = { id: string; nama: string; rate_per_menit?: number|null };
type OH = { id: string; nama: string; nilai?: number|null };

type ItemResep = {
  id?: string; // id bahan
  nama?: string; // kalau custom
  satuan?: string | null;
  harga?: number; // harga satuan
  qty: number;
  subtotal: number;
};

function money(n: number | null | undefined){
  if (n == null) return "-";
  return Number(n).toLocaleString("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0});
}

export default function BomCogsPage(){
  // master
  const [produk, setProduk] = useState<Produk[]>([]);
  const [bahan, setBahan] = useState<Bahan[]>([]);
  const [tk, setTk] = useState<TK[]>([]);
  const [oh, setOh] = useState<OH[]>([]);
  const [loading, setLoading] = useState(true);

  // form
  const [produkId, setProdukId] = useState<string>("");
  const [yieldUnit, setYieldUnit] = useState<number>(1);
  const [rows, setRows] = useState<ItemResep[]>([{ qty: 1, subtotal: 0 }]);
  const [selectedTk, setSelectedTk] = useState<string>("");
  const [menitKerja, setMenitKerja] = useState<number>(0);
  const [overheadIds, setOverheadIds] = useState<string[]>([]);
  const [overheadManual, setOverheadManual] = useState<number>(0);

  // load master
  useEffect(()=>{
    (async()=>{
      setLoading(true);
      try{
        const listProduk = await fetchProdukList();
        setProduk(listProduk);

        const [{data:b},{data:t},{data:o}] = await Promise.all([
          supabase.from("bahan").select("id,nama,satuan,harga_per_satuan").order("nama",{ascending:true}),
          supabase.from("tenaga_kerja").select("id,nama,rate_per_menit").order("nama",{ascending:true}),
          supabase.from("overhead").select("id,nama,nilai").order("nama",{ascending:true}),
        ]);
        setBahan((b??[]) as any);
        setTk((t??[]) as any);
        setOh((o??[]) as any);

        // pilih produk pertama bila ada
        if (listProduk.length) setProdukId(listProduk[0].id);
      } finally {
        setLoading(false);
      }
    })();
  },[]);

  // maps
  const bahanMap = useMemo(()=> {
    const m = new Map<string,Bahan>();
    bahan.forEach(x => m.set(x.id, x));
    return m;
  }, [bahan]);

  const tkRate = useMemo(()=>{
    const found = tk.find(x=>x.id === selectedTk);
    return Number(found?.rate_per_menit || 0);
  },[selectedTk, tk]);

  const ohTotal = useMemo(()=>{
    const picked = oh.filter(x => overheadIds.includes(x.id)).reduce((s,x)=> s + Number(x.nilai||0), 0);
    return picked + Number(overheadManual||0);
  },[oh, overheadIds, overheadManual]);

  function updateRow(i:number, patch: Partial<ItemResep>){
    setRows(prev=>{
      const copy = [...prev];
      const cur = {...copy[i], ...patch};
      const harga = Number(cur.harga||0);
      const qty = Number(cur.qty||0);
      cur.subtotal = Math.max(0, Math.round(harga*qty));
      copy[i] = cur;
      return copy;
    });
  }
  function setRowBahanId(i:number, id:string){
    if (!id){
      updateRow(i, { id: undefined, nama: "", satuan: "", harga: 0 });
      return;
    }
    const b = bahanMap.get(id);
    updateRow(i, { id, nama: b?.nama, satuan: b?.satuan ?? "", harga: Number(b?.harga_per_satuan||0) });
  }
  function addRow(){ setRows(p=>[...p, { qty: 1, subtotal: 0 }]); }
  function removeRow(i:number){ setRows(p=> p.filter((_,idx)=>idx!==i)); }

  // totals
  const totalBahan = rows.reduce((s,r)=> s + Number(r.subtotal||0), 0);
  const totalTK = Math.round(Number(menitKerja||0) * Number(tkRate||0));
  const totalBatch = totalBahan + totalTK + ohTotal;
  const cogsPerUnit = yieldUnit>0 ? Math.ceil(totalBatch / yieldUnit) : 0;

  // simpan (opsional) ke BE jika ada /cogs/save, fallback ke localStorage
  async function simpan() {
    if (!produkId){ alert("Pilih produk dulu."); return; }
    const payload = {
      produk_id: produkId,
      yield: yieldUnit,
      bahan: rows.map(r => ({
        bahan_id: r.id ?? null,
        nama: r.nama ?? null,
        satuan: r.satuan ?? null,
        harga_satuan: Number(r.harga||0),
        qty: Number(r.qty||0),
        subtotal: Number(r.subtotal||0),
      })),
      tenaga_kerja: {
        pekerja_id: selectedTk || null,
        rate_per_menit: tkRate || null,
        menit: Number(menitKerja||0),
        subtotal: totalTK,
      },
      overhead: {
        overhead_ids: overheadIds,
        tambahan_manual: Number(overheadManual||0),
        subtotal: ohTotal,
      },
      cogs: {
        total_bahan: totalBahan,
        total_tk: totalTK,
        total_oh: ohTotal,
        total_batch: totalBatch,
        per_unit: cogsPerUnit,
      }
    };

    try{
      // kalau BE sudah punya:
      // - POST /cogs/save
      // - atau POST /pricing/cogs
      const j = await api("/cogs/save", { method:"POST", body: payload });
      if (!j?.ok) throw new Error("BE response not ok");
      alert("BOM & COGS tersimpan via Backend ✔");
    }catch(e:any){
      // fallback: simpan draft lokal
      const key = `cogs_draft_${produkId}`;
      localStorage.setItem(key, JSON.stringify(payload));
      alert("Backend belum siap, draft disimpan di browser ✔");
    }
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Resep / BOM & Perhitungan COGS</h1>
      {loading && <div className="text-sm opacity-70">Memuat data…</div>}

      <div className="grid md:grid-cols-3 gap-3 max-w-4xl">
        <label className="block">
          <div className="text-sm mb-1">Produk</div>
          <select value={produkId} onChange={e=>setProdukId(e.target.value)}
                  className="border rounded-xl px-3 py-2 w-full">
            {!produk.length && <option>— Tidak ada produk —</option>}
            {produk.map(p => <option key={p.id} value={p.id}>{p.nama}</option>)}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <div className="text-sm mb-1">Alokasi Overhead / unit (Rp)</div>
            <div className="px-3 py-2 border rounded-xl bg-gray-50 text-right">{money(ohTotal && yieldUnit>0 ? Math.ceil(ohTotal/yieldUnit) : 0)}</div>
          </label>
          <label className="block">
            <div className="text-sm mb-1">Alokasi TK / unit (Rp)</div>
            <div className="px-3 py-2 border rounded-xl bg-gray-50 text-right">{money(totalTK && yieldUnit>0 ? Math.ceil(totalTK/yieldUnit) : 0)}</div>
          </label>
        </div>
        <label className="block">
          <div className="text-sm mb-1">Output per batch (unit)</div>
          <input type="number" min={1} value={yieldUnit}
                 onChange={e=>setYieldUnit(Math.max(1, Number(e.target.value||1)))}
                 className="border rounded-xl px-3 py-2 w-full"/>
        </label>
      </div>

      {/* tambah bahan */}
      <section className="border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Tambah Bahan ke Resep</h2>
          <button onClick={addRow} className="px-3 py-1 rounded-lg border">+ Tambah Baris</button>
        </div>

        <div className="overflow-auto">
          <table className="min-w-[980px] w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="border-b">
                <th className="text-left p-2 w-[28%]">Bahan</th>
                <th className="text-right p-2 w-[10%]">Qty</th>
                <th className="text-left p-2 w-[12%]">Harga Satuan</th>
                <th className="text-left p-2 w-[12%]">Satuan</th>
                <th className="text-right p-2 w-[14%]">Subtotal</th>
                <th className="p-2 w-[8%]">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r,i)=>(
                <tr key={i} className="border-b">
                  <td className="p-2">
                    <select value={r.id ?? ""} onChange={e=>setRowBahanId(i, e.target.value)}
                            className="border rounded-lg px-2 py-1 w-full">
                      <option value="">— Pilih dari master —</option>
                      {bahan.map(b => <option key={b.id} value={b.id}>{b.nama}</option>)}
                    </select>
                    <input
                      className="border rounded-lg px-2 py-1 w-full mt-2"
                      placeholder="atau nama custom…"
                      value={r.nama ?? ""}
                      onChange={e=>updateRow(i, { nama: e.target.value })}
                    />
                  </td>
                  <td className="p-2 text-right">
                    <input type="number" min={0} value={r.qty}
                           onChange={e=>updateRow(i,{ qty:Number(e.target.value||0) })}
                           className="border rounded-lg px-2 py-1 w-24 text-right"/>
                  </td>
                  <td className="p-2">
                    <input type="number" min={0} value={r.harga ?? 0}
                           onChange={e=>updateRow(i,{ harga:Number(e.target.value||0) })}
                           className="border rounded-lg px-2 py-1 w-32 text-right"/>
                  </td>
                  <td className="p-2">
                    <input value={r.satuan ?? ""} onChange={e=>updateRow(i,{ satuan: e.target.value })}
                           className="border rounded-lg px-2 py-1 w-28"/>
                  </td>
                  <td className="p-2 text-right">{money(r.subtotal)}</td>
                  <td className="p-2 text-center">
                    <button onClick={()=>removeRow(i)} className="px-2 py-1 rounded-lg border">Hapus</button>
                  </td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={6} className="p-4 text-center text-gray-500">Belum ada bahan</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {/* tenaga kerja & overhead */}
      <section className="grid md:grid-cols-2 gap-4">
        <div className="border rounded-2xl p-4">
          <h2 className="font-semibold mb-3">Tenaga Kerja</h2>
          <label className="block mb-2">
            <div className="text-sm mb-1">Pekerja</div>
            <select value={selectedTk} onChange={e=>setSelectedTk(e.target.value)}
                    className="border rounded-xl px-3 py-2 w-full">
              <option value="">— Pilih pekerja (opsional) —</option>
              {tk.map(p => <option key={p.id} value={p.id}>{p.nama}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <div className="text-sm mb-1">Rate per menit</div>
              <input value={tkRate} disabled className="border rounded-xl px-3 py-2 w-full bg-gray-50"/>
            </label>
            <label className="block">
              <div className="text-sm mb-1">Menit kerja</div>
              <input type="number" min={0} value={menitKerja}
                     onChange={e=>setMenitKerja(Number(e.target.value||0))}
                     className="border rounded-xl px-3 py-2 w-full"/>
            </label>
          </div>
          <div className="mt-2 text-right">Subtotal TK: <b>{money(totalTK)}</b></div>
        </div>

        <div className="border rounded-2xl p-4">
          <h2 className="font-semibold mb-3">Overhead</h2>
          <label className="block mb-2">
            <div className="text-sm mb-1">Komponen</div>
            <select multiple value={overheadIds}
                    onChange={e=>setOverheadIds(Array.from(e.target.selectedOptions).map(o=>o.value))}
                    className="border rounded-xl px-3 py-2 w-full h-36">
              {oh.map(o => <option key={o.id} value={o.id}>{o.nama} — {money(o.nilai||0)}</option>)}
            </select>
          </label>
          <label className="block">
            <div className="text-sm mb-1">Tambahan manual (opsional)</div>
            <input type="number" min={0} value={overheadManual}
                   onChange={e=>setOverheadManual(Number(e.target.value||0))}
                   className="border rounded-xl px-3 py-2 w-full"/>
          </label>
          <div className="mt-2 text-right">Subtotal Overhead: <b>{money(ohTotal)}</b></div>
        </div>
      </section>

      {/* ringkasan */}
      <section className="border rounded-2xl p-4">
        <h2 className="font-semibold mb-3">Ringkasan</h2>
        <div className="grid md:grid-cols-5 gap-3">
          <div className="border rounded-xl p-3"><div className="text-xs opacity-70">Total Bahan</div><div className="text-lg font-semibold">{money(totalBahan)}</div></div>
          <div className="border rounded-xl p-3"><div className="text-xs opacity-70">Total TK</div><div className="text-lg font-semibold">{money(totalTK)}</div></div>
          <div className="border rounded-xl p-3"><div className="text-xs opacity-70">Total Overhead</div><div className="text-lg font-semibold">{money(ohTotal)}</div></div>
          <div className="border rounded-xl p-3 bg-gray-50"><div className="text-xs opacity-70">HPP Total / Batch</div><div className="text-lg font-semibold">{money(totalBatch)}</div></div>
          <div className="border rounded-xl p-3 bg-gray-50"><div className="text-xs opacity-70">COGS / Unit</div><div className="text-lg font-semibold">{money(cogsPerUnit)}</div><div className="text-xs opacity-70 mt-1">Yield: {yieldUnit}</div></div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3 justify-end">
          <button onClick={simpan} disabled={!produkId} className="px-4 py-2 rounded-xl bg-black text-white disabled:opacity-50">
            Simpan Resep / COGS
          </button>
        </div>
      </section>
    </div>
  );
}
