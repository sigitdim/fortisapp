'use client';
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/app/lib/api';

type Row = {
  id: string;
  nama: string;
  satuan?: string;
  harga_per_satuan?: number;
  aktif?: boolean;
};

export default function SetupTable({ resource }:{resource:'bahan'|'overhead'|'tenaga-kerja'}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [q,setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true); setErr(null);
      const r = await api(`/setup/${resource}`);
      setRows(r.data ?? []);
    } catch(e:any){ setErr(e.message); }
    finally { setLoading(false); }
  }

  useEffect(()=>{ load(); },[resource]);

  async function onCreate(formData: FormData){
    const nama = String(formData.get('nama')||'').trim();
    const satuan = formData.get('satuan')?.toString() || undefined;
    const harga = formData.get('harga') ? Number(formData.get('harga')) : undefined;

    await api(`/setup/${resource}`, { method:'POST', json: {
      nama,
      ...(satuan ? {satuan} : {}),
      ...(typeof harga === 'number' && !Number.isNaN(harga) ? {harga_per_satuan: harga} : {})
    }});
    await load();
  }

  // DELETE fix → DELETE /setup/<resource>/<id>
  async function onDelete(id:string){
    if(!confirm('Hapus item ini?')) return;
    await api(`/setup/${resource}/${id}`, { method:'DELETE' });
    setRows(prev => prev.filter(r => r.id !== id));
  }

  const filtered = useMemo(()=> rows.filter(r =>
    !q || r.nama.toLowerCase().includes(q.toLowerCase())
  ),[rows,q]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <input
          className="border rounded px-3 py-2 w-full"
          placeholder={`Cari ${resource}...`}
          value={q}
          onChange={e=>setQ(e.target.value)}
        />
        <button onClick={load} className="px-3 py-2 rounded border">Refresh</button>
      </div>

      <form action={onCreate} className="flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-40">
          <label className="block text-sm mb-1">Nama</label>
          <input name="nama" required className="border rounded px-3 py-2 w-full" />
        </div>
        {resource==='bahan' && (
          <>
            <div className="w-40">
              <label className="block text-sm mb-1">Satuan</label>
              <input name="satuan" className="border rounded px-3 py-2 w-full" placeholder="gram / ml / pcs" />
            </div>
            <div className="w-48">
              <label className="block text-sm mb-1">Harga / Satuan</label>
              <input name="harga" type="number" step="0.01" className="border rounded px-3 py-2 w-full" />
            </div>
          </>
        )}
        <button className="px-4 py-2 rounded bg-black text-white" type="submit">Tambah</button>
      </form>

      {err && <div className="text-red-600 text-sm">Error: {err}</div>}
      {loading ? <div>Loading…</div> : (
        <div className="overflow-x-auto">
          <table className="min-w-full border">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left p-2 border">Nama</th>
                {resource==='bahan' && <>
                  <th className="text-left p-2 border">Satuan</th>
                  <th className="text-right p-2 border">Harga/Satuan</th>
                </>}
                <th className="p-2 border w-32">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r=>(
                <tr key={r.id} className="odd:bg-white even:bg-gray-50">
                  <td className="p-2 border">{r.nama}</td>
                  {resource==='bahan' && <>
                    <td className="p-2 border">{r.satuan || '-'}</td>
                    <td className="p-2 border text-right">{typeof r.harga_per_satuan==='number' ? r.harga_per_satuan.toLocaleString() : '-'}</td>
                  </>}
                  <td className="p-2 border text-center">
                    <button onClick={()=>onDelete(r.id)} className="px-3 py-1 rounded border hover:bg-red-50">Delete</button>
                  </td>
                </tr>
              ))}
              {filtered.length===0 && (
                <tr><td className="p-4 text-center text-sm text-gray-500 border" colSpan={resource==='bahan'?4:2}>Tidak ada data</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
