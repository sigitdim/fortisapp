"use client";

import { useEffect, useState } from "react";

export type PromoInput = {
  nama: string;
  type: "diskon" | "b1g1" | "tebus" | "bundling";
  tipe?: "percent" | "nominal"; // hanya jika type=diskon
  nilai?: number;               // hanya jika type=diskon
  produk_ids: string[];
  aktif: boolean;
};

export default function PromoForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel = "Simpan",
}: {
  initial?: Partial<PromoInput>;
  onSubmit: (val: PromoInput) => void | Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}) {
  const [nama, setNama] = useState(initial?.nama ?? "");
  const [type, setType] = useState<PromoInput["type"]>((initial?.type as any) ?? "diskon");
  const [tipe, setTipe] = useState<"percent"|"nominal">((initial?.tipe as any) ?? "percent");
  const [nilai, setNilai] = useState<number>(Number(initial?.nilai ?? 0));
  const [produkText, setProdukText] = useState<string>((initial?.produk_ids ?? []).join(","));
  const [aktif, setAktif] = useState<boolean>(Boolean(initial?.aktif ?? true));
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string|null>(null);

  useEffect(()=>{ setErr(null); }, [nama, type, tipe, nilai, produkText, aktif]);

  function clampByTipe(v: number) {
    if (type === "diskon" && tipe === "percent") return Math.max(0, Math.min(100, v));
    return Math.max(0, v);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const produk_ids = produkText.split(",").map(s=>s.trim()).filter(Boolean);
    if (produk_ids.length === 0) {
      setErr("Minimal 1 produk_id wajib diisi");
      return;
    }
    try {
      setLoading(true);
      const payload: PromoInput = {
        nama: nama.trim(),
        type,
        produk_ids,
        aktif,
      };
      if (type === "diskon") {
        payload.tipe = tipe;
        payload.nilai = clampByTipe(Number(nilai) || 0);
      }
      await onSubmit(payload);
    } catch (e: any) {
      setErr(e?.message || "Gagal menyimpan promo");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {err && <div className="border border-red-200 bg-red-50 text-red-800 p-2 rounded">{err}</div>}

      <div className="grid gap-2">
        <label className="text-sm text-gray-600">Nama</label>
        <input value={nama} onChange={(e)=>setNama(e.target.value)} required className="border rounded-xl px-3 h-10"/>
      </div>

      <div className="grid gap-2">
        <label className="text-sm text-gray-600">Jenis Promo (type)</label>
        <select value={type} onChange={(e)=>setType(e.target.value as any)} className="border rounded-xl px-3 h-10">
          <option value="diskon">Diskon</option>
          <option value="b1g1">Beli 1 Gratis 1</option>
          <option value="tebus">Tebus Murah</option>
          <option value="bundling">Bundling</option>
        </select>
      </div>

      {type === "diskon" && (
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <label className="text-sm text-gray-600">Tipe Diskon</label>
            <select value={tipe} onChange={(e)=>setTipe(e.target.value as any)} className="border rounded-xl px-3 h-10">
              <option value="percent">Percent</option>
              <option value="nominal">Nominal</option>
            </select>
          </div>
          <div className="grid gap-2">
            <label className="text-sm text-gray-600">Nilai{tipe==="percent"?" (0-100)":" (≥0)"}</label>
            <input type="number" value={nilai} min={0} max={tipe==="percent"?100:undefined}
                   onChange={(e)=>setNilai(clampByTipe(Number(e.target.value)))} className="border rounded-xl px-3 h-10"/>
          </div>
        </div>
      )}

      <div className="grid gap-2">
        <label className="text-sm text-gray-600">Produk IDs (pisahkan koma) — elemen pertama akan jadi <code>produk_id</code></label>
        <input value={produkText} onChange={(e)=>setProdukText(e.target.value)} placeholder="uuid1, uuid2" className="border rounded-xl px-3 h-10" required/>
      </div>

      <div className="flex items-center gap-2">
        <input id="aktif" type="checkbox" checked={aktif} onChange={(e)=>setAktif(e.target.checked)} />
        <label htmlFor="aktif" className="text-sm">Aktif</label>
      </div>

      <div className="flex gap-2 pt-2">
        <button disabled={loading} className="px-4 h-10 rounded-xl border shadow-sm disabled:opacity-50">{submitLabel}</button>
        <button type="button" onClick={onCancel} className="px-4 h-10 rounded-xl border">Batal</button>
      </div>
    </form>
  );
}
