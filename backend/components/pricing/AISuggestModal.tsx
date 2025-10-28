// components/pricing/AISuggestModal.tsx
"use client";

import * as React from "react";
import { pricingApply, pricingSuggest, AISuggestionItem, AISuggestionResp } from "@/lib/pricing";

type Props = {
  open: boolean;
  onClose: () => void;
  produkId: string;
  produkName?: string;
  defaultTarget?: number; // 0.35
  onApplied?: (newPrice: number) => void; // panggil ulang list produk kalau perlu
};

export default function AISuggestModal({
  open,
  onClose,
  produkId,
  produkName,
  defaultTarget = 0.35,
  onApplied,
}: Props) {
  const [loading, setLoading] = React.useState(false);
  const [target, setTarget] = React.useState(String(Math.round(defaultTarget * 100)));
  const [data, setData] = React.useState<AISuggestionResp | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [applying, setApplying] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setData(null);
    setErr(null);
  }, [open]);

  const doSuggest = async () => {
    try {
      setLoading(true);
      setErr(null);
      const pct = Math.max(0, Math.min(99, Number(target))) / 100;
      const json = await pricingSuggest({ produk_id: produkId, target_margin_pct: pct });
      setData(json);
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  const applyPrice = async (item: AISuggestionItem) => {
    try {
      setApplying(item.tipe);
      const res = await pricingApply({
        produk_id: produkId,
        recommended_price: item.harga_jual,
        inputs_hash: `ai-${item.tipe.toLowerCase()}`,
      });
      alert(res?.message || `Harga diterapkan: ${item.harga_jual}`);
      onApplied?.(item.harga_jual);
      onClose();
    } catch (e: any) {
      alert(e?.message || String(e));
    } finally {
      setApplying(null);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white p-5 shadow">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-xs opacity-60">AI Suggestion</div>
            <h2 className="text-xl font-semibold">
              {produkName || "Produk"} — Rekomendasi Harga
            </h2>
          </div>
          <button onClick={onClose} className="text-sm px-3 py-1 rounded border">Tutup</button>
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <div className="grid gap-2">
            <label className="text-sm opacity-70">Target Margin (%)</label>
            <input
              className="border rounded-lg px-3 py-2"
              inputMode="numeric"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="35"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={doSuggest}
              disabled={loading}
              className="rounded-lg px-4 py-2 bg-black text-white disabled:opacity-50"
            >
              {loading ? "Meminta AI..." : "Minta Bantuan AI"}
            </button>
          </div>
        </div>

        {err && <div className="mt-3 text-sm text-red-600">{err}</div>}

        {data && (
          <div className="mt-4 grid gap-3">
            <div className="rounded-xl border p-3">
              <div className="text-sm opacity-70">
                HPP: <b>{data.hpp}</b> • Kategori: {data.kategori || "-"}
              </div>
            </div>

            {/* kartu rekomendasi */}
            <div className="grid gap-3 md:grid-cols-3">
              {data.rekomendasi?.map((r) => (
                <div key={r.tipe} className="rounded-xl border p-4 flex flex-col">
                  <div className="text-xs opacity-60 mb-1">Tipe</div>
                  <div className="text-lg font-semibold">{r.tipe}</div>

                  <div className="mt-3 text-sm">Harga Jual</div>
                  <div className="text-2xl font-bold">{r.harga_jual.toLocaleString()}</div>
                  <div className="text-xs opacity-70">
                    Margin ~ {(r.margin_pct * 100).toFixed(0)}%
                  </div>

                  {r.strategi && (
                    <div className="mt-3">
                      <div className="text-xs opacity-60 mb-1">Strategi</div>
                      <div className="text-sm">{r.strategi}</div>
                    </div>
                  )}

                  {r.alasan && (
                    <div className="mt-2">
                      <div className="text-xs opacity-60 mb-1">Alasan</div>
                      <div className="text-sm opacity-90">{r.alasan}</div>
                    </div>
                  )}

                  <div className="mt-auto pt-3">
                    <button
                      onClick={() => applyPrice(r)}
                      disabled={!!applying}
                      className="w-full rounded-lg px-4 py-2 bg-black text-white disabled:opacity-50"
                    >
                      {applying === r.tipe ? "Menerapkan..." : "Terapkan Harga"}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {data.analisa_umum && (
              <div className="rounded-xl border p-4">
                <div className="text-sm opacity-60 mb-1">Analisa Umum</div>
                <p className="text-sm leading-relaxed">{data.analisa_umum}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
