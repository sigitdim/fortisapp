"use client";

import { useEffect, useState } from "react";
import type { UUID } from "@/types/db";
import { updateHargaJual } from "@/lib/hpp";

type Props = {
  produkId?: UUID | null;
  hargaAwal?: number | null; // optional, buat prefilling
};

export default function MarginCard({ produkId, hargaAwal }: Props) {
  const [harga, setHarga] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (hargaAwal != null && !Number.isNaN(hargaAwal)) {
      setHarga(String(hargaAwal));
    }
  }, [hargaAwal]);

  async function onSave() {
    try {
      setErr(null);
      setSaving(true);

      const trimmed = harga.trim();

      // parsing: kosong => error, selain itu parse number
      if (trimmed === "") throw new Error("Harga wajib diisi");

      const val = Number(trimmed);

      if (Number.isNaN(val)) throw new Error("Harga harus angka");
      if (val < 0) throw new Error("Harga harus >= 0");
      if (!produkId) throw new Error("produkId tidak tersedia");

      // ---> di sini val sudah 'number', bukan 'number | null'
      await updateHargaJual(produkId, val);

      setMsg("Harga jual tersimpan.");
      setTimeout(() => setMsg(null), 2000);
    } catch (e: any) {
      setErr(e?.message ?? "Gagal menyimpan harga");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border p-4 space-y-3">
      <div className="text-sm text-gray-500">Ubah Harga Jual</div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={harga}
          onChange={(e) => setHarga(e.target.value)}
          className="w-40 rounded-lg border px-3 py-2"
          placeholder="contoh: 25000"
        />
        <button
          onClick={onSave}
          disabled={saving}
          className="rounded-xl px-4 py-2 border hover:bg-gray-50 disabled:opacity-60"
        >
          {saving ? "Menyimpan..." : "Simpan"}
        </button>
      </div>
      {msg && <div className="text-green-600 text-sm">{msg}</div>}
      {err && <div className="text-red-600 text-sm">{err}</div>}
    </div>
  );
}
