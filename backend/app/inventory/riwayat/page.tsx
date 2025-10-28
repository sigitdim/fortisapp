"use client";
import { useEffect, useState } from "react";
import { tryPaths } from "@/lib/api";
type Row={id:string; waktu:string; type:"in"|"out"; bahan_id:string; nama?:string; qty:number; catatan?:string;};
export default function PageR(){const [rows,setRows]=useState<Row[]>([]);useEffect(()=>{(async()=>{const d:any[]=await tryPaths(["/inventory/logs?limit=500","/inventory/riwayat?limit=500","/inventory/all?limit=500"],{pick:j=>j?.data??j});setRows((d||[]).map(l=>({id:l.id??crypto.randomUUID(),waktu:String(l.waktu??l.created_at??l.tanggal??new Date().toISOString()),type:(l.type??l.jenis)==="out"?"out":"in",bahan_id:l.bahan_id??l.bahanId??"",nama:l.nama,qty:Math.abs(Number(l.qty??0)),catatan:l.catatan??l.note??""})));})()},[]);
return <div className="p-6 space-y-6"><div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Riwayat</h1><a href="/inventory" className="underline">← Kembali ke Overview</a></div>
<div className="overflow-auto rounded-2xl border"><table className="w-full text-sm"><thead className="bg-neutral-50"><tr><th className="p-3 text-left">Waktu</th><th className="p-3 text-left">Tipe</th><th className="p-3 text-left">Bahan</th><th className="p-3 text-right">Qty</th><th className="p-3 text-left">Catatan</th></tr></thead><tbody>
{rows.map(r=><tr key={r.id} className="border-t"><td className="p-3">{new Date(r.waktu).toLocaleString()}</td><td className={`p-3 ${r.type==="out"?"text-amber-700":"text-emerald-700"}`}>{r.type.toUpperCase()}</td><td className="p-3">{r.nama??r.bahan_id}</td><td className="p-3 text-right">{r.qty}</td><td className="p-3">{r.catatan||"—"}</td></tr>)}
{!rows.length && <tr><td className="p-6 text-center text-neutral-500" colSpan={5}>Loading / kosong</td></tr>}</tbody></table></div></div>}
