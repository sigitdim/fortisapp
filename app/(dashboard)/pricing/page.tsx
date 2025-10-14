"use client";

import { useEffect, useMemo, useState } from "react";
import { useOwner } from "@/app/providers/owner-provider";
import { usePricingFinal } from "@/lib/usePricingFinal";
import { updateHargaJualUser } from "@/lib/updateHarga";
import { fetchProdukList, Produk } from "@/lib/products";
import { toRupiah, parseNumber } from "@/lib/rupiah";

type ApiResp = {
  ok: boolean;
  data: {
    produk_id: string;
    owner_id: string;
    nama_produk: string;
    hpp_per_porsi: number;
    harga_jual_user: number | null;
    harga_rekomendasi_standard?: number | null;
    harga_rekomendasi_premium?: number | null;
    note?: string | null;
  };
};

export default function PricingPage() {
  const { ownerId } = useOwner();

  // list produk dari supabase
  const [produkList, setProdukList] = useState<Produk[]>([]);
  const [produkId, setProdukId] = useState<string>("");
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    fetchProdukList().then(setProdukList).catch(console.error);
  }, []);

  const { data, loading, err } = usePricingFinal(produkId, ownerId);
  const api = (data as unknown as ApiResp) || null;

  const [hargaEdit, setHargaEdit] = useState<string>("");

  // sinkron harga edit saat produk / data berubah
  useEffect(() => {
    const hj = api?.data?.harga_jual_user ?? 0;
    setHargaEdit(hj ? String(hj) : "");
  }, [api?.data?.harga_jual_user, produkId]);

  const hpp = api?.data?.hpp_per_porsi ?? 0;
  const rekom = api?.data?.harga_rekomendasi_standard ?? null;

  const hargaNumber = useMemo(() => parseNumber(hargaEdit), [hargaEdit]);
  const profit = useMemo(() => Math.max(0, (hargaNumber || 0) - (hpp || 0)), [hargaNumber, hpp]);
  const marginPct = useMemo(() => (hargaNumber > 0 ? (profit / hargaNumber) * 100 : 0), [profit, hargaNumber]);

  const applyRekom = () => { if (rekom != null) setHargaEdit(String(rekom)); };

  const saveHarga = async () => {
    if (!produkId) return alert("Pilih produk dulu");
    try {
      await updateHargaJualUser(produkId, hargaNumber);
      alert("Harga tersimpan");
      setRefresh((x) => x + 1); // trigger re-fetch
    } catch (e: any) {
      alert("Gagal simpan: " + e.message);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Pricing</h1>

      {/* Picker produk */}
      <div className="flex flex-wrap gap-2 items-center">
        <select
          className="border rounded px-3 py-2 w-[460px]"
          value={produkId}
          onChange={(e) => { setProdukId(e.target.value); setRefresh((x)=>x+1); }}
        >
          <option value="">— Pilih produk —</option>
          {produkList.map((p) => (
            <option key={p.id} value={p.id}>{p.nama_produk}</option>
          ))}
        </select>
        {ownerId ? (
          <div className="text-xs text-gray-500">owner: {ownerId}</div>
        ) : (
          <div className="text-xs text-red-600">Belum login</div>
        )}
      </div>

      {loading && <div>Loading…</div>}
      {err && <div className="text-red-600">Error: {err}</div>}

      {/* Ringkasan */}
      {api?.ok && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl border p-4">
            <div className="text-gray-600 mb-1">Nama Produk</div>
            <div className="text-xl font-semibold">{api.data.nama_produk || "-"}</div>
          </div>
          <div className="rounded-2xl border p-4">
            <div className="text-gray-600 mb-1">HPP / Porsi</div>
            <div className="text-xl font-semibold">{toRupiah(hpp)}</div>
          </div>
          <div className="rounded-2xl border p-4">
            <div className="text-gray-600 mb-1">Rekomendasi (Std)</div>
            <div className="text-xl font-semibold">{rekom != null ? toRupiah(rekom) : "-"}</div>
          </div>
        </div>
      )}

      {/* Editor harga */}
      {api?.ok && (
        <div className="rounded-2xl border p-4 space-y-3">
          <div className="text-lg font-medium">Harga Jual</div>
          <div className="flex flex-wrap gap-2">
            <input
              className="border rounded px-3 py-2 w-60"
              placeholder="harga jual"
              value={hargaEdit}
              onChange={(e) => setHargaEdit(e.target.value)}
              onBlur={(e) => setHargaEdit(String(parseNumber(e.target.value)))}
            />
            <button className="border rounded px-4 py-2" onClick={applyRekom} disabled={rekom == null}>
              Gunakan Rekomendasi
            </button>
            <button className="border rounded px-4 py-2" onClick={saveHarga}>
              Simpan
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3">
            <div className="rounded-xl border p-3">
              <div className="text-gray-600 text-sm">Harga Jual</div>
              <div className="text-xl font-semibold">{toRupiah(hargaNumber)}</div>
            </div>
            <div className="rounded-xl border p-3">
              <div className="text-gray-600 text-sm">Profit / Porsi</div>
              <div className="text-xl font-semibold">{toRupiah(profit)}</div>
            </div>
            <div className="rounded-xl border p-3">
              <div className="text-gray-600 text-sm">Margin</div>
              <div className="text-xl font-semibold">{marginPct.toFixed(1)}%</div>
            </div>
          </div>

          {api.data.note && <div className="text-sm text-gray-500 mt-2">Note: {api.data.note}</div>}
        </div>
      )}

      {/* debug (bisa dihapus) */}
      {api && (
        <details className="rounded-2xl border p-3">
          <summary className="cursor-pointer">Raw response</summary>
          <pre className="text-sm mt-2">{JSON.stringify(api, null, 2)}</pre>
        </details>
      )}
    </div>
  );
}
