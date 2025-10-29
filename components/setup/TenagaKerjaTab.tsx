"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Row = { id:string; nama?:string; gaji_bulanan?:number };

export default function TenagaKerjaTab(){
  const [rows,setRows] = useState<Row[]>([]);
  const [nama,setNama] = useState("");
  const [gaji,setGaji] = useState<string>("");
  const [editId,setEditId] = useState<string|null>(null);

  async function load(){
    const r = await api("/api/setup/tenaga_kerja");
    setRows(r.data||[]);
  }
  useEffect(()=>{ load(); },[]);

  async function save(){
    if(!nama || !gaji) return alert("Param wajib: nama(string), gaji_bulanan(number)");
    const body = { id: editId||undefined, nama, gaji_bulanan: Number(gaji) };
    await api("/api/setup/tenaga_kerja",{ method:"POST", body: JSON.stringify(body) });
    reset(); load();
  }

  async function del(id:string){
    await api(`/api/setup/tenaga_kerja/${id}`,{ method:"DELETE" }).catch(async()=>{
      await api("/api/setup/tenaga_kerja/delete",{ method:"POST", body: JSON.stringify({id})});
    });
    load();
  }

  function onEdit(r:Row){ setEditId(r.id); setNama(r.nama||""); setGaji(String(r.gaji_bulanan||"")); }
  function reset(){ setEditId(null); setNama(""); setGaji(""); }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input className="border rounded px-3 py-2 w-[40%]" placeholder="Nama" value={nama} onChange={e=>setNama(e.target.value)} />
        <input className="border rounded px-3 py-2 w-[30%]" placeholder="Gaji bulanan" type="number" value={gaji} onChange={e=>setGaji(e.target.value)} />
        <button className="px-4 py-2 rounded bg-black text-white" onClick={save}>{editId?"Update (POST upsert)":"Tambah (POST)"}</button>
        {editId && <button className="px-3 py-2 rounded border" onClick={reset}>Batal</button>}
        <button className="ml-auto px-3 py-2 rounded border" onClick={load}>Refresh</button>
      </div>

      <table className="w-full border rounded">
        <thead>
          <tr className="bg-gray-100 border-b">
            <th className="p-2 text-left">Nama</th>
            <th className="p-2 text-left">Biaya</th>
            <th className="p-2 text-left">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r=>(
            <tr key={r.id} className="border-b">
              <td className="p-2">{r.nama||"-"}</td>
              <td className="p-2">{r.gaji_bulanan??0}</td>
              <td className="p-2">
                <button className="px-2 py-1 border rounded" onClick={()=>onEdit(r)}>Edit</button>
                <button className="ml-2 px-2 py-1 border rounded text-red-600" onClick={()=>del(r.id)}>Delete</button>
              </td>
            </tr>
          ))}
          {rows.length===0 && <tr><td className="p-4 text-center text-gray-400" colSpan={3}>Belum ada data</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
