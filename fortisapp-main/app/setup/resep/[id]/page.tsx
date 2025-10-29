'use client'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
export default function Page(){
  const params = useParams<{ id: string | string[] }>()
  const resepId = Array.isArray(params?.id) ? params.id[0] : (params?.id ?? '')
  const [rows,setRows]=useState<any[]>([]); const[err,setErr]=useState<string|null>(null)
  useEffect(()=>{ let c=false;(async()=>{
    try{
      if(!resepId){setRows([]);return}
      const r=await fetch(`/api/setup/resep/${resepId}`,{cache:'no-store'})
      const j=await r.json(); if(!c) setRows(j?.data||[])
    }catch(e:any){ if(!c) setErr(String(e?.message??e)) }
  })(); return()=>{c=true} },[resepId])
  return <pre className="text-xs p-3">{err??JSON.stringify(rows,null,2)}</pre>
}
