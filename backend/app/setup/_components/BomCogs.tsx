'use client';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { api } from '@/app/lib/api';

type Bahan = {
  id: string; nama: string;
  satuan?: string;
  harga_per_satuan?: number; // alias harga
  harga?: number;
};
type Overhead = { id: string; nama: string; nominal?: number; [k:string]: any };
type TK = { id: string; nama: string; gaji_bulanan?: number; salary?: number; monthly_salary?: number; [k:string]: any };

type ResepRow = {
  rid: string;
  bahanId?: string;
  nama?: string;
  qty?: number;
  unit?: string; // unit yg dipakai user untuk qty (default ikut bahan.satuan)
};

const toNum = (v:any)=> {
  if (v===null || v===undefined || v==='') return undefined;
  const s = String(v).replace(/[^0-9.-]/g,'');
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
};
const fmt = (n?:number)=> typeof n==='number' ? n.toLocaleString() : '-';
const rid = ()=> Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2);

// --- unit conversion helpers (basic)
const UMAP: Record<string,string> = {
  gram: 'g', g: 'g', kg: 'kg',
  ml: 'ml', l: 'l', lt: 'l',
  pcs: 'pcs', pc: 'pcs'
};
function normUnit(u?:string){ return (u||'').toLowerCase().trim().replace(/\./g,''); }
function canonical(u?:string){ return UMAP[normUnit(u)] || normUnit(u) || ''; }
function convertQtyToPriceUnit(qty:number, qtyUnit?:string, priceUnit?:string){
  const q = canonical(qtyUnit);
  const p = canonical(priceUnit);
  if (!q || !p || q===p) return qty;

  // gram <-> kg
  if (q==='g' && p==='kg') return qty/1000;
  if (q==='kg' && p==='g') return qty*1000;

  // ml <-> l
  if (q==='ml' && p==='l') return qty/1000;
  if (q==='l' && p==='ml') return qty*1000;

  // pcs default 1:1
  return qty; // fallback: no conversion
}

const ENDPOINTS = {
  bahan: '/setup/bahan',
  overhead: '/setup/overhead',
  tk: '/setup/tenaga_kerja',
  bom: '/setup/bom' // ganti kalau beda
};

export default function BomCogs(){
  const [bahan, setBahan] = useState<Bahan[]>([]);
  const [overhead, setOverhead] = useState<Overhead[]>([]);
  const [tk, setTK] = useState<TK[]>([]);
  const [isPending, startTransition] = useTransition();

  // form state
  const [produk, setProduk] = useState<string>('');
  const [outputBatch, setOutputBatch] = useState<number>(1);
  const [outputBulanan, setOutputBulanan] = useState<number>(1000); // pembagi alokasi
  const [rows, setRows] = useState<ResepRow[]>([{ rid: rid() }]);

  // pricing
  const [hargaJual, setHargaJual] = useState<number|undefined>(undefined);
  const [marginRp, setMarginRp] = useState<number|undefined>(undefined);
  const [marginPct, setMarginPct] = useState<number|undefined>(undefined);

  async function load(){
    // muat semua tanpa search
    await Promise.all([loadBahan(''), loadOH(), loadTK()]);
  }

  async function loadBahan(q:string){
    try{
      const url = q ? ENDPOINTS.bahan + '?q=' + encodeURIComponent(q) : ENDPOINTS.bahan;
      const r:any = await api(url);
      const arr = Array.isArray(r?.data) ? r.data : (Array.isArray(r) ? r : []);
      const mapB = (x:any)=>({
        id: x?.id ?? (x?.bahan_id ?? (Math.random().toString(36).slice(2))),
        nama: x?.nama ?? x?.name ?? x?.title ?? x?.nama_bahan ?? '-',
        satuan: x?.satuan ?? x?.unit ?? x?.units,
        harga_per_satuan: (()=>{
          const toNum=(v:any)=>{if(v===null||v===undefined||v==='')return undefined; const s=String(v).replace(/[^0-9.-]/g,''); if(!s)return undefined; const n=Number(s); return Number.isFinite(n)?n:undefined;};
          return toNum(x?.harga_per_satuan) ?? toNum(x?.harga) ?? toNum(x?.price_per_unit);
        })()
      });
      setBahan(arr.map(mapB));
    }catch{ setBahan([]); }
  }
  async function loadOH(){
    try{
      const r:any = await api(ENDPOINTS.overhead);
      const arr = Array.isArray(r?.data)?r.data:(Array.isArray(r)?r:[]);
      const toNum=(v:any)=>{if(v===null||v===undefined||v==='')return undefined; const s=String(v).replace(/[^0-9.-]/g,''); if(!s)return undefined; const n=Number(s); return Number.isFinite(n)?n:undefined;};
      const m=(x:any)=>({ id:x?.id??x?.overhead_id??(Math.random().toString(36).slice(2)),
        nama:x?.nama??x?.name??x?.title??x?.nama_overhead??'-',
        nominal: toNum(x?.nominal)??toNum(x?.biaya)??toNum(x?.nilai)??toNum(x?.amount)??toNum(x?.cost)??toNum(x?.harga)??toNum(x?.biaya_per_bulan)??toNum(x?.nominal_bulanan)
      });
      setOverhead(arr.map(m));
    }catch{ setOverhead([]); }
  }
  async function loadTK(){
    try{
      const r:any = await api(ENDPOINTS.tk);
      const arr = Array.isArray(r?.data)?r.data:(Array.isArray(r)?r:[]);
      const toNum=(v:any)=>{if(v===null||v===undefined||v==='')return undefined; const s=String(v).replace(/[^0-9.-]/g,''); if(!s)return undefined; const n=Number(s); return Number.isFinite(n)?n:undefined;};
      const m=(x:any)=>({ id:x?.id??x?.tk_id??x?.tenaga_kerja_id??(Math.random().toString(36).slice(2)),
        nama:x?.nama??x?.name??x?.title??'-',
        gaji_bulanan: toNum(x?.gaji_bulanan)??toNum(x?.salary)??toNum(x?.monthly_salary)
      });
      setTK(arr.map(m));
    }catch{ setTK([]); }
  }
    const [b, o, t] = await Promise.all([
      api('/setup/bahan').catch(()=>[]),
      api('/setup/overhead').catch(()=>[]),
      api('/setup/tenaga_kerja').catch(()=>[])
    ]);
    const mapB = (x:any):Bahan => ({
      id: x?.id ?? rid(),
      nama: x?.nama ?? x?.name ?? x?.title ?? '-',
      satuan: x?.satuan ?? x?.unit ?? x?.units,
      harga_per_satuan: toNum(x?.harga_per_satuan) ?? toNum(x?.harga)
    });
    const mapO = (x:any):Overhead => ({
      id: x?.id ?? rid(),
      nama: x?.nama ?? x?.name ?? x?.title ?? '-',
      nominal:
        toNum(x?.nominal) ?? toNum(x?.biaya) ?? toNum(x?.nilai) ?? toNum(x?.amount) ??
        toNum(x?.cost) ?? toNum(x?.harga) ?? toNum(x?.biaya_per_bulan) ?? toNum(x?.nominal_bulanan)
    });
    const mapT = (x:any):TK => ({
      id: x?.id ?? rid(),
      nama: x?.nama ?? x?.name ?? x?.title ?? '-',
      gaji_bulanan: toNum(x?.gaji_bulanan) ?? toNum(x?.salary) ?? toNum(x?.monthly_salary)
    });
    setBahan((Array.isArray(b?.data)?b.data:b).map(mapB));
    setOverhead((Array.isArray(o?.data)?o.data:o).map(mapO));
    setTK((Array.isArray(t?.data)?t.data:t).map(mapT));
  }
  useEffect(()=>{ startTransition(load); },[]);

  // derived
  const bahanById = useMemo(()=> {
    const m = new Map<string,Bahan>();
    bahan.forEach(x=>m.set(x.id, x));
    return m;
  }, [bahan]);

  const totalOverheadBulanan = useMemo(()=> overhead.reduce((s,o)=> s + (o.nominal||0), 0), [overhead]);
  const totalGajiBulanan = useMemo(()=> tk.reduce((s,t)=> s + (t.gaji_bulanan||0), 0), [tk]);

  const alokasiOHPerUnit = useMemo(()=> {
    if (!outputBulanan) return 0;
    return Math.round(totalOverheadBulanan / outputBulanan);
  }, [totalOverheadBulanan, outputBulanan]);

  const alokasiTKPerUnit = useMemo(()=> {
    if (!outputBulanan) return 0;
    return Math.round(totalGajiBulanan / outputBulanan);
  }, [totalGajiBulanan, outputBulanan]);

  const totalBahanPerBatch = useMemo(()=>{
    return rows.reduce((sum, r)=>{
      const b = r.bahanId ? bahanById.get(r.bahanId) : undefined;
      if (!b) return sum;
      const qty = r.qty || 0;
      const qtyInPriceUnit = convertQtyToPriceUnit(qty, r.unit || b.satuan, b.satuan);
      const price = b.harga_per_satuan || toNum(b.harga) || 0;
      return sum + qtyInPriceUnit * price;
    }, 0);
  }, [rows, bahanById]);

  const cogsPerUnit = useMemo(()=>{
    const bahanPerUnit = outputBatch ? totalBahanPerBatch / outputBatch : 0;
    return Math.round(bahanPerUnit + alokasiOHPerUnit + alokasiTKPerUnit);
  }, [totalBahanPerBatch, outputBatch, alokasiOHPerUnit, alokasiTKPerUnit]);

  // harga jual / margin 2 arah
  useEffect(()=>{
    if (hargaJual!==undefined){
      const m = hargaJual - cogsPerUnit;
      setMarginRp(m);
      setMarginPct(cogsPerUnit ? Math.round((m/cogsPerUnit)*1000)/10 : 0);
    }
  }, [hargaJual, cogsPerUnit]);
  useEffect(()=>{
    // kalau user edit marginPct → hitung harga
    if (marginPct!==undefined && marginPct!==null && !Number.isNaN(marginPct)){
      const hj = Math.round(cogsPerUnit * (1 + (marginPct/100)));
      setHargaJual(hj);
      setMarginRp(hj - cogsPerUnit);
    }
  }, [marginPct]); // eslint-disable-line

  function addRow(){
    setRows(prev=> [...prev, { rid: rid() } ]);
  }
  function removeRow(ridStr:string){
    setRows(prev=> prev.filter(x=>x.rid!==ridStr));
  }
  function patchRow(ridStr:string, patch: Partial<ResepRow>){
    setRows(prev=> prev.map(x=> x.rid===ridStr ? {...x, ...patch} : x));
  }

  const unitOptions = ['kg','g','l','ml','pcs'];

  async function saveBom(){
    const items = rows
      .filter(r=>r.bahanId && (r.qty||0)>0)
      .map(r=>{
        const b = r.bahanId ? bahanById.get(r.bahanId) : undefined;
        const qty = r.qty || 0;
        const unit = r.unit || b?.satuan || '';
        const price = b?.harga_per_satuan || 0;
        const sub = convertQtyToPriceUnit(qty, unit, b?.satuan) * price;
        return {
          bahan_id: r.bahanId,
          nama_bahan: b?.nama,
          qty,
          unit,
          harga_satuan: price,
          subtotal: Math.round(sub)
        };
      });

    const payload = {
      produk,
      output_per_batch: outputBatch,
      output_per_bulan: outputBulanan,
      items,
      alokasi_overhead_per_unit: alokasiOHPerUnit,
      alokasi_tk_per_unit: alokasiTKPerUnit,
      cogs_per_unit: cogsPerUnit,
      harga_jual: hargaJual,
      margin_rp: marginRp,
      margin_pct: marginPct
    };

    await api(ENDPOINTS.bom, { method:'POST', json: payload });
    alert('BOM & COGS tersimpan.');
  }

  return (
    <div className="rounded-2xl border shadow-sm bg-white overflow-hidden">
      <div className="p-4 sm:p-6 border-b bg-gradient-to-b from-gray-50 to-white sticky top-0">
        <h2 className="text-lg sm:text-xl font-semibold">Resep / BOM & Perhitungan COGS</h2>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-600">Produk</label>
            <input className="w-full border rounded-lg px-3 py-2" placeholder="Nama produk…" value={produk} onChange={e=>setProduk(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-gray-600">Output per batch (unit)</label>
              <input type="number" className="w-full border rounded-lg px-3 py-2" value={outputBatch}
                onChange={e=>setOutputBatch(toNum(e.target.value)||0)} />
            </div>
            <div>
              <label className="text-sm text-gray-600">Output per bulan (unit) untuk alokasi</label>
              <input type="number" className="w-full border rounded-lg px-3 py-2" value={outputBulanan}
                onChange={e=>setOutputBulanan(toNum(e.target.value)||0)} />
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="p-3 rounded-lg bg-white border">
            <div className="text-gray-600">Alokasi Overhead / unit (Rp)</div>
            <div className="text-2xl font-semibold">{fmt(alokasiOHPerUnit)}</div>
          </div>
          <div className="p-3 rounded-lg bg-white border">
            <div className="text-gray-600">Alokasi TK / unit (Rp)</div>
            <div className="text-2xl font-semibold">{fmt(alokasiTKPerUnit)}</div>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <div className="mb-3 flex items-center justify-between gap-2">
  <div className="font-medium">Tambah Bahan ke Resep</div>
  <div className="flex items-center gap-2">
    <input
      placeholder="Cari bahan…"
      className="border rounded-lg px-3 py-1.5 text-sm"
      onChange={(e)=>{ const q=e.target.value; if(q.length>=2){ loadBahan(q); } if(q.length===0){ loadBahan(''); } }}
    />
    <button className="px-3 py-1.5 rounded-lg border text-sm hover:bg-gray-50" onClick={()=>loadBahan('')}>Refresh</button>
    <span className="text-xs text-gray-500">({bahan.length} bahan dimuat)</span>
  </div>
</div>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-2 border-b">Bahan</th>
                <th className="text-right p-2 border-b">Qty</th>
                <th className="text-left p-2 border-b">Unit</th>
                <th className="text-right p-2 border-b">Harga Satuan</th>
                <th className="text-right p-2 border-b">Subtotal</th>
                <th className="p-2 border-b w-24">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r=>{
                const b = r.bahanId ? bahanById.get(r.bahanId) : undefined;
                const unit = r.unit || b?.satuan || '';
                const qty = r.qty || 0;
                const price = b?.harga_per_satuan || 0;
                const sub = convertQtyToPriceUnit(qty, unit, b?.satuan) * price;

                return (
                  <tr key={r.rid} className="odd:bg-gray-50/40">
                    <td className="p-2 border-b min-w-[220px]">
                      <select
    className="border rounded px-2 py-1 w-full"
    value={r.bahanId || ''}
    onChange={e=>{
      const id = e.target.value || undefined;
      const bn = id ? bahanById.get(id) : undefined;
      patchRow(r.rid, { bahanId:id, nama: bn?.nama, unit: bn?.satuan });
    }}>
    <option value="">— pilih bahan —</option>
    {bahan.map(bn=>(
      <option key={bn.id} value={bn.id}>
        {bn.nama} {bn.satuan?`(${bn.satuan})`:''}
      </option>
    ))}
  </select>
                    </td>
                    <td className="p-2 border-b text-right">
                      <input type="number" step="0.01" className="border rounded px-2 py-1 w-28 text-right"
                        value={r.qty ?? ''} onChange={e=>patchRow(r.rid, { qty: toNum(e.target.value)||0 })} />
                    </td>
                    <td className="p-2 border-b">
                      <select className="border rounded px-2 py-1 w-28"
                        value={unit} onChange={e=>patchRow(r.rid, { unit: e.target.value })}>
                        <option value="">—</option>
                        {unitOptions.map(u=><option key={u} value={u}>{u}</option>)}
                      </select>
                    </td>
                    <td className="p-2 border-b text-right">{fmt(price)}</td>
                    <td className="p-2 border-b text-right">{fmt(sub)}</td>
                    <td className="p-2 border-b text-center">
                      <button className="px-2 py-1 rounded border hover:bg-gray-50" onClick={()=>removeRow(r.rid)}>Delete</button>
                    </td>
                  </tr>
                );
              })}
              <tr>
                <td colSpan={6} className="p-2">
                  <button className="px-3 py-2 rounded-lg border hover:bg-gray-50" onClick={addRow}>+ Tambah baris</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3 rounded-lg border">
            <div className="text-gray-600 text-sm">Total bahan / batch</div>
            <div className="text-2xl font-semibold">{fmt(totalBahanPerBatch)}</div>
          </div>
          <div className="p-3 rounded-lg border">
            <div className="text-gray-600 text-sm">COGS per unit</div>
            <div className="text-2xl font-semibold">{fmt(cogsPerUnit)}</div>
          </div>
          <div className="p-3 rounded-lg border">
            <div className="text-gray-600 text-sm">COGS per batch</div>
            <div className="text-2xl font-semibold">{fmt(outputBatch ? cogsPerUnit*outputBatch : 0)}</div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm text-gray-600">Harga jual (opsional)</label>
            <input type="number" className="w-full border rounded-lg px-3 py-2"
              value={hargaJual ?? ''} onChange={e=>setHargaJual(toNum(e.target.value))} />
          </div>
          <div>
            <label className="text-sm text-gray-600">Margin (Rp / %)</label>
            <div className="grid grid-cols-2 gap-2">
              <input type="number" className="w-full border rounded-lg px-3 py-2"
                value={marginRp ?? ''} onChange={e=>setMarginRp(toNum(e.target.value))}
                placeholder="Rp" />
              <input type="number" className="w-full border rounded-lg px-3 py-2"
                value={marginPct ?? ''} onChange={e=>setMarginPct(toNum(e.target.value))}
                placeholder="%" />
            </div>
            {marginRp!==undefined && marginPct!==undefined && (
              <div className="text-xs text-gray-500 mt-1">
                Saran harga jual: {fmt(hargaJual)}
              </div>
            )}
          </div>
          <div className="p-3 rounded-lg border bg-gray-50">
            <div className="text-sm text-gray-600">Ringkas</div>
            <div className="mt-1 text-sm">
              OH/unit: <b>{fmt(alokasiOHPerUnit)}</b>, TK/unit: <b>{fmt(alokasiTKPerUnit)}</b>
            </div>
            <div className="text-sm">
              Bahan/unit: <b>{fmt(outputBatch ? totalBahanPerBatch/outputBatch : 0)}</b>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
