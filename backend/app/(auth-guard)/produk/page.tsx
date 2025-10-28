"use client";
import { useEffect, useMemo, useState } from "react";
const API_URL = "";
const PRODUK_PATH = "/api/produk";
type Item = { id:string; nama:string };

const extractArray = (j:any): any[] => {
  if (Array.isArray(j)) return j;
  const cand = [j?.data, j?.items, j?.results, j?.rows, j?.list];
  for (const c of cand) if (Array.isArray(c) && c.length) return c;
  if (j && typeof j === 'object') {
    for (const k of Object.keys(j)) { if (Array.isArray((j as any)[k])) return (j as any)[k]; }
  }
  return [];
};
const norm=(arr:any[]) => (arr||[]).map((r:any)=>{
  const id = r?.id ?? r?.produk_id ?? r?.product_id ?? r?.uuid ?? r?.kode ?? r?.kode_produk;
  const nama = r?.nama ?? r?.nama_produk ?? r?.name ?? r?.product_name ?? r?.title ?? id;
  return id ? { id:String(id), nama:String(nama||id) } : null;
}).filter(Boolean) as Item[];

export default function Page(){
  const [items,setItems]=useState<Item[]>([]); const [q,setQ]=useState("");
  useEffect(()=>{(async()=>{
    try{
      const r=await fetch(PRODUK_PATH,{cache:"no-store"});
      const txt=await r.text(); const j=(()=>{try{return JSON.parse(txt)}catch{return null}})();
      const arr=extractArray(j??[]); setItems(norm(arr));
    }catch{ setItems([]); }
  })()},[]);
  const filtered=useMemo(()=>{const s=q.toLowerCase().trim(); return s?items.filter(it=>it.nama.toLowerCase().includes(s)||it.id.includes(s)):items;},[items,q]);
  return(<div className="p-6 space-y-4">
    <h1 className="text-2xl font-bold">Produk</h1>
    <input className="w-full md:w-96 rounded-xl border px-3 py-2" placeholder="Cari produk..." value={q} onChange={e=>setQ(e.target.value)} />
    <div className="rounded-2xl border overflow-auto">
      <table className="min-w-[600px] w-full text-sm"><thead><tr className="text-left border-b"><th className="py-2 px-3">Nama</th><th className="py-2 px-3">ID</th></tr></thead>
      <tbody>{filtered.map(it=>(<tr key={it.id} className="border-b"><td className="py-2 px-3">{it.nama}</td><td className="py-2 px-3 text-gray-500">{it.id}</td></tr>))}
      {filtered.length===0&&(<tr><td className="py-6 px-3 text-gray-500" colSpan={2}>Tidak ada data.</td></tr>)}</tbody></table>
    </div>
  </div>);
}
