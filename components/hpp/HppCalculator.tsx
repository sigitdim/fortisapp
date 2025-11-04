"use client";

import { useEffect, useMemo, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://api.fortislab.id";
const DEFAULT_OWNER_ID =
  process.env.NEXT_PUBLIC_OWNER_ID || "f6269e9a-bc6d-4f8b-aa45-08affc769e5a";

type Bahan = { id:string; nama_bahan:string; satuan?:string; harga?:number };
type Row = { id:string; bahan_id?:string; nama:string; unit:string; qty:number; hargaPerUnit?:number; harga:number };

const UNITS = ["gram","ml","pcs"];
const uid = () => Math.random().toString(36).slice(2,9);
const rp  = (n:number)=>(isFinite(n)?n:0).toLocaleString("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0});

export default function HppCalculator(){
  // Owner
  const [ownerId,setOwnerId] = useState("");
  useEffect(()=>{
    const s = localStorage.getItem("owner_id");
    if (s) setOwnerId(s); else setOwnerId(DEFAULT_OWNER_ID);
  },[]);
  useEffect(()=>{ if(ownerId) localStorage.setItem("owner_id", ownerId); },[ownerId]);

  // State
  const [bahanList,setBahanList] = useState<Bahan[]>([]);
  const [loading,setLoading] = useState(false);
  const [msg,setMsg] = useState<{ok?:string; err?:string}|null>(null);

  const [namaMenu,setNamaMenu] = useState("");
  const [rows,setRows] = useState<Row[]>([{ id:uid(), nama:"", unit:"gram", qty:0, harga:0 }]);
  const [overhead] = useState(4200);
  const [targetHarga,setTargetHarga] = useState(18000);
  const [ppn,setPpn] = useState(false);
  const [fee,setFee] = useState(false);
  const [saving,setSaving] = useState(false);

  // Fetch /setup/bahan
  async function loadBahan(){
    try{
      setLoading(true);
      const hdr = ownerId || DEFAULT_OWNER_ID;
      const res = await fetch(`${API_BASE}/setup/bahan`, {
        headers: { "x-owner-id": hdr, "Content-Type":"application/json" },
        cache: "no-store",
      });
      const text = await res.text();
      let json:any; try{ json = JSON.parse(text); }catch{ json = text; }
      const raw = Array.isArray(json) ? json : (json?.data ?? []);
      const data: Bahan[] = (raw as any[]).map((x:any)=>({
        id: String(x.id ?? x.bahan_id ?? ""),
        nama_bahan: String(x.nama_bahan ?? x.nama ?? ""),
        satuan: String(x.satuan ?? x.unit ?? ""),
        harga: Number(x.harga ?? x.harga_beli ?? x.price ?? 0),
      }));
      setBahanList(data);
      if (!data.length) setMsg({err:"Data bahan kosong. Cek Owner ID / BE."});
    }catch(e:any){
      setMsg({err:e?.message||"Gagal memuat bahan"}); setBahanList([]);
    }finally{ setLoading(false); }
  }
  useEffect(()=>{ if (ownerId) loadBahan(); },[ownerId]);

  // Hitung
  const recalc = (r:Row):Row => ({...r, harga: Math.max(0, Math.round((r.hargaPerUnit??0)*(r.qty||0))) });
  const updateRow = (id:string, patch:Partial<Row>) => setRows(p=>p.map(r=>r.id===id? recalc({...r,...patch}):r));
  const addRow = ()=> setRows(p=>[...p,{id:uid(), nama:"", unit:"gram", qty:0, harga:0}]);
  const delRow = (id:string)=> setRows(p=>p.filter(r=>r.id!==id));
  const pickBahan = (rowId:string, bahanId:string)=>{
    const b = bahanList.find(x=>x.id===bahanId);
    setRows(p=>p.map(r=> r.id!==rowId ? r : recalc({
      ...r,
      bahan_id: b?.id,
      nama: b?.nama_bahan || "",
      unit: b?.satuan || r.unit || "gram",
      hargaPerUnit: b?.harga ?? 0,
    })));
  };

  const totalBahan = useMemo(()=>rows.reduce((s,r)=>s+(r.harga||0),0),[rows]);
  const totalHpp   = useMemo(()=>totalBahan+overhead,[totalBahan,overhead]);
  const hargaKomp = Math.round(totalHpp/(1-0.20));
  const hargaStd  = Math.round(totalHpp/(1-0.35));
  const hargaPrem = Math.round(totalHpp/(1-0.55));
  const afterTax  = Math.round(targetHarga*(1+(ppn?0.10:0)));
  const online    = Math.round(afterTax*(1+(fee?0.06:0)));
  const marginPct = targetHarga>0 ? Math.round(((targetHarga-totalHpp)/targetHarga)*100) : 0;

  return (
    <div className="mx-auto max-w-6xl">
      {/* Debug overlay kecil */}
      <div style={{position:"fixed",right:12,bottom:12,zIndex:9999,background:"#111",color:"#fff",padding:"6px 10px",borderRadius:10,fontSize:12}}>
        bahan:{bahanList.length} • {loading?"loading":"ready"} {msg?.err?"• ERR":""}
      </div>

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-[32px] font-extrabold tracking-tight">Kalkulator HPP</h1>
        <div className="flex items-center gap-2 text-[12px]">
          <span className="text-neutral-500">Owner ID</span>
          <input value={ownerId} onChange={(e)=>setOwnerId(e.target.value.trim())}
            className="h-9 w-[260px] rounded-lg border border-neutral-300 px-2 outline-none focus:ring-2 focus:ring-neutral-900"
            placeholder="UUID owner"/>
          <button onClick={loadBahan}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-neutral-300 px-3 hover:bg-neutral-50">
            ↻ Refresh Bahan
          </button>
        </div>
      </div>

      {msg?.err && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-red-700">{msg.err}</div>}
      {msg?.ok  && <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-emerald-700">{msg.ok}</div>}

      <div className="rounded-2xl border border-neutral-200 bg-white p-6">
        {/* Nama Menu */}
        <div className="mb-6">
          <label className="mb-2 block text-[14px] font-medium text-neutral-700">Nama Menu</label>
          <input value={namaMenu} onChange={(e)=>setNamaMenu(e.target.value)}
            className="h-11 w-full rounded-xl border border-neutral-300 px-4 text-[15px] outline-none focus:ring-2 focus:ring-neutral-900"/>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          {/* Tabel resep */}
          <div>
            <div className="grid w-full grid-cols-[1fr_120px_90px_160px_30px] items-center gap-3 border-b pb-2 text-[12px] font-semibold text-neutral-600">
              <div>
                Nama Resep{" "}
                <span className="ml-2 rounded bg-neutral-100 px-2 py-0.5 text-[11px] font-normal text-neutral-600">
                  {loading ? "memuat..." : `${bahanList.length} bahan`}
                </span>
              </div>
              <div className="text-center">Qty.</div>
              <div></div><div className="text-right">Harga</div><div></div>
            </div>

            {rows.map(r=>(
              <div key={r.id} className="mt-3 grid grid-cols-[1fr_120px_90px_160px_30px] items-center gap-3">
                {/* pilih bahan */}
                <div>
                  <select
                    value={r.bahan_id || ""}
                    onChange={(e)=>pickBahan(r.id, e.target.value)}
                    className="h-11 w-full rounded-xl border border-neutral-300 px-3 text-[15px] outline-none focus:ring-2 focus:ring-neutral-900"
                  >
                    <option value="">{loading ? "Memuat bahan..." : "— pilih bahan —"}</option>
                    {bahanList.map(b=>(
                      <option key={b.id} value={b.id}>{b.nama_bahan}</option>
                    ))}
                  </select>
                </div>

                {/* qty */}
                <div>
                  <input type="number" min={0} value={r.qty}
                    onChange={(e)=>updateRow(r.id,{qty:Number(e.target.value||0)})}
                    className="h-11 w-full rounded-xl border border-neutral-300 px-3 text-center text-[15px] outline-none focus:ring-2 focus:ring-neutral-900"/>
                </div>

                {/* unit + hint harga/unit */}
                <div>
                  <select value={r.unit} onChange={(e)=>updateRow(r.id,{unit:e.target.value})}
                    className="h-11 w-full rounded-xl border border-neutral-300 px-3 text-[15px] outline-none focus:ring-2 focus:ring-neutral-900">
                    {UNITS.map(u=><option key={u} value={u}>{u}</option>)}
                  </select>
                  <div className="mt-1 text-[11px] text-neutral-500">
                    {r.hargaPerUnit ? `${rp(r.hargaPerUnit)} / ${r.unit}` : "—"}
                  </div>
                </div>

                {/* subtotal */}
                <div className="h-11 rounded-xl border border-neutral-200 px-4 text-right leading-[44px] text-[15px]">
                  {rp(r.harga)}
                </div>

                <div className="text-right">
                  <button onClick={()=>delRow(r.id)} className="rounded-md p-2 text-neutral-500 hover:bg-neutral-100">🗑️</button>
                </div>
              </div>
            ))}

            <div className="mt-4">
              <button onClick={addRow} className="inline-flex h-10 items-center gap-2 rounded-xl bg-neutral-100 px-4 text-[14px] text-neutral-700 hover:bg-neutral-200">
                Tambah +
              </button>
            </div>
          </div>

          {/* Ringkasan */}
          <aside className="rounded-xl border border-neutral-200 bg-white p-4">
            <ul className="space-y-2 text-[14px]">
              <li className="flex items-center justify-between"><span className="text-neutral-600">Total Harga Bahan</span><span className="font-semibold">{rp(totalBahan)}</span></li>
              <li className="flex items-center justify-between"><span className="text-neutral-600">Total Overhead</span><span className="font-semibold">{rp(overhead)}</span></li>
              <li className="mt-1 border-t pt-2 text-[16px] font-semibold flex items-center justify-between"><span>Total HPP</span><span>{rp(totalHpp)}</span></li>
            </ul>
          </aside>
        </div>

        {/* Target & Profit */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-2xl border border-neutral-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-[16px] font-semibold">Target Harga Jual</div>
              <button className="rounded-md bg-red-100 px-3 py-1 text-[12px] font-semibold text-red-700">Bantuan AI ✨</button>
            </div>
            <input value={targetHarga} onChange={(e)=>setTargetHarga(Number(e.target.value||0))} type="number" min={0}
              className="mb-3 h-11 w-full rounded-xl border border-neutral-300 px-4 text-[15px] outline-none focus:ring-2 focus:ring-neutral-900"/>
            <div className="grid grid-cols-3 gap-3 text-center">
              <button onClick={()=>setTargetHarga(hargaKomp)} className="rounded-xl border border-neutral-300 px-3 py-2 text-[13px] hover:bg-neutral-50"><div className="text-[11px] text-neutral-500">Kompetitif</div><div className="font-semibold">{rp(hargaKomp)}</div></button>
              <button onClick={()=>setTargetHarga(hargaStd)}  className="rounded-xl bg-[#c0002f] px-3 py-2 text-[13px] text-white"><div className="text-[11px] opacity-80">Standar</div><div className="font-semibold">{rp(hargaStd)}</div></button>
              <button onClick={()=>setTargetHarga(hargaPrem)} className="rounded-xl border border-neutral-300 px-3 py-2 text-[13px] hover:bg-neutral-50"><div className="text-[11px] text-neutral-500">Premium</div><div className="font-semibold">{rp(hargaPrem)}</div></button>
            </div>
            <div className="mt-3 flex flex-wrap gap-6 text-[13px]">
              <label className="inline-flex items-center gap-2"><input type="checkbox" checked={ppn} onChange={(e)=>setPpn(e.target.checked)}/> Pajak 10% (PBI)</label>
              <label className="inline-flex items-center gap-2"><input type="checkbox" checked={fee} onChange={(e)=>setFee(e.target.checked)}/> Fee Channel (Grab/GF/SF)</label>
            </div>
          </section>

          <aside className="rounded-2xl border border-neutral-200 bg-white p-4">
            <div className="mb-2 text-[16px] font-semibold">Estimasi Profit</div>
            <div className="text-[32px] font-extrabold leading-none">{rp(targetHarga)}</div>
            <div className="mt-1 text-[13px]"><span className="font-semibold text-green-600">Profit Margin {marginPct}%</span></div>
            <div className="mt-3 space-y-1 text-[13px]">
              <div><span className="mr-2 font-semibold">{rp(afterTax)}</span><span className="text-neutral-500">(After Tax PBI)</span></div>
              <div><span className="mr-2 font-semibold">{rp(online)}</span><span className="text-neutral-500">(Online Food)</span></div>
            </div>
            <p className="mt-3 text-[12px] leading-relaxed text-neutral-500">Perhitungan simulasi; sesuaikan pajak & fee sesuai outlet.</p>
            <button disabled={saving} onClick={async()=>{
              setSaving(true); setMsg(null);
              try{
                const hdr = ownerId || DEFAULT_OWNER_ID;
                const items = rows.filter(r=>r.bahan_id && r.qty>0 && r.unit)
                                  .map(r=>({bahan_id:r.bahan_id!, qty:r.qty, unit:r.unit}));
                if(!items.length) throw new Error("Pilih bahan dan isi qty dulu.");
                const res = await fetch(`${API_BASE}/setup/bom`, {
                  method:"POST", headers:{ "Content-Type":"application/json", "x-owner-id": hdr },
                  body: JSON.stringify({ produk: (namaMenu||"Produk Tanpa Nama").trim(), items })
                });
                if(!res.ok) throw new Error(`POST /setup/bom ${res.status}`);
                setMsg({ok:"BOM tersimpan ✔"});
              }catch(e:any){ setMsg({err:e?.message||"Gagal simpan BOM"}); }
              finally{ setSaving(false); }
            }} className="mt-4 h-11 w-full rounded-xl bg-[#c0002f] text-[14px] font-semibold text-white hover:brightness-95 disabled:opacity-60">
              {saving ? "Menyimpan..." : "Simpan 💾"}
            </button>
          </aside>
        </div>
      </div>
    </div>
  );
}
