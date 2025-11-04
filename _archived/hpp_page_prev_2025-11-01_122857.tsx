"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

type Row = { id: string; nama: string; unit: string; qty: number; harga: number; };
const UNITS = ["gram", "ml", "pcs"];
const uid = () => Math.random().toString(36).slice(2, 9);
const rp = (n: number) => (isFinite(n) ? n : 0).toLocaleString("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0});

export default function HppPage() {
  const [namaMenu, setNamaMenu] = useState("");
  const [rows, setRows] = useState<Row[]>([
    { id: uid(), nama: "Gula",        unit: "gram", qty: 10,  harga: 500 },
    { id: uid(), nama: "Susu Milkita",unit: "ml",   qty: 100, harga: 2100 },
    { id: uid(), nama: "Kopi Blend",  unit: "gram", qty: 9,   harga: 2800 },
    { id: uid(), nama: "Krimmer",     unit: "gram", qty: 10,  harga: 200 },
  ]);
  const [overhead, setOverhead] = useState(4200);
  const [targetHarga, setTargetHarga] = useState(15000);
  const [includePpn, setIncludePpn] = useState(false);
  const [includeFee, setIncludeFee] = useState(false);

  const totalBahan = useMemo(()=>rows.reduce((s,r)=>s+(r.harga||0),0),[rows]);
  const totalHpp   = useMemo(()=> totalBahan + (overhead||0),[totalBahan,overhead]);

  const hargaKomp = Math.round(totalHpp / (1-0.20));
  const hargaStd  = Math.round(totalHpp / (1-0.30));
  const hargaPrem = Math.round(totalHpp / (1-0.40));

  const feePct = includeFee ? 0.06 : 0;
  const ppnPct = includePpn ? 0.10 : 0;
  const hargaAfterPpn = Math.round(targetHarga*(1+ppnPct));
  const hargaOnline   = Math.round(hargaAfterPpn*(1+feePct));
  const profitNominal = Math.max(0, targetHarga-totalHpp);
  const profitMarginPct = targetHarga>0 ? Math.round((profitNominal/targetHarga)*100) : 0;

  const updateRow = (id:string, patch:Partial<Row>) => setRows(prev=>prev.map(r=>r.id===id?{...r,...patch}:r));
  const delRow = (id:string)=> setRows(prev=>prev.filter(r=>r.id!==id));
  const addRow = ()=> setRows(prev=>[...prev,{id:uid(),nama:"",unit:"gram",qty:0,harga:0}]);

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="mb-6 text-4xl font-extrabold tracking-tight">Kalkulator HPP</h1>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        {/* Nama Menu */}
        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-neutral-700">Nama Menu</label>
          <input value={namaMenu} onChange={(e)=>setNamaMenu(e.target.value)}
            className="w-full rounded-xl border border-neutral-300 px-4 py-3 outline-none focus:ring-2 focus:ring-neutral-900" />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Resep */}
          <div className="lg:col-span-2">
            <div className="grid grid-cols-[1fr_120px_80px_120px_32px] items-center gap-3 border-b pb-2 text-sm font-semibold text-neutral-600">
              <div>Nama Resep</div><div className="text-center">Qty.</div><div></div><div className="text-right">Harga</div><div></div>
            </div>

            {rows.map(r=>(
              <div key={r.id} className="mt-3 grid grid-cols-[1fr_120px_80px_120px_32px] items-center gap-3">
                <div>
                  <div className="relative">
                    <input value={r.nama} onChange={e=>updateRow(r.id,{nama:e.target.value})}
                      className="w-full rounded-xl border border-neutral-300 px-4 py-2.5 outline-none focus:ring-2 focus:ring-neutral-900"
                      placeholder="Pilih/ketik bahan"/>
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 select-none text-neutral-400">▾</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input type="number" min={0} value={r.qty}
                    onChange={e=>updateRow(r.id,{qty:Number(e.target.value||0)})}
                    className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-center outline-none focus:ring-2 focus:ring-neutral-900"/>
                </div>
                <div>
                  <select value={r.unit} onChange={e=>updateRow(r.id,{unit:e.target.value})}
                    className="w-full rounded-xl border border-neutral-300 px-3 py-2 outline-none focus:ring-2 focus:ring-neutral-900">
                    {UNITS.map(u=><option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div className="text-right text-neutral-700">{rp(r.harga)}</div>
                <div className="text-right">
                  <button onClick={()=>delRow(r.id)} className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100" aria-label="hapus">
                    <Trash2 className="h-4 w-4"/>
                  </button>
                </div>
              </div>
            ))}

            <div className="mt-4">
              <button onClick={addRow} className="inline-flex items-center gap-2 rounded-xl bg-neutral-100 px-4 py-2 text-neutral-700 hover:bg-neutral-200">
                Tambah <Plus className="h-4 w-4"/>
              </button>
            </div>
          </div>

          {/* Ringkasan */}
          <div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center justify-between"><span className="text-neutral-600">Total Harga Bahan</span><span className="font-semibold">{rp(totalBahan)}</span></li>
              <li className="flex items-center justify-between"><span className="text-neutral-600">Total Overhead</span>
                <span className="font-semibold">{rp(overhead)}</span></li>
              <li className="mt-2 border-t pt-2 text-base font-semibold flex items-center justify-between">
                <span>Total HPP</span><span>{rp(totalHpp)}</span></li>
            </ul>
          </div>
        </div>

        {/* Harga & Profit */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-2xl border border-neutral-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-lg font-semibold">Target Harga Jual</div>
              <button className="rounded-lg bg-red-100 px-3 py-1 text-sm font-semibold text-red-700 hover:bg-red-200" type="button">
                Bantuan AI ✨
              </button>
            </div>

            <input type="number" min={0} value={targetHarga} onChange={e=>setTargetHarga(Number(e.target.value||0))}
              className="mb-4 w-full rounded-xl border border-neutral-300 px-4 py-3 outline-none focus:ring-2 focus:ring-neutral-900" placeholder="Rp. 0"/>

            <div className="grid grid-cols-3 gap-3 text-center text-sm">
              <button onClick={()=>setTargetHarga(hargaKomp)} className="rounded-xl border border-neutral-300 px-3 py-2 hover:bg-neutral-50">
                <div className="mb-1 text-[11px] text-neutral-500">Kompetitif</div><div className="font-semibold">{rp(hargaKomp)}</div>
              </button>
              <button onClick={()=>setTargetHarga(hargaStd)} className="rounded-xl border-2 border-neutral-900 bg-neutral-900 px-3 py-2 text-white">
                <div className="mb-1 text-[11px] opacity-70">Standar</div><div className="font-semibold">{rp(hargaStd)}</div>
              </button>
              <button onClick={()=>setTargetHarga(hargaPrem)} className="rounded-xl border border-neutral-300 px-3 py-2 hover:bg-neutral-50">
                <div className="mb-1 text-[11px] text-neutral-500">Premium</div><div className="font-semibold">{rp(hargaPrem)}</div>
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-6 text-sm">
              <label className="inline-flex items-center gap-2"><input type="checkbox" checked={includePpn} onChange={e=>setIncludePpn(e.target.checked)}/> Pajak 10% (PBI)</label>
              <label className="inline-flex items-center gap-2"><input type="checkbox" checked={includeFee} onChange={e=>setIncludeFee(e.target.checked)}/> Fee Channel (Grab/GF/SF)</label>
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-4">
            <div className="mb-3 text-lg font-semibold">Estimasi Profit</div>
            <div className="text-3xl font-extrabold">{rp(targetHarga)}</div>
            <div className="mt-1 text-sm"><span className="font-semibold text-green-600">Profit Margin {profitMarginPct}%</span></div>
            <div className="mt-4 space-y-1 text-sm">
              <div><span className="mr-2 font-semibold">{rp(hargaAfterPpn)}</span><span className="text-neutral-500">(After Tax PBI)</span></div>
              <div><span className="mr-2 font-semibold">{rp(hargaOnline)}</span><span className="text-neutral-500">(Online Food)</span></div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-neutral-500">Catatan: perhitungan simulasi. Sesuaikan pajak & fee sesuai outlet.</p>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button type="button" className="rounded-xl bg-[#C3002F] px-6 py-3 font-semibold text-white shadow-sm transition hover:brightness-95"
            onClick={()=>alert("UI-only: aksi Simpan akan dihubungkan ke API nanti.")}>
            Simpan 💾
          </button>
        </div>
      </div>
    </div>
  );
}
