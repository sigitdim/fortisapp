"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function COGSTab(){
  const [items,setItems] = useState<any[]>([]);
  const [loading,setLoading] = useState(false);

  async function load(){
    setLoading(true);
    try{
      const r = await api("/api/setup/cogs");
      setItems(r.data||[]);
    }catch{ setItems([]);}
    finally{ setLoading(false); }
  }
  useEffect(()=>{ load(); },[]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold">BOM & COGS</h3>
        <button className="ml-auto px-3 py-2 rounded border" onClick={load} disabled={loading}>{loading?"Memuat...":"Refresh"}</button>
      </div>
      {items.length===0 && (
        <div className="p-4 border rounded bg-gray-50">
          Modul ini sementara masih di halaman lama. Klik tombol di bawah untuk membukanya.
          <div className="mt-3">
            <a href="/setup/cogs_legacy" className="px-4 py-2 rounded bg-black text-white">Buka Halaman BOM & COGS (Legacy)</a>
          </div>
        </div>
      )}
      {items.length>0 && (
        <table className="w-full border rounded">
          <thead>
            <tr className="bg-gray-100 border-b">
              <th className="p-2 text-left">Produk</th>
              <th className="p-2 text-left">COGS</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it:any)=>(
              <tr key={it.id} className="border-b">
                <td className="p-2">{it.nama_produk||it.produk||"-"}</td>
                <td className="p-2">{it.cogs||it.hpp||0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
