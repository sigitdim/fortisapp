"use client";

import React, { useState } from "react";
import { apiFetch } from "@/lib/api";

export default function InventoryForm() {
  const [bahanId, setBahanId] = useState("");
  const [qty, setQty] = useState<number>(0);
  const [unit, setUnit] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const path = "/inventory/in"; // default endpoint

    try {
      const res = await apiFetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bahan_id: bahanId,
          qty,
          unit,
          catatan: note,
        }),
      });

      setMsg("✅ Data berhasil dikirim.");
      console.log("Response:", res);
    } catch (err: any) {
      console.error(err);
      setMsg("❌ Gagal mengirim data.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="p-4 border rounded-xl flex flex-col gap-2 max-w-md"
    >
      <h2 className="font-semibold text-lg">Tambah Mutasi Stok</h2>
      <input
        placeholder="Bahan ID"
        value={bahanId}
        onChange={(e) => setBahanId(e.target.value)}
        className="border rounded-lg px-2 py-1"
        required
      />
      <input
        placeholder="Qty"
        type="number"
        value={qty}
        onChange={(e) => setQty(Number(e.target.value))}
        className="border rounded-lg px-2 py-1"
        required
      />
      <input
        placeholder="Satuan"
        value={unit}
        onChange={(e) => setUnit(e.target.value)}
        className="border rounded-lg px-2 py-1"
        required
      />
      <input
        placeholder="Catatan"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="border rounded-lg px-2 py-1"
      />

      <button
        type="submit"
        disabled={loading}
        className="rounded-lg border px-3 py-2 hover:bg-gray-100 disabled:opacity-60"
      >
        {loading ? "Mengirim..." : "Kirim"}
      </button>

      {msg && <p className="text-sm mt-2">{msg}</p>}
    </form>
  );
}
