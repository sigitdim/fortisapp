"use client";
import React, { useState } from "react";

const OWNER_ID = process.env.NEXT_PUBLIC_OWNER_ID || "";

async function fetchJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", "x-owner-id": OWNER_ID, ...(options.headers||{}) },
    cache: "no-store",
  });
  const json = await res.json().catch(()=>({}));
  if (!res.ok || json?.ok === false) throw new Error(json?.message || "Request failed");
  return (json?.data ?? json) as T;
}

// tiny toast sederhana
function toast(msg:string){ try{ // non-invasif
  const el=document.createElement("div");
  el.textContent=msg;
  el.className="fixed bottom-4 right-4 z-[9999] px-4 py-2 rounded-xl text-white bg-black/80";
  document.body.appendChild(el);
  setTimeout(()=>el.remove(),2200);
}catch{} }

export default function AdjustInline({
  bahanId, bahanName, onAfter,
}: { bahanId: string; bahanName?: string; onAfter?: () => void }) {
  const [open,setOpen]=useState(false);
  const [qty,setQty]=useState<number>(0);
  const [catatan,setCatatan]=useState("");

  async function submit() {
    if (!qty) return toast("Qty wajib diisi (boleh negatif/positif)");
    try {
      // 1) Adjust
      await fetchJson("/api/inventory/adjust", {
        method: "POST",
        body: JSON.stringify({ bahan_id: bahanId, qty: Number(qty), catatan: catatan || undefined }),
      });

      // 2) Ambil log terbaru untuk lihat saldo_before/after
      const q = new URLSearchParams({ limit: "1", bahan_id: bahanId });
      const hist: any = await fetchJson(`/api/inventory/history?${q.toString()}`);
      const last = Array.isArray(hist?.data) ? hist.data[0] : Array.isArray(hist) ? hist[0] : (hist?.items?.[0]);
      if (last && last.saldo_before != null && last.saldo_after != null) {
        toast(`Adjust OK: ${bahanName || bahanId} — ${last.saldo_before} → ${last.saldo_after}`);
      } else {
        toast("Adjust OK (cek history/summary)");
      }

      // 3) Force refresh (sekarang + tunda 1.2s) dengan cache-buster
      onAfter?.();
      setTimeout(()=>onAfter?.(), 1200);
      // kicker kecil: pukul summary biar hangat
      fetch(`/api/inventory/summary?_=${Date.now()}`, { headers: { "x-owner-id": OWNER_ID } });

      setOpen(false); setQty(0); setCatatan("");
    } catch (e:any) {
      toast(e?.message || "Gagal adjust");
    }
  }

  return (
    <>
      <button
        onClick={()=>setOpen(true)}
        className="px-3 py-2 rounded-xl border bg-white hover:bg-gray-50 dark:bg-slate-900 dark:border-slate-700 text-sm"
      >
        Adjust
      </button>

      {open && (
        <div className="fixed inset-0 z-[100]">
          <div className="absolute inset-0 bg-black/30" onClick={()=>setOpen(false)} />
          <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-xl">
            <div className="text-lg font-semibold mb-3">Adjust — {bahanName || bahanId}</div>
            <div className="grid gap-3">
              <div>
                <label className="text-xs text-gray-500 dark:text-slate-400">Qty</label>
                <input type="number" value={qty} onChange={(e)=>setQty(Number(e.target.value||0))}
                  className="w-full px-3 py-2 rounded-xl border dark:border-slate-700 bg-white dark:bg-slate-900" />
                <div className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                  Positif = tambah stok, negatif = kurangi stok.
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-slate-400">Catatan (opsional)</label>
                <input value={catatan} onChange={(e)=>setCatatan(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border dark:border-slate-700 bg-white dark:bg-slate-900" />
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={()=>setOpen(false)} className="px-3 py-2 rounded-xl border">Batal</button>
                <button onClick={submit} className="px-3 py-2 rounded-xl bg-black text-white hover:opacity-90">Simpan</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
