'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

/* ============== TYPES ============== */
type BahanRaw = {
  id: string;
  nama_bahan?: string|null; nama?: string|null; name?: string|null;
  satuan?: string|null; unit?: string|null;
  harga?: number|null;  price?: number|null;
};
type Bahan = { id: string; nama_bahan: string; satuan: string; harga: number };
type Row   = { id: string; bahan_id: string; qty: number; unit: string };

/* ============== HELPERS ============== */
const rp = (n: number) =>
  new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n);

const stableId = 'row-1';
const uid = () => Math.random().toString(36).slice(2,10);
const getOwner = () => {
  if (typeof window==='undefined') return null;
  for (const k of ['x-owner-id','owner_id','owner','USER_OWNER_ID','user_owner_id']){
    const v = localStorage.getItem(k); if (v && v.trim()) return v.trim();
  }
  return null;
};
const normalize = (arr?: BahanRaw[]|null): Bahan[] =>
  (Array.isArray(arr)?arr:[])
    .map(b=>({
      id:String(b.id),
      nama_bahan:(b.nama_bahan ?? b.nama ?? b.name ?? '').toString(),
      satuan:(b.satuan ?? b.unit ?? '').toString(),
      harga: typeof b.harga==='number' ? b.harga : (typeof b.price==='number' ? b.price : 0),
    }))
    .filter(b=>b.id && b.nama_bahan);

/* ============== PAGE ============== */
export default function HPP() {
  const [owner,setOwner] = useState<string|null>(null);
  const [loading,setLoading] = useState(true);
  const [bahan,setBahan] = useState<Bahan[]>([]);
  const [menu,setMenu] = useState('');
  const [rows,setRows] = useState<Row[]>([{id:stableId,bahan_id:'',qty:10,unit:''}]);
  const idRef = useRef(1);
  const [overhead,setOverhead] = useState(4200);
  const [target,setTarget] = useState(18000);
  const [ppn,setPpn] = useState(false);
  const [fee,setFee] = useState(false);

  useEffect(()=>{(async()=>{
    const oid = getOwner(); setOwner(oid); setLoading(true);
    if(!oid){ setBahan([]); setLoading(false); return; }
    const base = process.env.NEXT_PUBLIC_API_URL!;
    const res  = await fetch(`${base}/setup/bahan`,{headers:{'x-owner-id':oid},cache:'no-store'});
    const j = await res.json().catch(()=>({}));
    setBahan(normalize(Array.isArray(j)?j:j?.data));
    setLoading(false);
  })()},[]);

  const getB = (id?:string)=> bahan.find(x=>x.id === (id||''));
  const rowPrice = (r:Row) => Math.max(0, Math.round((getB(r.bahan_id)?.harga ?? 0) * (Number.isFinite(r.qty)?r.qty:0)));
  const totalBahan = useMemo(()=> rows.reduce((s,r)=> s + rowPrice(r), 0), [rows,bahan]);
  const totalHPP   = useMemo(()=> totalBahan + overhead, [totalBahan,overhead]);

  const rec = useMemo(()=>({
    k: Math.max(totalHPP+1000, Math.round(totalHPP*1.10/1000)*1000),
    s: Math.max(totalHPP+3000, Math.round(totalHPP*1.20/1000)*1000),
    p: Math.max(totalHPP+5000, Math.round(totalHPP*1.35/1000)*1000),
  }),[totalHPP]);

  const marginPct = useMemo(()=> target>0 ? Math.max(0, Math.round(((target-totalHPP)/target)*100)) : 0,[target,totalHPP]);
  const afterTax  = useMemo(()=> ppn ? Math.round(target*1.10) : target, [target,ppn]);
  const online    = useMemo(()=> fee ? Math.round(target*1.17) : target, [target,fee]);

  const addRow = () => { idRef.current+=1; setRows(p=>[...p,{id:`row-${idRef.current}-${uid()}`,bahan_id:'',qty:10,unit:''}]); };
  const delRow = (id:string) => setRows(p=> p.length<=1 ? p : p.filter(r=>r.id!==id));
  const onQty  = (id:string,v:string) => { const n=parseFloat((v||'').replace(',','.')); setRows(p=>p.map(r=>r.id===id?{...r,qty:isNaN(n)?0:n}:r)); };
  const onUnit = (id:string,u:string) => setRows(p=>p.map(r=>r.id===id?{...r,unit:u}:r));
  const onBhn  = (id:string,bid:string) => setRows(p=>p.map(r=>{
    if(r.id!==id) return r; const b=getB(bid); return {...r,bahan_id:bid,unit:b?.satuan||r.unit||''};
  }));

  return (
    <div className="min-h-screen bg-[#F6F6F4]">
      <div className="mx-auto max-w-[1180px] px-6 pt-8 pb-4">
        <h1 className="text-[34px] font-extrabold text-[#111827]">Kalkulator HPP</h1>
      </div>

      <div className="mx-auto max-w-[1180px] px-6 grid grid-cols-12 gap-6 pb-10">
        {/* LEFT */}
        <div className="col-span-12 lg:col-span-8">
          <div className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm">
            {/* Nama Menu */}
            <div className="p-6 border-b border-slate-200">
              <label className="block text-sm font-semibold text-slate-700 mb-2">Nama Menu</label>
              <input
                value={menu}
                onChange={(e)=>setMenu(e.target.value)}
                className="w-full h-11 rounded-xl border border-slate-300 px-4 outline-none focus:ring-4 focus:ring-yellow-100"
              />
            </div>

            {/* Nama Resep */}
            <div className="p-6">
              <div className="mb-2 text-sm font-semibold text-slate-700">Nama Resep</div>

              {/* Header grid */}
              <div className="grid grid-cols-12 gap-3 px-1 text-xs text-slate-500 font-semibold">
                <div className="col-span-6"> </div>
                <div className="col-span-2 text-center">Qty.</div>
                <div className="col-span-2 text-center">Unit</div>
                <div className="col-span-2 text-right">Harga</div>
              </div>

              <div className="mt-2">
                {rows.map((r,idx)=>(
                  <div key={r.id} className="relative grid grid-cols-12 gap-3 items-center py-2">
                    {/* Nama bahan */}
                    <div className="col-span-6">
                      <select
                        value={r.bahan_id}
                        onChange={e=>onBhn(r.id,e.target.value)}
                        disabled={loading || bahan.length===0}
                        className="w-full h-9 rounded-xl border border-slate-300 px-3 bg-white"
                      >
                        <option value="" hidden>{loading?'Memuat bahan…':(bahan.length?'Pilih bahan…':'Tidak ada bahan')}</option>
                        {bahan.map(b=> <option key={b.id} value={b.id}>{b.nama_bahan}</option>)}
                      </select>
                    </div>

                    {/* Qty */}
                    <div className="col-span-2">
                      <input
                        inputMode="decimal"
                        value={String(r.qty)}
                        onChange={(e)=>onQty(r.id,e.target.value)}
                        className="w-full h-9 rounded-xl border border-slate-300 px-3 text-center"
                      />
                    </div>

                    {/* Unit */}
                    <div className="col-span-2">
                      <select
                        value={r.unit}
                        onChange={(e)=>onUnit(r.id,e.target.value)}
                        className="w-full h-9 rounded-xl border border-slate-300 px-3"
                      >
                        {getB(r.bahan_id)?.satuan && <option value={getB(r.bahan_id)!.satuan}>{getB(r.bahan_id)!.satuan}</option>}
                        <option value="">{getB(r.bahan_id)?.satuan?`(${getB(r.bahan_id)!.satuan} disarankan)`:'Pilih unit'}</option>
                        {Array.from(new Set(['gram','ml','pcs',...bahan.map(bb=>bb.satuan).filter(Boolean)])).map(u=>(
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                    </div>

                    {/* Harga + garis tipis kolom harga */}
                    <div className="col-span-2">
                      <div className="flex items-center">
                        <div className="h-[1px] bg-slate-200 flex-1 mr-3" />
                        <div className="min-w-[96px] text-right font-semibold">{rp(rowPrice(r))}</div>
                      </div>
                    </div>

                    {/* Delete di kanan */}
                    <button
                      onClick={()=>delRow(r.id)}
                      className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500"
                      title="Hapus"
                    >🗑️</button>

                    {/* separator halus */}
                    {idx<rows.length-1 && <div className="col-span-12 border-b border-slate-100 mt-2" />}
                  </div>
                ))}
              </div>

              <div className="mt-3">
                <button
                  onClick={addRow}
                  className="h-9 rounded-xl bg-[#EDEDED] text-slate-800 px-4 text-sm font-semibold hover:bg-[#e6e6e6] flex items-center gap-2"
                >
                  Tambah <span className="text-base">＋</span>
                </button>
              </div>
            </div>
          </div>

          {/* Target Harga Jual */}
          <div className="mt-6 rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm p-6">
            <div className="text-base font-semibold text-slate-800">Target Harga Jual</div>

            <div className="mt-3 flex items-center gap-3">
              <input
                value={target?String(target):''}
                onChange={(e)=>setTarget(parseInt((e.target.value||'').replace(/\D/g,''),10)||0)}
                placeholder="Rp. 15.000"
                className="w-[220px] h-10 rounded-xl border border-slate-300 px-3"
              />
              <button
                className="h-9 px-3 rounded-xl bg-[#D74646] text-white text-xs font-semibold"
                onClick={()=>setTarget(rec.s)}
              >Bantuan AI ＋</button>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3 max-w-[520px]">
              <button onClick={()=>setTarget(rec.k)} className="h-10 rounded-xl border text-sm font-semibold hover:bg-slate-50">
                Rp {rec.k.toLocaleString('id-ID')}
                <div className="text-[10px] text-slate-500 -mt-1">Kompetitif</div>
              </button>
              <button onClick={()=>setTarget(rec.s)} className="h-10 rounded-xl bg-[#D32F2F] text-white text-sm font-semibold hover:opacity-95">
                Rp {rec.s.toLocaleString('id-ID')}
                <div className="text-[10px] opacity-90 -mt-1">Standar</div>
              </button>
              <button onClick={()=>setTarget(rec.p)} className="h-10 rounded-xl border text-sm font-semibold hover:bg-slate-50">
                Rp {rec.p.toLocaleString('id-ID')}
                <div className="text-[10px] text-slate-500 -mt-1">Premium</div>
              </button>
            </div>

            <div className="mt-3 flex items-center gap-6 text-xs text-slate-700">
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={ppn} onChange={()=>setPpn(v=>!v)} /> Pajak 10% (PPN)
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={fee} onChange={()=>setFee(v=>!v)} /> Fee Channel (Grab/GoFood/ShopeeFood)
              </label>
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="col-span-12 lg:col-span-4">
          <div className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm p-6">
            <div className="space-y-2 text-sm text-slate-800">
              <div className="flex items-center justify-between">
                <span>Total Harga Bahan</span>
                <span className="font-semibold">{rp(totalBahan)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Total Overhead</span>
                <div className="w-36">
                  <input
                    inputMode="numeric"
                    value={String(overhead)}
                    onChange={(e)=>setOverhead(parseInt((e.target.value||'').replace(/\D/g,''),10)||0)}
                    className="w-full h-9 rounded-lg border border-slate-300 px-2 text-right"
                    placeholder="0"
                  />
                </div>
              </div>
              <hr className="my-3"/>
              <div className="flex items-center justify-between">
                <span className="font-bold">Total HPP</span>
                <span className="font-bold">{rp(totalHPP)}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm p-6">
            <div className="text-base font-semibold text-slate-800 mb-3">Estimasi Profit</div>

            <div className="rounded-xl ring-1 ring-slate-200 p-4">
              <div className="text-[40px] leading-none font-extrabold text-slate-900">
                {target ? rp(target) : 'Rp. —'}
                {target>0 && <span className="ml-2 text-xs font-semibold text-green-600">Profit Margin {marginPct}%</span>}
              </div>
              <div className="mt-2 text-sm text-slate-700 space-y-1">
                <div><span className="font-semibold">{rp(afterTax||0)}</span> <span className="text-slate-500 ml-1">(After Tax PPN)</span></div>
                <div><span className="font-semibold">{rp(online||0)}</span> <span className="text-slate-500 ml-1">(Online Food)</span></div>
              </div>
              <p className="mt-3 text-xs text-slate-500 leading-relaxed">
                Estimasi sederhana berdasarkan target harga yang dipilih. Angka pajak & biaya channel hanya simulasi.
              </p>
            </div>

            <button className="mt-4 w-full h-11 rounded-xl bg-[#D32F2F] text-white font-semibold hover:opacity-95">
              Simpan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
