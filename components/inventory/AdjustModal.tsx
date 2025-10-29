"use client";
import React, { useEffect, useRef, useState } from "react";

type AdjustModalProps = {
  open: boolean;
  onClose: () => void;
  bahanId: string;
  bahanName?: string;
  onSuccess?: () => void;
};

export default function AdjustModal({ open, onClose, bahanId, bahanName, onSuccess }: AdjustModalProps) {
  const [qty, setQty] = useState<string>("");
  const [catatan, setCatatan] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function onBackdrop(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose();
  }

  async function submit() {
    const qtyNum = parseFloat(qty);
    if (Number.isNaN(qtyNum) || qtyNum === 0) return alert("Qty wajib angka non-nol (pakai minus untuk kurangi).");

    setLoading(true);
    try {
      const res = await fetch("/api/inventory/adjust", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-owner-id": (process.env.NEXT_PUBLIC_OWNER_ID as string) || "",
        },
        body: JSON.stringify({
          bahan_id: bahanId,
          qty: qtyNum,
          catatan: catatan || `Penyesuaian stok ${qtyNum > 0 ? "+" : ""}${qtyNum} ${bahanName || ""}`,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.ok === false) throw new Error(data?.message || "Gagal melakukan adjust");
      alert("Berhasil koreksi stok.");
      setQty(""); setCatatan("");
      onClose();
      onSuccess?.();
    } catch (e: any) {
      alert(e?.message || "Gagal melakukan adjust");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div ref={overlayRef} onClick={onBackdrop}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-3">
          <h2 className="text-lg font-semibold">Penyesuaian Stok (Adjust)</h2>
          <p className="mt-1 text-sm text-gray-500">
            Bahan: <b>{bahanName || bahanId}</b>. Isi angka positif untuk tambah, negatif untuk kurangi.
          </p>
        </div>
        <div className="space-y-3">
          <input
            type="number" inputMode="decimal"
            value={qty} onChange={(e)=>setQty(e.target.value)}
            placeholder="Qty (cth: 3 atau -2)"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-300"
          />
          <input
            value={catatan} onChange={(e)=>setCatatan(e.target.value)}
            placeholder="Catatan (opsional)"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-300"
          />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} disabled={loading}
            className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50">
            Batal
          </button>
          <button onClick={submit} disabled={loading}
            className="rounded-xl bg-black px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-50">
            {loading ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}
