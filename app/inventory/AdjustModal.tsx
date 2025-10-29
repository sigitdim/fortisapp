"use client";

import React, { useEffect, useRef } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  bahanId: string | null;
  bahanName?: string;
  onSuccess?: () => void;
};

export default function AdjustModal({ open, onClose, bahanId, bahanName, onSuccess }: Props) {
  const [qty, setQty] = React.useState<string>("");
  const [catatan, setCatatan] = React.useState<string>("");
  const [loading, setLoading] = React.useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function onBackdropClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose();
  }

  async function handleSubmit() {
    if (!bahanId) {
      alert("Bahan belum dipilih.");
      return;
    }
    const qtyNum = parseFloat(qty);
    if (isNaN(qtyNum) || qtyNum === 0) {
      alert("Qty harus berupa angka non-nol. Gunakan negatif untuk mengurangi stok.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/inventory/adjust`, {
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
      if (!res.ok || data?.ok === false) {
        throw new Error(data?.message || "Gagal melakukan adjust");
      }
      alert("Berhasil: stok telah dikoreksi.");
      setQty("");
      setCatatan("");
      onClose();
      onSuccess?.();
    } catch (err: any) {
      alert(err?.message || "Gagal melakukan adjust");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      onClick={onBackdropClick}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      aria-modal="true"
      role="dialog"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-3">
          <h2 className="text-lg font-semibold">Penyesuaian Stok (Adjust)</h2>
          <p className="mt-1 text-sm text-gray-500">
            Koreksi stok untuk <b>{bahanName || "Bahan"}</b>. Gunakan angka positif untuk menambah, negatif untuk
            mengurangi.
          </p>
        </div>

        <div className="space-y-3">
          <input
            type="number"
            inputMode="decimal"
            placeholder="Qty (contoh: 3 atau -2)"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-300"
          />
          <input
            placeholder="Catatan (opsional)"
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-300"
          />
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="rounded-xl bg-black px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}
