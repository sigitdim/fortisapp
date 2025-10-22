'use client';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { api } from '@/app/lib/api';

type Resource = 'bahan'|'overhead'|'tenaga-kerja';

type RowCommon = { id: string; nama: string };
type RowBahan  = RowCommon & { satuan?: string; harga_per_satuan?: number };
type RowOH     = RowCommon & { nominal?: number };
type RowTK     = RowCommon & { rate_per_menit?: number; gaji_bulanan?: number };
type Row = RowBahan & RowOH & RowTK;

function seg(r:Resource){ return r==='tenaga-kerja' ? 'tenaga_kerja' : r; }
function rid(){ return Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2); }

/** Parser angka: "Rp 2.000.000,00" -> 2000000 */
function toNum(v:any): number|undefined {
  if (v===null || v===undefined || v==='') return undefined;
  const s = String(v).replace(/[^0-9-]/g,'');
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}
const fmt = (n?:number)=> typeof n==='number' ? n.toLocaleString() : '-';
function isNameKey(k:string){ return /^(id|nama|name|title|nama_bahan|nama_overhead)$/i.test(k); }

/** Deep-scan semua field yang relevan buat Overhead */
function collectOverheadNumbers(obj:any): number[] {
  if (!obj || typeof obj!=='object') return [];
  const KEYRE = /(nom|biaya|harga|amount|cost|bulan|month|perbulan)/i;
  const out:number[] = [];
  for (const k of Object.keys(obj)) {
    if (isNameKey(k)) continue;
    const v:any = (obj as any)[k];
    if (v && typeof v==='object') { out.push(...collectOverheadNumbers(v)); continue; }
    if (KEYRE.test(k)) {
      const n = toNum(v);
      if (typeof n==='number' && n>=0) out.push(n);
    }
  }
  return out;
}

/** Normalisasi GET */
function normalize(resource:Resource, x:any): Row {
  const id = x?.id ?? x?.bahan_id ?? x?.overhead_id ?? x?.tk_id ?? rid();
  const nama = x?.nama ?? x?.name ?? x?.title ?? x?.nama_bahan ?? x?.nama_overhead ?? x?.nama_tk ?? '-';

  // Bahan
  const satuan = x?.satuan ?? x?.unit ?? x?.units ?? x?.satuan_beli ?? undefined;
  const harga_per_satuan =
    toNum(x?.harga_per_satuan) ?? toNum(x?.harga_satuan) ?? toNum(x?.harga) ?? toNum(x?.price_per_unit) ?? undefined;

  // Overhead
  let nominal =
    toNum(x?.nominal) ?? toNum(x?.biaya) ?? toNum(x?.nilai) ?? toNum(x?.jumlah) ??
    toNum(x?.harga) ?? toNum(x?.amount) ?? toNum(x?.cost) ??
    toNum(x?.biaya_per_bulan) ?? toNum(x?.biayaBulanan) ?? toNum(x?.nominal_bulanan) ??
    toNum(x?.monthly_cost) ?? toNum(x?.cost_per_month) ?? toNum(x?.monthly_amount);

  if (resource==='overhead' && (nominal===undefined || nominal===0)) {
    const cands = collectOverheadNumbers(x);
    if (cands.length) nominal = cands.sort((a,b)=>b-a)[0];
  }

  // Tenaga kerja
  const gaji_bulanan =
    toNum(x?.gaji_bulanan) ?? toNum(x?.gaji) ?? toNum(x?.salary) ?? toNum(x?.monthly_salary) ?? undefined;
  let rate_per_menit =
    toNum(x?.rate_per_menit) ?? toNum(x?.rateMenit) ?? toNum(x?.rate_per_minute) ?? undefined;

  if (rate_per_menit===undefined && gaji_bulanan && toNum(x?.jam_kerja_per_hari) && toNum(x?.hari_kerja_per_bulan)){
    const jam = toNum(x?.jam_kerja_per_hari)!; const hari = toNum(x?.hari_kerja_per_bulan)!;
    if (jam>0 && hari>0) rate_per_menit = Math.round(gaji_bulanan / (hari*jam*60));
  }

  return { id, nama, satuan, harga_per_satuan, nominal, rate_per_menit, gaji_bulanan };
}

type EditState = { id:string; values: Partial<Row> };

export default function SetupTable({ resource, title }:{resource:Resource; title:string;}) {
  const path = seg(resource);
  const [rows, setRows] = useState<Row[]>([]);
  const [q,setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState<EditState|null>(null);

  async function load(){
    try{
      setLoading(true); setErr(null);
      const r = await api(`/setup/${path}`);
      const data = Array.isArray(r?.data) ? r.data : (Array.isArray(r) ? r : []);
      setRows(data.map((x:any)=>normalize(resource,x)));
    }catch(e:any){
      setErr(e?.message || 'Gagal memuat');
    }finally{ setLoading(false); }
  }
  useEffect(()=>{ load(); },[path]);

  // CREATE
  async function onCreate(fd:FormData){
    const nama = String(fd.get('nama')||'').trim();
    const payload:any = { nama };

    if (resource==='bahan'){
      const satuan = fd.get('satuan')?.toString();
      const harga = toNum(fd.get('harga'));
      if (satuan) payload.satuan = satuan;
      if (Number.isFinite(harga as number)){ payload.harga_per_satuan = harga; payload.harga = harga; }
    }
    if (resource==='overhead'){
      const nominal = toNum(fd.get('nominal'));
      if (Number.isFinite(nominal as number)){
        Object.assign(payload, {
          nominal, biaya:nominal, nilai:nominal, amount:nominal, cost:nominal,
          harga:nominal, biaya_per_bulan:nominal, nominal_bulanan:nominal
        });
      }
    }
    if (resource==='tenaga-kerja'){
      const rate = toNum(fd.get('rate_per_menit'));
      const gaji = toNum(fd.get('gaji_bulanan'));
      if (Number.isFinite(rate as number)) Object.assign(payload, { rate_per_menit:rate, rate_per_minute:rate });
      if (Number.isFinite(gaji as number)) Object.assign(payload, { gaji_bulanan:gaji, salary:gaji, monthly_salary:gaji });
    }

    await api(`/setup/${path}`, { method:'POST', json: payload });
    startTransition(load);
  }

  // EDIT
  function startEdit(r:Row){ setEditing({ id:r.id, values:{...r} }); }
  function cancelEdit(){ setEditing(null); }

  // SAVE (no weird try-catch leftovers)
  async function saveEdit(){
    if(!editing) return;
    const { id, values:v } = editing;

    const base:any = {};
    if (v.nama !== undefined) base.nama = String(v.nama).trim();

    if (resource==='bahan'){
      if (v.satuan !== undefined) base.satuan = v.satuan;
      if (v.harga_per_satuan !== undefined){
        const h = toNum(v.harga_per_satuan) ?? 0;
        base.harga_per_satuan = h; base.harga = h;
      }
    }
    if (resource==='overhead'){
      if (v.nominal !== undefined){
        const n = toNum(v.nominal) ?? 0;
        Object.assign(base, {
          nominal:n, biaya:n, nilai:n, amount:n, cost:n, harga:n,
          biaya_per_bulan:n, nominal_bulanan:n
        });
      }
    }
    if (resource==='tenaga-kerja'){
      if (v.rate_per_menit !== undefined){
        const r = toNum(v.rate_per_menit) ?? 0;
        Object.assign(base, { rate_per_menit:r, rate_per_minute:r });
      }
      if (v.gaji_bulanan !== undefined){
        const g = toNum(v.gaji_bulanan) ?? 0;
        Object.assign(base, { gaji_bulanan:g, salary:g, monthly_salary:g });
      }
    }

    const idAliases:any = { id, uuid:id };
    if (resource==='bahan') Object.assign(idAliases, { bahan_id:id });
    if (resource==='overhead') Object.assign(idAliases, { overhead_id:id });
    if (resource==='tenaga-kerja') Object.assign(idAliases, { tenaga_kerja_id:id, tk_id:id });

    async function tryReq(url:string, method:string, json:any){
      try { await api(url, { method, json }); return true; } catch { return false; }
    }

    const ok =
      (await tryReq(`/setup/${path}/${id}`, 'PUT',   base)) ||
      (await tryReq(`/setup/${path}/${id}`, 'PATCH', base)) ||
      (await tryReq(`/setup/${path}/${id}`, 'POST',  { ...base, _method:'PUT' })) ||
      (await tryReq(`/setup/${path}/${id}`, 'POST',  { ...base, _method:'PATCH' })) ||
      (await tryReq(`/setup/${path}`,        'POST', { ...idAliases, ...base })) ||
      (await tryReq(`/setup/${path}/update`,'POST', { ...idAliases, ...base }));

    if (!ok) { alert('Gagal menyimpan (semua metode gagal)'); return; }

    setEditing(null);
    startTransition(load);
  }

  // DELETE (multi-strategy)
  async function onDelete(id:string){
    if(!confirm('Hapus item ini?')) return;

    async function tryDel(url:string, method:string, json?:any){
      try { await api(url, json ? { method, json } : { method }); return true; } catch { return false; }
    }

    const ok =
      (await tryDel(`/setup/${path}/${id}`, 'DELETE')) ||
      (await tryDel(`/setup/${path}`, 'DELETE', { id })) ||
      (await tryDel(`/setup/${path}/${id}`, 'POST', { _method: 'DELETE' })) ||
      (await tryDel(`/setup/${path}/delete`, 'POST', { id })) ||
      (await tryDel(`/setup/${path}`, 'POST', { id, _action: 'delete' })) ||
      (await tryDel(`/setup/${path}?id=${encodeURIComponent(id)}`, 'DELETE'));

    if (!ok) { alert('Gagal menghapus (semua metode gagal)'); return; }

    setRows(prev => prev.filter(r => r.id !== id));
    if (editing?.id === id) setEditing(null);
  }

  const filtered = useMemo(()=> rows.filter(r => !q || (r.nama||'').toLowerCase().includes(q.toLowerCase())), [rows,q]);

  return (
    <div className="rounded-2xl border shadow-sm bg-white overflow-hidden">
      <div className="p-4 sm:p-6 border-b bg-gradient-to-b from-gray-50 to-white sticky top-0">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg sm:text-xl font-semibold">{title}</h2>
          <button onClick={load} className="px-3 py-2 rounded-lg border hover:bg-gray-50 text-sm">
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <input className="border rounded-lg px-3 py-2 w-full" placeholder={`Cari ${resource}...`} value={q} onChange={e=>setQ(e.target.value)} />
          <input name="nama" form="createForm" required className="border rounded-lg px-3 py-2 w-full" placeholder="Nama" />

          {resource==='bahan' && (<>
            <input name="satuan" form="createForm" className="border rounded-lg px-3 py-2 w-full" placeholder="Satuan (gram/ml/pcs)" />
            <input name="harga"  form="createForm" type="number" step="0.01" className="border rounded-lg px-3 py-2 w-full" placeholder="Harga/Satuan" />
          </>)}

          {resource==='overhead' && (<>
            <input name="nominal" form="createForm" type="number" step="0.01" className="border rounded-lg px-3 py-2 w-full" placeholder="Nominal (Rp/bulan)" />
            <div className="hidden sm:block" />
          </>)}

          {resource==='tenaga-kerja' && (<>
            <input name="rate_per_menit" form="createForm" type="number" step="0.01" className="border rounded-lg px-3 py-2 w-full" placeholder="Rate/menit (opsional)" />
            <input name="gaji_bulanan" form="createForm" type="number" step="0.01" className="border rounded-lg px-3 py-2 w-full" placeholder="Gaji/bulan (opsional)" />
          </>)}

          <form id="createForm" action={onCreate}>
            <button className="w-full px-4 py-2 rounded-lg bg-black text-white hover:opacity-90">
              {isPending ? 'Menyimpan…' : 'Tambah'}
            </button>
          </form>
        </div>

        {err && <div className="text-red-600 text-sm mt-2 break-words">Error: {err}</div>}
      </div>

      <div className="p-0 overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="text-left p-3 border-b">Nama</th>
              {resource==='bahan' && (<><th className="text-left p-3 border-b">Satuan</th><th className="text-right p-3 border-b">Harga/Satuan</th></>)}
              {resource==='overhead' && (<th className="text-right p-3 border-b">Nominal</th>)}
              {resource==='tenaga-kerja' && (<><th className="text-right p-3 border-b">Rate/menit</th><th className="text-right p-3 border-b">Gaji/bulan</th></>)}
              <th className="p-3 border-b w-40 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r,i)=>{
              const isEdit = editing?.id===r.id;
              const v = isEdit ? editing!.values : r;
              return (
                <tr key={r.id} className={i%2 ? 'bg-white' : 'bg-gray-50/50'}>
                  <td className="p-3 border-b">
                    {isEdit ? (
                      <input className="border rounded px-2 py-1 w-full"
                        value={v.nama ?? ''} onChange={e=>setEditing(s=>s&&({...s,values:{...s.values,nama:e.target.value}}))}
                      />
                    ) : r.nama}
                  </td>

                  {resource==='bahan' && (<>
                    <td className="p-3 border-b">
                      {isEdit ? (
                        <input className="border rounded px-2 py-1 w-full"
                          value={v.satuan ?? ''} onChange={e=>setEditing(s=>s&&({...s,values:{...s.values,satuan:e.target.value}}))}
                        />
                      ) : (r.satuan || '-')}
                    </td>
                    <td className="p-3 border-b text-right">
                      {isEdit ? (
                        <input type="number" step="0.01" className="border rounded px-2 py-1 w-36 text-right"
                          value={v.harga_per_satuan ?? ''} onChange={e=>setEditing(s=>s&&({...s,values:{...s.values,harga_per_satuan: toNum(e.target.value)}}))}
                        />
                      ) : fmt(r.harga_per_satuan)}
                    </td>
                  </>)}

                  {resource==='overhead' && (
                    <td className="p-3 border-b text-right">
                      {isEdit ? (
                        <input type="number" step="0.01" className="border rounded px-2 py-1 w-36 text-right"
                          value={v.nominal ?? ''} onChange={e=>setEditing(s=>s&&({...s,values:{...s.values,nominal: toNum(e.target.value)}}))}
                        />
                      ) : fmt(r.nominal)}
                    </td>
                  )}

                  {resource==='tenaga-kerja' && (<>
                    <td className="p-3 border-b text-right">
                      {isEdit ? (
                        <input type="number" step="0.01" className="border rounded px-2 py-1 w-28 text-right"
                          value={v.rate_per_menit ?? ''} onChange={e=>setEditing(s=>s&&({...s,values:{...s.values,rate_per_menit: toNum(e.target.value)}}))}
                        />
                      ) : fmt(r.rate_per_menit)}
                    </td>
                    <td className="p-3 border-b text-right">
                      {isEdit ? (
                        <input type="number" step="0.01" className="border rounded px-2 py-1 w-36 text-right"
                          value={v.gaji_bulanan ?? ''} onChange={e=>setEditing(s=>s&&({...s,values:{...s.values,gaji_bulanan: toNum(e.target.value)}}))}
                        />
                      ) : fmt(r.gaji_bulanan)}
                    </td>
                  </>)}

                  <td className="p-3 border-b text-center">
                    {!isEdit ? (
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={()=>startEdit(r)} className="px-3 py-1 rounded border hover:bg-gray-50">Edit</button>
                        <button onClick={()=>onDelete(r.id)} className="px-3 py-1 rounded border hover:bg-red-50">Delete</button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={saveEdit} className="px-3 py-1 rounded border bg-black text-white hover:opacity-90">Save</button>
                        <button onClick={cancelEdit} className="px-3 py-1 rounded border hover:bg-gray-50">Cancel</button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtered.length===0 && (
              <tr>
                <td className="p-6 text-center text-gray-500" colSpan={resource==='bahan'?4:resource==='overhead'?3:4}>
                  Tidak ada data
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
