"use client";
import { useEffect, useState } from "react";
import type { UUID } from "@/types/db";
import { updateHargaJual } from "@/lib/hpp";

type Props = {
  produkId?: UUID | null;
  hppTotal: number;             // Rp per porsi (incl. overhead)
  hargaJualAwal?: number | null;
};

export default function MarginCard({ produkId, hppTotal, hargaJualAwal }: Props) {
  const [harga, setHarga] = useState<string>("");
  const [targetLabaHarian, setTargetLabaHarian] = useState<string>("100000"); // default 100k/hari
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setHarga(hargaJualAwal != null ? String(hargaJualAwal) : "");
  }, [hargaJualAwal]);

  const hargaNum = Number(harga || 0);
  const marginRp = Math.max(0, hargaNum - (hppTotal || 0));
  const marginPct = hargaNum > 0 ? (marginRp / hargaNum) * 100 : 0;

  const labaPerCup = marginRp;
  const targetNum = Number(targetLabaHarian || 0);
  const breakevenCups = labaPerCup > 0 ? Math.ceil(targetNum / labaPerCup) : 0;

  const rekomendasi20 = Math.ceil((hppTotal || 0) / 0.8);  // ~20% margin
  const rekomendasi30 = Math.ceil((hppTotal || 0) / 0.7);  // ~30%
  const rekomendasi40 = Math.ceil((hppTotal || 0) / 0.6);  // ~40%

  const save = async () => {
    if (!produkId) return;
    setSaving(true); setErr(null); setMsg(null);
    try {
      const val = harga.trim() === "" ? null : Number(harga);
      if (val != null && (isNaN(val) || val < 0)) throw new Error("Harga harus angka ≥ 0");
      await updateHargaJual(produkId, val);
      setMsg("Harga jual tersimpan.");
      setTimeout(() => setMsg(null), 2000);
    } catch (e: any) {
      setErr(e?.message ?? "Gagal menyimpan harga.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border p-4 shadow space-y-3">
      <h3 className="text-lg font-semibold">Harga & Margin</h3>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-sm text-gray-600">Harga Jual (Rp)</label>
          <input
            className="w-full border rounded-xl px-3 py-2"
            value={harga}
            onChange={(e) => setHarga(e.target.value)}
            inputMode="numeric"
            placeholder="mis. 20000"
            disabled={!produkId || saving}
          />
        </div>
        <button
          onClick={save}
          disabled={!produkId || saving}
          className="px-4 py-2 rounded-xl border shadow self-end"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      {msg && <p className="text-green-600 text-sm">{msg}</p>}
      {err && <p className="text-red-600 text-sm">{err}</p>}

      <div className="text-sm space-y-1">
        <div className="flex justify-between">
          <span>HPP Total / porsi</span>
          <span>Rp {Number(hppTotal || 0).toLocaleString("id-ID")}</span>
        </div>
        <div className="flex justify-between">
          <span>Margin per cup</span>
          <span>Rp {marginRp.toLocaleString("id-ID")} ({marginPct.toFixed(1)}%)</span>
        </div>
      </div>

      <div className="pt-2 border-t">
        <label className="text-sm text-gray-600">Target laba harian (Rp)</label>
        <div className="flex gap-2 mt-1">
          <input
            className="flex-1 border rounded-xl px-3 py-2"
            value={targetLabaHarian}
            onChange={(e) => setTargetLabaHarian(e.target.value)}
            inputMode="numeric"
            placeholder="mis. 100000"
          />
          <div className="px-3 py-2 rounded-xl border">
            <div className="text-xs text-gray-500">Breakeven cups/hari</div>
            <div className="font-semibold text-center">{breakevenCups}</div>
          </div>
        </div>
      </div>

      <div className="pt-2 border-t">
        <div className="text-xs text-gray-500 mb-1">Rekomendasi harga (± margin)</div>
        <div className="flex gap-2 text-sm">
          <span className="px-3 py-1 rounded-xl border">20% ≈ Rp {rekomendasi20.toLocaleString("id-ID")}</span>
          <span className="px-3 py-1 rounded-xl border">30% ≈ Rp {rekomendasi30.toLocaleString("id-ID")}</span>
          <span className="px-3 py-1 rounded-xl border">40% ≈ Rp {rekomendasi40.toLocaleString("id-ID")}</span>
        </div>
      </div>
    </div>
  );
}
