"use client";

import { useEffect, useMemo, useState } from "react";
import { OWNER_ID, tryPaths, apiFetch } from "@/lib/api";

type Bahan = { id: string; nama?: string; name?: string; satuan?: string };

type Props = {
  mode: "in" | "out";
  onSuccess?: ()=>void;
};

export default function InventoryForm({ mode, onSuccess }: Props) {
  const [bahan, setBahan] = useState<Bahan[]>([]);
  const [bahanId, setBahanId] = useState("");
  const [qty, setQty] = useState<number>(0);
  const [catatan, setCatatan] = useState("");

  useEffect(() => {
    (async () => {
      const list = await tryPaths<any[]>(
        [
          "/setup/bahan",     // shape: {ok:true,data:[{id,nama,...}]}
          "/bahan",           // fallback lain
          "/ingredients",     // very fallback
        ],
        { pick: (j)=> j?.data ?? j }
      );
      setBahan(list);
    })().catch(console.error);
  }, []);

  const submit = async () => {
    if (!bahanId || !qty) return alert("Pilih bahan & isi qty.");
    const payload = { bahan_id: bahanId, qty: Number(qty), catatan: catatan || (mode==="in"?"stok masuk":"stok keluar") };

    const paths = mode === "in"
      ? ["/inventory/in", "/inv/in", "/stock/in"]
      : ["/inventory/out", "/inv/out", "/stock/out"];

    await tryPaths(paths, { method: "POST", body: payload });
    setQty(0); setCatatan("");
    onSuccess?.();
  };

  const label = useMemo(()=> mode==="in" ? "Tambah Stok Masuk" : "Catat Stok Keluar", [mode]);

  return (
    <div className="rounded-2xl border p-4 shadow-sm space-y-3">
      <div className="text-lg font-semibold">{label}</div>
      <div className="grid gap-3 md:grid-cols-4">
        <select
          className="border rounded-lg p-2"
          value={bahanId}
          onChange={(e)=> setBahanId(e.target.value)}
        >
          <option value="">Pilih Bahan</option>
          {bahan.map((b)=>(
            <option key={b.id} value={b.id}>
              {(b.nama || b.name || b.id) + (b.satuan ? ` (${b.satuan})` : "")}
            </option>
          ))}
        </select>
        <input
          type="number"
          className="border rounded-lg p-2"
          placeholder="Qty"
          value={qty || ""}
          onChange={(e)=> setQty(Number(e.target.value))}
        />
        <input
          type="text"
          className="border rounded-lg p-2"
          placeholder="Catatan (opsional)"
          value={catatan}
          onChange={(e)=> setCatatan(e.target.value)}
        />
        <button onClick={submit} className="rounded-xl border px-4 py-2 hover:opacity-90">
          Simpan
        </button>
      </div>
      <div className="text-xs text-neutral-500">owner: {OWNER_ID}</div>
    </div>
  );
}
