"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import SuccessToast from "@/components/SuccessToast";

/* ========= config ========= */

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "https://api.fortislab.id";
const OWNER_ID = process.env.NEXT_PUBLIC_OWNER_ID || "";

/* ========= types & utils ========= */

type Bahan = {
  id: string;
  nama: string;
  satuan: string;
  harga_per_satuan: number;
};

type Row = {
  id: string;
  bahanId: string | null;
  qty: number;
  unit: string;
  subtotal: number;
};

type HppConfig = {
  overhead_per_porsi: number;
  total_overhead_bulanan: number;
};

function rupiah(n: number | string | null | undefined) {
  const x = typeof n === "string" ? Number(n) : n ?? 0;
  try {
    return x.toLocaleString("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    });
  } catch {
    return `Rp ${x || 0}`;
  }
}

async function callApi(
  path: string,
  options: RequestInit & { asJson?: boolean } = {}
): Promise<any> {
  const { asJson = true, headers, ...rest } = options;
  const url = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;

  const mergedHeaders: HeadersInit = {
    "Content-Type": "application/json",
    "x-owner-id": OWNER_ID,
    ...(headers || {}),
  };

  const res = await fetch(url, {
    ...rest,
    headers: mergedHeaders,
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }

  return asJson ? res.json() : res;
}

function cleanErrorMessage(raw: string): string {
  let msg = raw || "";
  msg = msg.replace(/<[^>]+>/g, "");
  msg = msg.replace(/^Error\s*/i, "");
  return msg.trim();
}

function makeRow(): Row {
  return {
    id: crypto.randomUUID(),
    bahanId: null,
    qty: 0,
    unit: "-",
    subtotal: 0,
  };
}

/* ========= component ========= */

type Tier = "kompetitif" | "standar" | "premium";

export default function HppCalculator() {
  const [namaMenu, setNamaMenu] = useState("");
  const [rows, setRows] = useState<Row[]>([
    makeRow(),
    makeRow(),
    makeRow(),
    makeRow(),
  ]);
  const [bahanOptions, setBahanOptions] = useState<Bahan[]>([]);
  const [hppConfig, setHppConfig] = useState<HppConfig | null>(null);

  const [loadingBahan, setLoadingBahan] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [saving, setSaving] = useState(false);

  const [notice, setNotice] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Target harga jual & AI suggestion
  const [targetHarga, setTargetHarga] = useState<string>("15000");
  const [aiHargaKompetitif, setAiHargaKompetitif] = useState<number | null>(
    null
  );
  const [aiHargaStandar, setAiHargaStandar] = useState<number | null>(null);
  const [aiHargaPremium, setAiHargaPremium] = useState<number | null>(null);
  const [selectedTier, setSelectedTier] = useState<Tier | null>("standar");

  // checkbox pajak & fee channel
  const [includePajak, setIncludePajak] = useState(false);
  const [includeChannel, setIncludeChannel] = useState(false);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 2400);
    return () => clearTimeout(t);
  }, [notice]);

  /* ----- fetch bahan & config ----- */

  useEffect(() => {
    async function fetchBahan() {
      setLoadingBahan(true);
      setErrorMsg(null);
      try {
        const res = await callApi("/setup/bahan", { method: "GET" });

        const raw = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
          ? res
          : [];

        const mapped: Bahan[] = raw.map((x: any, idx: number) => {
          // harga & volume yang dikirim BE
          const hargaRaw =
            typeof x.harga === "number" ? x.harga : Number(x.harga ?? 0);

          const volumeRaw =
            typeof x.volume === "number"
              ? x.volume
              : Number(
                  x.volume ??
                    x.purchase_qty ??
                    x.qty_volume ??
                    x.qty ??
                    0
                );

          const hargaPerSatuanFromBE =
            typeof x.harga_per_satuan === "number"
              ? x.harga_per_satuan
              : Number(x.harga_per_satuan ?? 0);

          let harga_per_satuan = 0;

          // PRIORITAS UTAMA: kalau ada harga & volume, SELALU pakai harga / volume
          if (hargaRaw > 0 && volumeRaw > 0) {
            harga_per_satuan = hargaRaw / volumeRaw;
          } else if (hargaPerSatuanFromBE > 0) {
            // fallback: pakai harga_per_satuan dari BE
            harga_per_satuan = hargaPerSatuanFromBE;
          } else {
            // fallback terakhir: anggap harga sudah per satuan
            harga_per_satuan = hargaRaw;
          }

          return {
            id: String(x.id ?? idx),
            nama: x.nama_bahan ?? x.nama ?? "",
            satuan: x.satuan ?? x.unit ?? "-",
            harga_per_satuan,
          };
        });

        setBahanOptions(mapped);
      } catch (e: any) {
        console.error("Gagal memuat bahan:", e);
        setErrorMsg(
          cleanErrorMessage(e?.message || "Gagal memuat daftar bahan.")
        );
      } finally {
        setLoadingBahan(false);
      }
    }

    async function fetchConfig() {
      setLoadingConfig(true);
      try {
        const res = await callApi("/hpp/config", { method: "GET" });
        if (res && res.ok) {
          setHppConfig({
            overhead_per_porsi: Number(res.overhead_per_porsi || 0),
            total_overhead_bulanan: Number(res.total_overhead_bulanan || 0),
          });
        } else {
          setHppConfig({
            overhead_per_porsi: 0,
            total_overhead_bulanan: 0,
          });
        }
      } catch (e: any) {
        console.error("Gagal memuat /hpp/config:", e);
        // kalau error, jangan matiin halaman, cuma isi 0
        setHppConfig({
          overhead_per_porsi: 0,
          total_overhead_bulanan: 0,
        });
      } finally {
        setLoadingConfig(false);
      }
    }

    fetchBahan();
    fetchConfig();
  }, []);

  /* ----- derived: subtotal & total ----- */

  const rowsWithCalc = useMemo(() => {
    return rows.map((row) => {
      const bahan = row.bahanId
        ? bahanOptions.find((b) => b.id === row.bahanId)
        : undefined;
      const hargaSatuan = bahan?.harga_per_satuan ?? 0;
      const subtotal = row.qty > 0 ? row.qty * hargaSatuan : 0;
      return { ...row, subtotal, unit: bahan?.satuan ?? row.unit };
    });
  }, [rows, bahanOptions]);

  const totalBahan = useMemo(
    () => rowsWithCalc.reduce((sum, r) => sum + (r.subtotal || 0), 0),
    [rowsWithCalc]
  );

  const overheadPerPorsi = hppConfig?.overhead_per_porsi ?? 0;
  const totalHpp = totalBahan + overheadPerPorsi;

  /* ----- handlers row ----- */

  function updateRow(id: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function handleChangeBahan(rowId: string, bahanId: string) {
    const bahan = bahanOptions.find((b) => b.id === bahanId);
    updateRow(rowId, {
      bahanId,
      unit: bahan?.satuan ?? "-",
    });
  }

  function handleChangeQty(rowId: string, value: string) {
    const n = Number(value.replace(",", "."));
    updateRow(rowId, { qty: Number.isNaN(n) ? 0 : n });
  }

  function handleAddRow() {
    setRows((prev) => [...prev, makeRow()]);
  }

  function handleRemoveRow(rowId: string) {
    setRows((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((r) => r.id !== rowId);
    });
  }

  /* ----- AI helper (lokal) ----- */

  function handleBantuanAi() {
    setErrorMsg(null);

    if (totalHpp <= 0) {
      setErrorMsg(
        "Isi komposisi resep dulu supaya HPP bisa dihitung sebelum minta bantuan AI."
      );
      return;
    }

    // rule-of-thumb:
    // kompetitif: margin 25%
    // standar:   margin 40%
    // premium:   margin 60%
    const kompetitif = Math.round(totalHpp / (1 - 0.25));
    const standar = Math.round(totalHpp / (1 - 0.4));
    const premium = Math.round(totalHpp / (1 - 0.6));

    setAiHargaKompetitif(kompetitif);
    setAiHargaStandar(standar);
    setAiHargaPremium(premium);

    // default: pilih standar (sesuai Figma)
    setSelectedTier("standar");
    setTargetHarga(String(standar));

    setNotice("Bantuan AI: rekomendasi harga sudah diisi.");
  }

  function handleSelectTier(tier: Tier) {
    let price: number | null = null;
    if (tier === "kompetitif") price = aiHargaKompetitif;
    if (tier === "standar") price = aiHargaStandar;
    if (tier === "premium") price = aiHargaPremium;

    if (!price) {
      // kalau AI belum pernah di-klik, paksa user klik AI dulu
      setErrorMsg(
        "Klik tombol Bantuan AI dulu supaya rekomendasi harga bisa dihitung."
      );
      return;
    }

    setSelectedTier(tier);
    setTargetHarga(String(price));
  }

  /* ----- derived: rekomendasi harga + pajak + channel ----- */

  const targetHargaNumber = Number(targetHarga) || 0;

  const rekomendasiHarga: number = useMemo(() => {
    if (selectedTier === "kompetitif" && aiHargaKompetitif)
      return aiHargaKompetitif;
    if (selectedTier === "premium" && aiHargaPremium) return aiHargaPremium;
    if (selectedTier === "standar" && aiHargaStandar) return aiHargaStandar;
    return targetHargaNumber;
  }, [
    selectedTier,
    aiHargaKompetitif,
    aiHargaStandar,
    aiHargaPremium,
    targetHargaNumber,
  ]);

  // harga dasar (offline)
  const dasarHarga = rekomendasiHarga > 0 ? rekomendasiHarga : 0;

  // kalau pajak dicentang → +10%, kalau nggak → sama dengan harga dasar
  const hargaSetelahPajak =
    dasarHarga > 0 ? Math.round(dasarHarga * (includePajak ? 1.1 : 1)) : 0;

  // kalau channel dicentang → +20% di atas harga yang dipakai (setelah pajak kalau aktif)
  const basisChannel = includePajak ? hargaSetelahPajak : dasarHarga;
  const hargaOnline =
    basisChannel > 0 ? Math.round(basisChannel * (includeChannel ? 1.2 : 1)) : 0;

  const marginInfo = useMemo(() => {
    if (!dasarHarga || !totalHpp) return null;
    const marginNominal = dasarHarga - totalHpp;
    const marginPercent =
      dasarHarga > 0 ? Math.round((marginNominal / dasarHarga) * 100) : 0;
    return {
      marginNominal,
      marginPercent,
    };
  }, [dasarHarga, totalHpp]);

  /* ----- save menu ----- */

  async function handleSimpanMenu() {
    setErrorMsg(null);

if (!namaMenu.trim()) {
  setErrorMsg("Nama menu wajib diisi.");
  return;
}

/**
 * PENTING:
 * Untuk disimpan ke backend, kita pakai qty dari `rows` (input user),
 * BUKAN dari `rowsWithCalc` (yang sudah dipakai buat perhitungan / konversi).
 *
 * Ini supaya data di tabel `menu_items.qty` = angka yang user isi di UI,
 * bukan angka yang sudah “diproses” dan bisa membengkak (contoh kasus 10 ml → 100).
 */
const itemsPayload = rows
  .filter((r) => r.bahanId && r.qty > 0)
  .map((r) => ({
    bahan_id: r.bahanId,
    qty: Number(r.qty) || 0,
    unit: r.unit,
  }));

if (itemsPayload.length === 0) {
  setErrorMsg("Minimal isi satu bahan resep dengan Qty > 0.");
  return;
}

// DEBUG: pastikan payload yang dikirim sudah benar
console.log("[HPP] POST /menu itemsPayload:", itemsPayload);

    try {
      setSaving(true);

      await callApi("/menu", {
        method: "POST",
        body: JSON.stringify({
          nama_menu: namaMenu.trim(),
          items: itemsPayload,
        }),
      });

      setNotice("Menu & HPP berhasil disimpan.");
      // redirect manual
      window.location.href = "/menu";
    } catch (e: any) {
      console.error("Gagal menyimpan menu:", e);
      setErrorMsg(
        cleanErrorMessage(e?.message || "Gagal menyimpan menu. Coba lagi.")
      );
    } finally {
      setSaving(false);
    }
  }

  /* ========= render ========= */

  return (
    <div className="mx-auto max-w-6xl px-6 py-6 lg:px-8 lg:py-8">
      {notice && (
        <SuccessToast message={notice} onClose={() => setNotice(null)} />
      )}

      <h1 className="mb-1 text-3xl font-extrabold tracking-tight">
        Kalkulator HPP
      </h1>
      <p className="mb-6 text-sm text-gray-600">
        Susun resep, hitung HPP per porsi, dan simpan sebagai menu.
      </p>

      {errorMsg && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      {/* ====== Nama Menu + Resep ====== */}
      <div className="mb-6 rounded-2xl bg-white shadow-sm ring-1 ring-gray-200">
        <div className="border-b border-gray-100 px-5 py-4">
          <label className="mb-2 block text-sm font-semibold text-gray-800">
            Nama Menu
          </label>
          <input
            value={namaMenu}
            onChange={(e) => setNamaMenu(e.target.value)}
            placeholder="ex: Es Kopi Susu Gula Aren"
            className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-gray-400"
          />
        </div>

        <div className="px-5 pb-5 pt-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-800">Nama Resep</h2>
            <button
              type="button"
              onClick={handleAddRow}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-800 hover:bg-gray-50"
            >
              <Plus className="h-4 w-4" />
              <span>Tambah</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-y border-gray-100 text-left text-xs font-semibold text-gray-500">
                  <th className="px-2 py-2 md:px-3">Nama Bahan</th>
                  <th className="px-2 py-2 text-center md:px-3">Qty.</th>
                  <th className="px-2 py-2 text-center md:px-3">Unit</th>
                  <th className="px-2 py-2 text-right md:px-3">Harga</th>
                  <th className="px-2 py-2 text-center md:px-3"></th>
                </tr>
              </thead>
              <tbody>
                {rowsWithCalc.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-gray-50 hover:bg-gray-50/60"
                  >
                    <td className="px-2 py-2.5 md:px-3">
                      <select
                        value={row.bahanId ?? ""}
                        onChange={(e) =>
                          handleChangeBahan(row.id, e.target.value)
                        }
                        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs md:text-sm outline-none focus:border-gray-400"
                      >
                        <option value="">Pilih bahan resep</option>
                        {bahanOptions.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.nama}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="px-2 py-2.5 text-center md:px-3">
                      <input
                        type="number"
                        min={0}
                        value={row.qty || ""}
                        onChange={(e) =>
                          handleChangeQty(row.id, e.target.value)
                        }
                        className="w-20 rounded-xl border border-gray-300 px-2 py-2 text-center text-xs md:text-sm outline-none focus:border-gray-400"
                      />
                    </td>

                    <td className="px-2 py-2.5 text-center md:px-3 text-xs text-gray-700">
                      {row.unit || "-"}
                    </td>

                    <td className="px-2 py-2.5 text-right md:px-3 text-xs md:text-sm text-gray-800">
                      {row.subtotal > 0 ? rupiah(row.subtotal) : "-"}
                    </td>

                    <td className="px-2 py-2.5 text-center md:px-3">
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(row.id)}
                        disabled={rows.length <= 1}
                        className="rounded-lg p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}

                {loadingBahan && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-2 py-3 text-center text-xs text-gray-500"
                    >
                      Memuat daftar bahan…
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* total di kanan bawah kartu resep, mirip Figma */}
          <div className="mt-4 flex justify-end">
            <div className="space-y-0.5 text-xs md:text-sm text-gray-700">
              <div className="flex justify-between gap-8">
                <span>Total Harga Bahan</span>
                <span className="font-semibold">
                  {rupiah(totalBahan || 0)}
                </span>
              </div>
              <div className="flex justify-between gap-8">
                <span>Total Overhead</span>
                <span className="font-semibold">
                  {loadingConfig ? "…" : rupiah(overheadPerPorsi || 0)}
                </span>
              </div>
              <div className="flex justify-between gap-8 border-t border-gray-200 pt-1.5 font-semibold">
                <span>Total HPP</span>
                <span>{rupiah(totalHpp || 0)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ====== Target Harga Jual + Estimasi Profit ====== */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Target Harga Jual */}
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-200">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-gray-800">
              Target Harga Jual
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Masukkan target harga jual per porsi.
            </p>
          </div>

          <div className="px-5 pb-5 pt-4 space-y-4">
            {/* input harga */}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                Harga Jual (Rp)
              </label>
              <div className="flex items-center rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus-within:border-gray-400">
                <span className="mr-2 text-gray-500">Rp</span>
                <input
                  type="number"
                  min={0}
                  value={targetHarga}
                  onChange={(e) => setTargetHarga(e.target.value)}
                  placeholder="15000"
                  className="w-full border-none bg-transparent text-sm outline-none"
                />
              </div>
            </div>

            {/* header + tombol AI */}
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-gray-500">
                KOMPETITIF &nbsp;•&nbsp; STANDAR &nbsp;•&nbsp; PREMIUM
              </div>
              <button
                type="button"
                onClick={handleBantuanAi}
                className="inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 active:scale-[0.99]"
              >
                <span>🤖 Bantuan AI</span>
              </button>
            </div>

            {/* 3 opsi harga */}
            <div className="grid grid-cols-3 gap-2">
              {/* Kompetitif */}
              <button
                type="button"
                onClick={() => handleSelectTier("kompetitif")}
                className={`rounded-xl px-3 py-2 text-center text-xs transition ${
                  selectedTier === "kompetitif"
                    ? "border border-red-500 bg-red-600 text-white"
                    : "border border-gray-300 bg-white text-gray-900 hover:bg-gray-50"
                }`}
              >
                <div className="mb-1 text-[11px] font-semibold opacity-80">
                  Kompetitif
                </div>
                <div className="text-sm font-semibold">
                  {aiHargaKompetitif ? rupiah(aiHargaKompetitif) : "-"}
                </div>
              </button>

              {/* Standar */}
              <button
                type="button"
                onClick={() => handleSelectTier("standar")}
                className={`rounded-xl px-3 py-2 text-center text-xs transition ${
                  selectedTier === "standar"
                    ? "border border-red-500 bg-red-600 text-white"
                    : "border border-gray-300 bg-white text-gray-900 hover:bg-gray-50"
                }`}
              >
                <div className="mb-1 text-[11px] font-semibold opacity-80">
                  Standar
                </div>
                <div className="text-sm font-semibold">
                  {aiHargaStandar ? rupiah(aiHargaStandar) : "-"}
                </div>
              </button>

              {/* Premium */}
              <button
                type="button"
                onClick={() => handleSelectTier("premium")}
                className={`rounded-xl px-3 py-2 text-center text-xs transition ${
                  selectedTier === "premium"
                    ? "border border-red-500 bg-red-600 text-white"
                    : "border border-gray-300 bg-white text-gray-900 hover:bg-gray-50"
                }`}
              >
                <div className="mb-1 text-[11px] font-semibold opacity-80">
                  Premium
                </div>
                <div className="text-sm font-semibold">
                  {aiHargaPremium ? rupiah(aiHargaPremium) : "-"}
                </div>
              </button>
            </div>

            {/* checkbox pajak / fee channel */}
            <div className="space-y-2 pt-1">
              <label className="flex items-center gap-2 text-xs text-gray-600">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300"
                  checked={includePajak}
                  onChange={(e) => setIncludePajak(e.target.checked)}
                />
                <span>Pajak 10% (PB1)</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-gray-600">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300"
                  checked={includeChannel}
                  onChange={(e) => setIncludeChannel(e.target.checked)}
                />
                <span>
                  Fee Channel (GrabFood, GoFood, ShopeeFood)
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Estimasi Profit */}
        <div className="flex flex-col rounded-2xl bg-white shadow-sm ring-1 ring-gray-200">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-gray-800">
              Estimasi Profit
            </h2>
          </div>

          <div className="flex flex-1 flex-col px-5 pb-5 pt-4">
            {/* harga rekomendasi utama */}
            <div className="mb-4 rounded-2xl border border-gray-200 bg-white px-4 py-4">
              <p className="mb-1 text-xs font-medium text-gray-600">
                Harga jual rekomendasi
              </p>

              <div className="text-2xl font-extrabold text-gray-900">
                {dasarHarga ? rupiah(dasarHarga) : "Rp -"}
              </div>

              {marginInfo && (
                <p className="mt-1 text-xs font-semibold text-emerald-600">
                  Profit Margin {marginInfo.marginPercent}%
                </p>
              )}

              {/* After tax & online – selalu tampil biar mirip Figma */}
              {dasarHarga > 0 && (
                <>
                  <p className="mt-3 text-xs text-gray-700">
                    {rupiah(hargaSetelahPajak)}{" "}
                    <span
                      className={
                        includePajak ? "text-gray-500" : "text-gray-400"
                      }
                    >
                      (After Tax PB1)
                    </span>
                  </p>
                  <p className="text-xs text-gray-700">
                    {rupiah(hargaOnline)}{" "}
                    <span
                      className={
                        includeChannel ? "text-gray-500" : "text-gray-400"
                      }
                    >
                      (Online Food)
                    </span>
                  </p>
                </>
              )}
            </div>

            {/* text penjelasan bawah */}
            <div className="mt-1 flex-1 text-xs leading-relaxed text-gray-500">
              <p className="mb-1">
                Angka di atas adalah estimasi kasar berdasarkan total HPP per
                porsi. Kamu tetap bisa menyesuaikan harga jual sesuai strategi
                bisnis dan positioning brand.
              </p>
              <p>
                Untuk hasil terbaik, gunakan kombinasi antara rekomendasi AI,
                kompetitor di sekitar, dan target margin usahamu.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ====== tombol simpan ====== */}
      <div className="mt-8 flex justify-end">
        <button
          type="button"
          onClick={handleSimpanMenu}
          disabled={saving}
          className="inline-flex w-full items-center justify-center rounded-2xl bg-red-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-red-700 active:scale-[0.99] md:w-auto"
        >
          {saving ? "Menyimpan..." : "Simpan sebagai Menu"}
        </button>
      </div>
    </div>
  );
}
