"use client";
import { useState } from "react";
import { apiFetch } from "@/lib/api";

export default function InventoryForm() {
  const [bahanId, setBahanId] = useState("");
  const [qty, setQty] = useState<number>(0);
  const [unit, setUnit] = useState("pcs");
  const [tipe, setTipe] = useState<"in"|"out">("in");
  const [note, setNote] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const path = tipe === "in" ? "/inventory/in" : "/inventory/out";
    await apiFetch(path, { method: "POST", body: { bahan_id: bahanId, qty, unit, catatan: note } });
    setQty(0);
    setNote("");
    alert("Tersimpan.");
  }

  return (
    <form onSubmit={submit} className="rounded-xl border p-3 space-y-2">
      <div className="text-lg font-semibold">Quick {tipe.toUpperCase()}</div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <input className="border rounded-lg px-2 py-1" placeholder="Bahan ID" value={bahanId} onChange={e=>setBahanId(e.target.value)} required/>
        <input className="border rounded-lg px-2 py-1" placeholder="Qty" type="number" value={qty} onChange={e=>setQty(Number(e.target.value))} required/>
        <input className="border rounded-lg px-2 py-1" placeholder="Satuan" value={unit} onChange={e=>setUnit(e.target.value)}/>
        <select className="border rounded-lg px-2 py-1" value={tipe} onChange={e=>setTipe(e.target.value as any)}>
          <option value="in">IN</option>
          <option value="out">OUT</option>
        </select>
      </div>
      <textarea className="border rounded-lg px-2 py-1 w-full" placeholder="Catatan (opsional)" value={note} onChange={e=>setNote(e.target.value)} />
      <button className="rounded-xl px-3 py-1 border hover:bg-gray-50" type="submit">Simpan</button>
    </form>
  );
}
