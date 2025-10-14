"use client";

import { useState, useMemo } from "react";
import { useOwner } from "@/app/providers/owner-provider";
import { usePricingFinal } from "@/lib/usePricingFinal";
import { updateHargaJualUser } from "@/lib/updateHarga";

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
  const [produkId, setProdukId] = useState<string>("");
  const [refresh, setRefresh] = useState(0);

  const { data, loading, err } = usePricingFinal(produkId, ownerId);
  // data dari hook kita tampilkan sebagai ApiResp (longgar)
  const api = (data as unknown as ApiResp) || null;

  // state harga yang bisa diedit
  const [hargaEdit, setHargaEdit] = useState<string>("");

  // sinkronkan hargaEdit saat data baru masuk
  const hargaJual = api?.data?.harga_jual_user ?? 0;
  const hpp = api?.data?.hpp_per_porsi ?? 0;
  const rekom = api?.data?.harga_rekomendasi_standard ?? null;

  const profit = useMemo(() => Math.max(0, (Number(hargaEdit || hargaJual || 0) || 0) - (hpp || 0)), [hargaEdit, hargaJual, hpp]);
  const marginPct = useMemo(() => {
    const h = Number(hargaEdit || hargaJual || 0) || 0;
    return h > 0 ? (profit / h) * 100 : 0;
  }, [profit, hargaEdit, hargaJual]);

  const applyRekom = () => {
    if (rekom) setHargaEdit(String(rekom));
  };

  const saveHarga = async () => {
    const nilai = Number(hargaEdit || hargaJual || 0);
    if (!produkId || isNaN(nilai)) return;
    await updateHargaJualUser(produkId, nilai);
    // paksa re-fetch
    setRefresh((x) => x + 1);
  };

  // efek kecil: kalau produkId berubah / data baru, set nilai edit awal
  const initHarga = () => {
    setHargaEdit(hargaJual ? String(hargaJual) : "");
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Pricing</h1>

      {/* pilih produk id (sementara manual; nanti ganti dropdown list produk) */}
      <div className="flex gap-2 items-center">
        <input
          className="border rounded px-3 py-2 w-[460px]"
          placeholder="produk_id (UUID)"
          value={produkId}
          onChange={(e) => { setProdukId(e.target.value); setRefresh((x)=>x+1); }}
        />
        <button className="border rounded px-4 py-2" onClick={initHarga}>Load</button>
        {ownerId ? (
          <div className="text-xs text-gray-500">owner: {ownerId}</div>
        ) : (
          <div className="text-xs text-red-600">Belum login</div>
        )}
      </div>

      {/* status */}
      {loading && <div>Loading…</div>}
      {err && <div className="text-red-600">Error: {err}</div>}

      {/* kartu ringkasan */}
      {api?.ok && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl border p-4">
            <div className="text-gray-600 mb-1">Nama Produk</div>
            <div className="text-xl font-semibold">{api.data.nama_produk || "-"}</div>
          </div>
          <div className="rounded-2xl border p-4">
            <div className="text-gray-600 mb-1">HPP / Porsi</div>
            <div className="text-xl font-semibold">{hpp.toLocaleString("id-ID")}</div>
          </div>
          <div className="rounded-2xl border p-4">
            <div className="text-gray-600 mb-1">Rekomendasi (Std)</div>
            <div className="text-xl font-semibold">
              {rekom != null ? rekom.toLocaleString("id-ID") : "-"}
            </div>
          </div>
        </div>
      )}

      {/* editor harga + profit */}
      {api?.ok && (
        <div className="rounded-2xl border p-4 space-y-3">
          <div className="text-lg font-medium">Harga Jual</div>
          <div className="flex flex-wrap gap-2">
            <input
              className="border rounded px-3 py-2 w-60"
              placeholder="harga jual"
              value={hargaEdit}
              onChange={(e) => setHargaEdit(e.target.value)}
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
              <div className="text-xl font-semibold">
                {(Number(hargaEdit || hargaJual || 0) || 0).toLocaleString("id-ID")}
              </div>
            </div>
            <div className="rounded-xl border p-3">
              <div className="text-gray-600 text-sm">Profit / Porsi</div>
              <div className="text-xl font-semibold">{profit.toLocaleString("id-ID")}</div>
            </div>
            <div className="rounded-xl border p-3">
              <div className="text-gray-600 text-sm">Margin</div>
              <div className="text-xl font-semibold">{marginPct.toFixed(1)}%</div>
            </div>
          </div>

          {api.data.note && (
            <div className="text-sm text-gray-500 mt-2">Note: {api.data.note}</div>
          )}
        </div>
      )}

      {/* debug minimal (boleh dihapus kalau sudah oke) */}
      {api && (
        <details className="rounded-2xl border p-3">
          <summary className="cursor-pointer">Raw response</summary>
          <pre className="text-sm mt-2">{JSON.stringify(api, null, 2)}</pre>
        </details>
      )}
    </div>
  );
}
