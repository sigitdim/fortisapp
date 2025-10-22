"use client";
import { useEffect, useState } from "react";
import { tryPaths } from "@/lib/api";
type B={id?:string;bahan_id?:string;bahanId?:string;nama?:string;name?:string;satuan?:string;uom?:string;unit?:string};
const getId=(o:any)=>o?.bahan_id??o?.bahanId??o?.id??"";const getName=(o:any)=>o?.nama??o?.name??"";const getUnit=(o:any)=>o?.satuan??o?.uom??o?.unit??"—";
export default function PageIn(){const [b,setB]=useState<B[]>([]);const [id,setId]=useState("");const [q,setQ]=useState<number>(0);const [note,setNote]=useState("");
useEffect(()=>{(async()=>{const l=await tryPaths<any[]>(["/setup/bahan","/bahan","/ingredients"],{pick:j=>j?.data??j});setB(l||[]);})().catch(console.error);},[]);
async function submit(){if(!id||!q)return alert("Pilih bahan & qty > 0");await tryPaths(["/inventory/in","/inv/in","/stock/in"],{method:"POST",body:{bahan_id:id,qty:q,catatan:note||"in"}});alert("Stok Masuk tersimpan");setQ(0);setNote("");}
return <div className="p-6 space-y-6"><div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Stok Masuk</h1><a href="/inventory" className="underline">← Kembali ke Overview</a></div>
<div className="rounded-2xl border p-4 bg-white/60 backdrop-blur space-y-3"><div className="flex flex-wrap items-center gap-3">
<select className="border rounded-lg p-2 min-w-[260px]" value={id} onChange={e=>setId(e.target.value)}><option value="">Pilih Bahan</option>{b.map(x=><option key={getId(x)} value={getId(x)}>{getName(x)} {getUnit(x)!=="—"?`(${getUnit(x)})`:""}</option>)}</select>
<input type="number" className="border rounded-lg p-2 w-28" placeholder="Qty" value={q||""} onChange={e=>setQ(Number(e.target.value))}/>
<input className="border rounded-lg p-2 min-w-[220px]" placeholder="Catatan (opsional)" value={note} onChange={e=>setNote(e.target.value)}/>
<button onClick={submit} className="rounded-xl border px-4 py-2 hover:bg-neutral-50">Simpan + IN</button></div></div></div>}
