"use client";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

type Row = { id:string; nama:string; satuan?:string; harga?:number };

export default function BahanTab() {
  const [rows,setRows] = useState<Row[]>([]);
  const [nama,setNama] = useState("");
  const [satuan,setSatuan] = useState("");
  const [harga,setHarga] = useState<string>("");
  const [editId,setEditId] = useState<string|null>(null);
  const isEdit = !!editId;

  async function load() {
    const r = await api("/api/setup/bahan");
    setRows(r.data || r.rows || []);
  }
  useEffect(()=>{ load(); },[]);

  async function save() {
    const body:any = {
      id: editId || undefined,
      nama,
      satuan,
      harga: Number(harga||0),
    };
    // upsert via POST
    await api("/api/setup/bahan",{ method:"POST", body:JSON.stringify(body) });
    reset();
    load();
  }

  async function del(id:string) {
    // pakai DELETE by id (BE sdh support)
    await api(`/api/setup/bahan/${id}`,{ method:"DELETE" }).catch(async()=>{
      // fallback POST /delete
      await api("/api/setup/bahan/delete",{ method:"POST", body:JSON.stringify({id}) });
    });
    load();
  }

  function onEdit(r:Row){
    setEditId(r.id); setNama(r.nama||""); setSatuan(r.satuan||""); setHarga(String(r.harga||""));
  }
  function reset(){ setEditId(null); setNama(""); setSatuan(""); setHarga(""); }

  const csv = useMemo(()=>{
    const header = "nama,satuan,harga\n";
    const lines = rows.map(r=>[r.nama,r.satuan??"",r.harga??0].join(",")).join("\n");
    return header+lines;
  },[rows]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <input className="border rounded px-3 py-2 w-64" placeholder="Nama" value={nama} onChange={e=>setNama(e.target.value)} />
        <input className="border rounded px-3 py-2 w-48" placeholder="Satuan (gram/ml/pcs)" value={satuan} onChange={e=>setSatuan(e.target.value)} />
        <input className="border rounded px-3 py-2 w-48" placeholder="Harga per satuan" type="number" value={harga} onChange={e=>setHarga(e.target.value)} />
        <button onClick={save} className="px-4 py-2 rounded bg-black text-white">{isEdit?"Update (POST upsert)":"Tambah (POST)"}</button>
        {isEdit && <button onClick={reset} className="px-3 py-2 rounded border">Batal</button>}
        <a
          href={`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`}
          download="bahan.csv"
          className="ml-auto px-3 py-2 rounded border"
        >Export CSV</a>
        <button onClick={load} className="px-3 py-2 rounded border">Refresh</button>
      </div>

      <table className="w-full border rounded">
        <thead>
          <tr className="bg-gray-100 border-b">
            <th className="p-2 text-left w-[40%]">Nama</th>
            <th className="p-2 text-left w-[15%]">Satuan</th>
            <th className="p-2 text-left w-[15%]">Harga/Satuan</th>
            <th className="p-2 text-left w-[30%]">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r=>(
            <tr key={r.id} className="border-b">
              <td className="p-2">{r.nama||"-"}</td>
              <td className="p-2">{r.satuan||"-"}</td>
              <td className="p-2">{r.harga??0}</td>
              <td className="p-2">
                <button className="px-2 py-1 border rounded" onClick={()=>onEdit(r)}>Edit</button>
                <button className="ml-2 px-2 py-1 border rounded text-red-600" onClick={()=>del(r.id)}>Delete</button>
                <button className="ml-2 px-2 py-1 border rounded"
                  onClick={()=>window.dispatchEvent(new CustomEvent("open-bahan-logs",{ detail:{ id:r.id, nama:r.nama } }))}>
                  Logs
                </button>
              </td>
            </tr>
          ))}
          {rows.length===0 && <tr><td className="p-4 text-center text-gray-400" colSpan={4}>Belum ada data</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
