// app/pricing/assist/page.tsx
"use client";

import * as React from "react";
import AISuggestModal from "@/components/pricing/AISuggestModal";
import { getProdukOptions } from "@/lib/products";

export default function PricingAssistPage() {
  const [options, setOptions] = React.useState<{ value: string; label: string }[]>([]);
  const [selected, setSelected] = React.useState<string>("");
  const [open, setOpen] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setErr(null);
      const rows = await getProdukOptions();
      setOptions(rows);
      if (rows.length && !selected) setSelected(rows[0].value);
      if (!rows.length) setErr("Produk kosong. Tambahkan produk di Setup/Produk.");
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    load();
    const onVis = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const currentName = React.useMemo(
    () => options.find((o) => o.value === selected)?.label,
    [options, selected]
  );

  return (
    <main className="mx-auto max-w-4xl p-4 md:p-8 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">AI Suggestion & Apply Price</h1>
        <p className="text-sm opacity-80">
          Pilih produk, lalu minta rekomendasi harga dari AI (non-chat).
        </p>
      </header>

      <section className="rounded-xl border p-4 grid gap-3 md:grid-cols-[1fr_auto]">
        <div className="grid gap-1">
          <label className="text-sm opacity-70">Produk</label>
          <select
            className="border rounded-lg px-3 py-2"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {loading && <div className="text-xs opacity-70 mt-1">Memuat produk…</div>}
          {err && <div className="text-xs text-red-600 mt-1">{err}</div>}
        </div>

        <div className="flex items-end">
          <button
            onClick={() => setOpen(true)}
            disabled={!selected || loading}
            className="rounded-lg px-4 py-2 bg-black text-white disabled:opacity-50"
          >
            💡 Minta Bantuan AI
          </button>
        </div>
      </section>

      <AISuggestModal
        open={open}
        onClose={() => setOpen(false)}
        produkId={selected}
        produkName={currentName}
        defaultTarget={0.35}
        onApplied={() => {}}
      />
    </main>
  );
}
