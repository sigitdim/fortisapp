'use client';
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/app/lib/api';

type Promo = {
  id?: string;
  nama: string;
  type: 'diskon'|'bundling'|'b1g1'|'tebus';
  aktif: boolean;
  // field dinamis
  diskon_pct?: number;    // diskon
  diskon_rp?: number;
  bundle_ids?: string[];  // bundling
  b1g1_produk_id?: string; // b1g1
  tebus_min_qty?: number; // tebus murah
  tebus_harga?: number;
  produk_ids?: string[];  // target produk
};

type Produk = { id: string; nama: string; harga_jual?: number };

const toNum=(v:any)=>{ if(v===null||v===undefined||v==='') return undefined; const s=String(v).replace(/[^0-9.-]/g,''); if(!s) return undefined; const n=Number(s); return Number.isFinite(n)?n:undefined; };

export default function PromoPage(){
  const [produk, setProduk] = useState<Produk[]>([]);
  const [model, setModel] = useState<Promo>({ nama:'', type:'diskon', aktif:true, produk_ids:[] });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string|null>(null);

  async function loadProduk(){
    try{
      const r = await api('/produk').catch(()=>api('/pricing/final'));
      const arr = Array.isArray(r?.data)? r.data : (Array.isArray(r)? r : []);
      setProduk(arr.map((x:any)=>({ id: x?.id ?? crypto.randomUUID(), nama: x?.nama_produk ?? x?.nama ?? x?.name ?? '-', harga_jual: +x?.harga_jual || +x?.price || 0 })));
    }catch{ setProduk([]); }
  }
  useEffect(()=>{ loadProduk(); },[]);

  function toggleProduk(id:string){
    setModel(m=>{
      const set = new Set(m.produk_ids||[]);
      set.has(id) ? set.delete(id) : set.add(id);
      return {...m, produk_ids: Array.from(set)};
    });
  }

  const preview = useMemo(()=>{
    // kalkulasi sederhana preview
    const items = (model.produk_ids||[]).map(id=> produk.find(p=>p.id===id)).filter(Boolean) as Produk[];
    if (model.type==='diskon'){
      const pct = toNum(model.diskon_pct)||0, rp=toNum(model.diskon_rp)||0;
      return items.map(p=>({
        nama: p.nama,
        harga_awal: p.harga_jual||0,
        harga_promo: Math.max(0, Math.round((p.harga_jual||0) * (1 - pct/100) - rp))
      }));
    }
    if (model.type==='bundling'){
      const total = items.reduce((s,p)=>s+(p.harga_jual||0),0);
      return [{ nama: `Bundle (${items.length} item)`, harga_awal: total, harga_promo: Math.round(total*0.9)}];
    }
    if (model.type==='b1g1'){
      const target = produk.find(p=>p.id===model.b1g1_produk_id);
      const h = target?.harga_jual||0;
      return [{ nama: target?.nama||'-', harga_awal: h*2, harga_promo: h }];
    }
    if (model.type==='tebus'){
      const h = toNum(model.tebus_harga)||0;
      const q = toNum(model.tebus_min_qty)||2;
      return [{ nama: `Tebus murah (min ${q} pcs)`, harga_awal: NaN, harga_promo: h }];
    }
    return [];
  }, [model, produk]);

  async function save(){
    try{
      setSaving(true); setErr(null);
      await api('/promo', { method:'POST', json: model });
      alert('Promo tersimpan.');
      setModel({ nama:'', type:'diskon', aktif:true, produk_ids:[] });
    }catch(e:any){ setErr(e?.message||'Gagal menyimpan'); }
    finally{ setSaving(false); }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Promo</h1>
        <button onClick={save} disabled={saving} className="px-4 py-2 rounded-lg bg-black text-white hover:opacity-90 disabled:opacity-40">
          {saving ? 'Menyimpan…' : 'Simpan'}
        </button>
      </div>

      {err && <div className="text-red-600">{err}</div>}

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <div className="rounded-2xl border p-4 space-y-3">
            <div>
              <label className="text-sm text-gray-600">Nama Promo</label>
              <input className="w-full border rounded-lg px-3 py-2" value={model.nama} onChange={e=>setModel(m=>({...m, nama:e.target.value}))} />
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <label className="text-sm text-gray-600">Tipe</label>
                <select className="w-full border rounded-lg px-3 py-2" value={model.type} onChange={e=>setModel(m=>({...m, type:e.target.value as Promo['type']}))}>
                  <option value="diskon">Diskon</option>
                  <option value="bundling">Bundling</option>
                  <option value="b1g1">B1G1</option>
                  <option value="tebus">Tebus Murah</option>
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={model.aktif} onChange={e=>setModel(m=>({...m, aktif:e.target.checked}))}/>
                  Aktifkan promo
                </label>
              </div>
            </div>

            {/* Field dinamis */}
            {model.type==='diskon' && (
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-600">Diskon (%)</label>
                  <input type="number" className="w-full border rounded-lg px-3 py-2" value={model.diskon_pct ?? ''} onChange={e=>setModel(m=>({...m, diskon_pct: toNum(e.target.value)}))}/>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Diskon (Rp)</label>
                  <input type="number" className="w-full border rounded-lg px-3 py-2" value={model.diskon_rp ?? ''} onChange={e=>setModel(m=>({...m, diskon_rp: toNum(e.target.value)}))}/>
                </div>
              </div>
            )}

            {model.type==='bundling' && (
              <div className="text-sm text-gray-600">Harga promo bundle = estimasi 90% dari total harga normal (bisa disesuaikan di BE).</div>
            )}

            {model.type==='b1g1' && (
              <div>
                <label className="text-sm text-gray-600">Produk B1G1</label>
                <select className="w-full border rounded-lg px-3 py-2" value={model.b1g1_produk_id||''} onChange={e=>setModel(m=>({...m, b1g1_produk_id: e.target.value}))}>
                  <option value="">— pilih produk —</option>
                  {produk.map(p=><option key={p.id} value={p.id}>{p.nama}</option>)}
                </select>
              </div>
            )}

            {model.type==='tebus' && (
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-600">Minimal Qty</label>
                  <input type="number" className="w-full border rounded-lg px-3 py-2" value={model.tebus_min_qty ?? ''} onChange={e=>setModel(m=>({...m, tebus_min_qty: toNum(e.target.value)}))}/>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Harga Tebus (Rp)</label>
                  <input type="number" className="w-full border rounded-lg px-3 py-2" value={model.tebus_harga ?? ''} onChange={e=>setModel(m=>({...m, tebus_harga: toNum(e.target.value)}))}/>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border p-4">
            <div className="font-medium mb-2">Pilih Produk</div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
              {produk.map(p=>(
                <label key={p.id} className="border rounded-lg px-3 py-2 flex items-center gap-2 hover:bg-gray-50">
                  <input type="checkbox" checked={!!model.produk_ids?.includes(p.id)} onChange={()=>toggleProduk(p.id)}/>
                  <span className="flex-1">{p.nama}</span>
                  <span className="text-gray-500">{(p.harga_jual||0).toLocaleString()}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="rounded-2xl border p-4 space-y-3">
          <div className="font-semibold">Preview</div>
          {preview.length ? (
            <div className="space-y-2 text-sm">
              {preview.map((r,i)=>(
                <div key={i} className="flex items-center justify-between">
                  <div className="truncate">{r.nama}</div>
                  <div className="text-right">
                    {Number.isFinite(r.harga_awal) ? <div className="line-through text-gray-400">{(r.harga_awal||0).toLocaleString()}</div> : null}
                    <div className="font-medium">{(r.harga_promo||0).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : <div className="text-gray-500 text-sm">Belum ada item.</div>}
        </div>
      </div>
    </div>
  );
}
