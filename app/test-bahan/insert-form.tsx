"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function InsertBahanForm() {
  const [nama_bahan, setNama] = useState("");
  const [satuan, setSatuan] = useState("gram");
  const [harga, setHarga] = useState<number | ''>('');
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const onInsert = async () => {
    setMsg(null); setErr(null);
    const { error } = await supabase.from("bahan").insert({
      nama_bahan,
      satuan,
      harga: typeof harga === "string" ? Number(harga) : harga,
    }).single();
    if (error) setErr(error.message);
    else {
      setMsg("Insert OK");
      setNama(""); setSatuan("gram"); setHarga('');
    }
  };

  return (
    <div style={{marginTop:16, display:"grid", gap:8}}>
      <input value={nama_bahan} onChange={e=>setNama(e.target.value)} placeholder="Nama bahan" />
      <input value={satuan} onChange={e=>setSatuan(e.target.value)} placeholder="Satuan" />
      <input type="number" value={harga} onChange={e=>setHarga(e.target.value === "" ? "" : Number(e.target.value))} placeholder="Harga" />
      <button onClick={onInsert}>Insert bahan</button>
      {msg && <p style={{color:"green"}}>{msg}</p>}
      {err && <p style={{color:"crimson"}}>{err}</p>}
    </div>
  );
}
