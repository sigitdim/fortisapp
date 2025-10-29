"use client";

import { useEffect } from "react";
import InventoryForm from "./InventoryForm";

type Props = {
  open: boolean;
  mode: "in"|"out";
  bahanId?: string;
  onClose: ()=>void;
  onSuccess?: ()=>void;
};

export default function QuickInOutModal({ open, mode, bahanId, onClose, onSuccess }: Props) {
  useEffect(() => {
    function esc(e:KeyboardEvent){ if(e.key==="Escape") onClose(); }
    if (open) window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-xl bg-white rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Input Stok {mode.toUpperCase()}</h3>
          <button onClick={onClose} className="px-2 py-1 rounded-lg border">✕</button>
        </div>
        <InventoryForm mode={mode} initialBahanId={bahanId} onSuccess={onSuccess} />
      </div>
    </div>
  );
}
