// app/setup/overhead/page.tsx
"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type AnyObj = Record<string, any>;
const nm = (r: AnyObj) => r.nama ?? r.deskripsi ?? r.keterangan ?? "(tanpa nama)";
const val = (r: AnyObj) => {
  const v = r.nilai ?? r.biaya ?? r.harga ?? null;
  if (v == null) return "-";
  return Number(v).toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
};

export default function SetupOverheadPage() {
  const [rows, setRows] = useState<AnyObj[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    try {
      const j = await api("/setup/overhead");
      const arr = Array.isArray(j?.data) ? j.data : (Array.isArray(j) ? j : []);
      setRows(arr);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function save(id: string) {
    try {
      const body = JSON.parse(editing[id] ?? "{}");
      await api(`/setup/overhead/${id}`, { method: "PUT", body });
      alert("Tersimpan ✔");
      setEditing((e)=>{ const n={...e}; delete n[id]; return n; });
      await load();
    } catch (e:any) { alert(`Gagal simpan: ${e?.message || e}`); }
  }
  async function remove(id: string) {
    if (!confirm("Hapus item ini?")) return;
    try {
      await api(`/setup/overhead/${id}`, { method: "DELETE" });
      alert("Terhapus ✔");
      await load();
    } catch (e:any) { alert(`Gagal hapus: ${e?.message || e}`); }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">Setup • Overhead</h1>
        {loading && <span className="text-sm opacity-70">Loading…</span>}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {rows.map((r:any)=>{
          const id = r.id || r.uuid;
          const isEdit = editing[id] != null;
          return (
            <div key={id} className="border rounded-2xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-semibold">{nm(r)}</div>
                  <div className="text-sm opacity-70">ID: {id}</div>
                  <div className="text-sm">Nilai: {val(r)}</div>
                </div>
                <div className="flex gap-2">
                  {!isEdit ? (
                    <>
                      <button onClick={()=>setEditing(e=>({...e,[id]:JSON.stringify(r,null,2)}))}
                              className="px-3 py-1 rounded-lg border">Edit</button>
                      <button onClick={()=>remove(id)} className="px-3 py-1 rounded-lg bg-red-600 text-white">Hapus</button>
                    </>
                  ) : (
                    <>
                      <button onClick={()=>save(id)} className="px-3 py-1 rounded-lg bg-black text-white">Save</button>
                      <button onClick={()=>setEditing(e=>{const n={...e}; delete n[id]; return n;})}
                              className="px-3 py-1 rounded-lg border">Batal</button>
                    </>
                  )}
                </div>
              </div>
              {isEdit && (
                <textarea className="w-full h-56 border rounded-xl p-3 font-mono text-xs"
                          value={editing[id]} onChange={e=>setEditing(ed=>({...ed,[id]:e.target.value}))}/>
              )}
            </div>
          );
        })}
      </div>

      {!loading && !rows.length && <div className="text-sm text-gray-500">Belum ada data.</div>}
    </div>
  );
}
