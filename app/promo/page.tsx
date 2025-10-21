// app/promo/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchProdukList, api } from "@/lib/api";

type ProdukOpt = { id: string; nama: string; };
type PromoPayload = {
  nama: string;
  tipe: "diskon" | "b1g1" | "tebus" | "bundling";
  aktif: boolean;
  mulai?: string | null;
  selesai?: string | null;
  produk_ids: string[];
  // khusus diskon:
  jenis_diskon?: "percent" | "nominal";
  nilai?: number;
  min_margin_pct?: number; // ex: 0.2 = 20%
};

export default function PromoPage() {
  const [produkOpts, setProdukOpts] = useState<ProdukOpt[]>([]);
  const [loadingProduk, setLoadingProduk] = useState(false);

  // form states ringkas
  const [nama, setNama] = useState("");
  const [tipe, setTipe] = useState<PromoPayload["tipe"]>("diskon");
  const [aktif, setAktif] = useState(true);
  const [mulai, setMulai] = useState<string>("");
  const [selesai, setSelesai] = useState<string>("");
  const [produkIds, setProdukIds] = useState<string[]>([]);
  const [jenisDiskon, setJenisDiskon] = useState<"percent"|"nominal">("percent");
  const [nilai, setNilai] = useState<number>(0);
  const [minMarginPct, setMinMarginPct] = useState<number>(0);

  useEffect(() => {
    (async () => {
      setLoadingProduk(true);
      try {
        const list = await fetchProdukList();
        setProdukOpts(list);
      } finally {
        setLoadingProduk(false);
      }
    })();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nama.trim()) return alert("Nama promo wajib diisi");
    if (!produkIds.length) return alert("Pilih minimal 1 produk");

    const payload: PromoPayload = {
      nama: nama.trim(),
      tipe,
      aktif,
      mulai: mulai || null,
      selesai: selesai || null,
      produk_ids: produkIds,
    };

    if (tipe === "diskon") {
      payload.jenis_diskon = jenisDiskon;
      payload.nilai = Number.isFinite(Number(nilai)) ? Number(nilai) : 0;
      payload.min_margin_pct = minMarginPct > 1 ? minMarginPct/100 : minMarginPct; // boleh input 20 atau 0.2
    }

    // kirim ke BE (menyesuaikan kontrak yang sudah kamu pakai kemarin)
    try {
      await api("/promo", { method: "POST", body: payload });
      alert("Promo tersimpan ✔");
      // reset singkat
      setNama(""); setProdukIds([]); setNilai(0);
    } catch (err:any) {
      alert(`Gagal simpan promo: ${err?.message || err}`);
    }
  }

  const labelProduk = useMemo(() =>
    produkOpts.reduce<Record<string,string>>((acc, p) => (acc[p.id]=p.nama, acc), {})
  , [produkOpts]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Buat Promo</h1>

      <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <label className="block">
            <div className="text-sm mb-1">Nama Promo</div>
            <input value={nama} onChange={e=>setNama(e.target.value)}
                   placeholder="Contoh: Oktober Hemat 2"
                   className="border rounded-xl px-3 py-2 w-full"/>
          </label>

          <label className="block">
            <div className="text-sm mb-1">Periode Mulai</div>
            <input type="date" value={mulai} onChange={e=>setMulai(e.target.value)}
                   className="border rounded-xl px-3 py-2 w-full"/>
          </label>

          <label className="block">
            <div className="text-sm mb-1">Status</div>
            <select value={aktif ? "aktif":"nonaktif"} onChange={e=>setAktif(e.target.value==="aktif")}
                    className="border rounded-xl px-3 py-2 w-full">
              <option value="aktif">Aktif</option>
              <option value="nonaktif">Nonaktif</option>
            </select>
          </label>

          {tipe === "diskon" && (
            <>
              <label className="block">
                <div className="text-sm mb-1">Jenis Diskon</div>
                <select value={jenisDiskon} onChange={e=>setJenisDiskon(e.target.value as any)}
                        className="border rounded-xl px-3 py-2 w-full">
                  <option value="percent">Persen (%)</option>
                  <option value="nominal">Nominal (Rp)</option>
                </select>
              </label>

              <label className="block">
                <div className="text-sm mb-1">{jenisDiskon==="percent"?"Nilai (%)":"Nilai (Rp)"}</div>
                <input type="number" value={nilai} onChange={e=>setNilai(Number(e.target.value))}
                       className="border rounded-xl px-3 py-2 w-full"/>
              </label>

              <label className="block">
                <div className="text-sm mb-1">Min Margin (%)</div>
                <input type="number" value={minMarginPct}
                       onChange={e=>setMinMarginPct(Number(e.target.value))}
                       className="border rounded-xl px-3 py-2 w-full"/>
              </label>
            </>
          )}
        </div>

        <div className="space-y-3">
          <label className="block">
            <div className="text-sm mb-1">Tipe Promo</div>
            <select value={tipe} onChange={e=>setTipe(e.target.value as any)}
                    className="border rounded-xl px-3 py-2 w-full">
              <option value="diskon">Diskon</option>
              <option value="b1g1">Beli 1 Gratis 1</option>
              <option value="tebus">Tebus Murah</option>
              <option value="bundling">Bundling</option>
            </select>
          </label>

          <label className="block">
            <div className="text-sm mb-1">Periode Selesai</div>
            <input type="date" value={selesai} onChange={e=>setSelesai(e.target.value)}
                   className="border rounded-xl px-3 py-2 w-full"/>
          </label>

          <label className="block">
            <div className="text-sm mb-1">Produk</div>

            {/* Multi-select sederhana; kalau kamu punya combobox custom, ganti bagian ini */}
            <select multiple
              value={produkIds}
              onChange={e=>{
                const vals = Array.from(e.target.selectedOptions).map(o=>o.value);
                setProdukIds(vals);
              }}
              className="border rounded-xl px-3 py-2 w-full h-40"
            >
              {loadingProduk && <option>Memuat…</option>}
              {!loadingProduk && !produkOpts.length && <option>— Tidak ada hasil —</option>}
              {produkOpts.map(p => (
                <option key={p.id} value={p.id}>{p.nama}</option>
              ))}
            </select>

            {/* Chips preview */}
            {!!produkIds.length && (
              <div className="flex flex-wrap gap-2 mt-2">
                {produkIds.map(id => (
                  <span key={id} className="px-2 py-1 rounded-full bg-gray-100 text-xs">
                    {labelProduk[id] || id}
                  </span>
                ))}
              </div>
            )}
          </label>
        </div>

        <div className="md:col-span-2">
          <button type="submit" className="px-4 py-2 rounded-xl bg-black text-white">
            Simpan Promo
          </button>
        </div>
      </form>
    </div>
  );
}
