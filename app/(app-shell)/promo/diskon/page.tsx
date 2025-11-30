"use client";

import React, { useEffect, useMemo, useState } from "react";
import { rupiah } from "@/lib/format";
import {
  useProdukList,
  fallbackProducts,
  type Product,
} from "../_hooks/useProdukList";

/* ========= icon kecil kaca pembesar (mirip PNG) ========= */

const SearchIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    className={className}
  >
    <circle
      cx="11"
      cy="11"
      r="6"
      stroke="currentColor"
      strokeWidth="1.8"
      fill="none"
    />
    <line
      x1="15"
      y1="15"
      x2="20"
      y2="20"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

/* ========= utils ========= */

function parseNumberFromCurrency(input: string): number {
  const digits = input.replace(/[^0-9]/g, "");
  return digits ? parseInt(digits, 10) : 0;
}

function calcProfitPercent(hpp: number, overhead: number, hargaJual: number) {
  if (!hargaJual) return 0;
  const profit = hargaJual - (hpp + overhead);
  return (profit / hargaJual) * 100;
}

function classForPercent(pct: number) {
  if (pct >= 50) return "text-green-600";
  if (pct >= 20) return "text-amber-500";
  return "text-red-500";
}

function badgeColorForPercent(pct: number) {
  if (pct >= 50) return "bg-green-100 text-green-700";
  if (pct >= 20) return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
}

/** Biar gak muncul angka aneh kayak -92400% */
function formatPercent(pct: number) {
  const clamped = Math.max(-100, Math.min(300, pct));
  return `${Math.round(clamped)}%`;
}

/**
 * Normalisasi angka uang:
 * - Kalau sangat besar (>= 1.000.000) dan kelipatan 1000,
 *   diasumsikan masih “per 1000” → dibagi 1000.
 * - Kalau tidak, pakai apa adanya.
 */
function normalizeMoney(value: number | null | undefined): number {
  const v = typeof value === "number" ? value : 0;
  if (v >= 1_000_000 && v % 1_000 === 0) {
    const candidate = v / 1_000;
    if (candidate < 500_000) return candidate;
  }
  return v;
}

/* ========= AI copy buat penjelasan promo ========= */

function getPromoInsight(profitPct: number): string {
  if (!Number.isFinite(profitPct)) profitPct = 0;

  if (profitPct < 5) {
    return (
      "Promo ini terlalu agresif. Margin hampir habis, sebaiknya dipakai " +
      "hanya untuk momen tertentu (launching / cuci gudang) dan dibatasi kuotanya."
    );
  }

  if (profitPct < 15) {
    return (
      "Profit sangat tipis. Batasi durasi promo, pastikan volume penjualan benar-benar naik, " +
      "dan gunakan promo ini lebih sebagai penarik traffic saja."
    );
  }

  if (profitPct < 30) {
    return (
      "Promo masih aman tapi margin mulai menipis. Cocok untuk campaign jangka pendek " +
      "atau dipaketkan dengan menu lain yang marginnya lebih tinggi."
    );
  }

  if (profitPct < 50) {
    return (
      "Promo ini cukup sehat. Kamu masih punya ruang profit yang nyaman sambil tetap kompetitif di harga. " +
      "Bisa dipakai sebagai promo rutin mingguan/bulanan."
    );
  }

  return (
    "Promo ini sangat sehat. Margin masih tebal walaupun sudah diberi diskon, " +
    "kamu bisa lebih agresif di marketing (iklan, bundling, upsell) tanpa takut rugi."
  );
}

/* ========= page ========= */

export default function PromoDiskonPage() {
  const { products, loading } = useProdukList();
  const rawList: Product[] =
    products && products.length > 0 ? products : fallbackProducts;

  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [targetInput, setTargetInput] = useState<string>("20000");
  const [aiNote, setAiNote] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(false);

  /* ========== LIST + SORT PROFIT DESC ========== */

  const sortedListByProfit = useMemo(() => {
    return [...rawList].sort((a, b) => {
      const aPct = calcProfitPercent(
        normalizeMoney(a.hpp),
        normalizeMoney(a.overhead),
        normalizeMoney(a.hargaJual)
      );
      const bPct = calcProfitPercent(
        normalizeMoney(b.hpp),
        normalizeMoney(b.overhead),
        normalizeMoney(b.hargaJual)
      );
      return bPct - aPct; // terbesar → terkecil
    });
  }, [rawList]);

  // default: pilih item profit tertinggi (index 0 dari sortedListByProfit)
  useEffect(() => {
    if (!selectedId && sortedListByProfit.length > 0) {
      setSelectedId(sortedListByProfit[0].id);
    }
  }, [sortedListByProfit, selectedId]);

  // filter berdasarkan search, DI ATAS list yg sudah di-sort profit
  const filteredProducts = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return sortedListByProfit;
    return sortedListByProfit.filter((p) =>
      p.name.toLowerCase().includes(term)
    );
  }, [sortedListByProfit, search]);

  // kalau hasil filter tidak mengandung selectedId → auto pindah ke item pertama hasil filter
  useEffect(() => {
    if (!filteredProducts.length) return;
    if (!selectedId) {
      setSelectedId(filteredProducts[0].id);
      return;
    }
    const stillExists = filteredProducts.some((p) => p.id === selectedId);
    if (!stillExists) {
      setSelectedId(filteredProducts[0].id);
    }
  }, [filteredProducts, selectedId]);

  const selected: Product | null =
    filteredProducts.find((p) => p.id === selectedId) ??
    sortedListByProfit[0] ??
    null;

  const targetPrice = useMemo(
    () => parseNumberFromCurrency(targetInput),
    [targetInput]
  );

  if (!selected) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] px-8 pb-10 pt-8">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-[22px] font-semibold leading-[30px] text-gray-900">
            Kalkulator Promo - Diskon
          </h1>
        <div className="mt-6 rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-600">
              {loading
                ? "Memuat daftar menu..."
                : "Belum ada menu di Daftar Menu. Tambahkan produk terlebih dahulu."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // NORMALISASI ANGKA BIAYA / HARGA
  const normalizedHpp = normalizeMoney(selected.hpp);
  const normalizedOverhead = normalizeMoney(selected.overhead);
  const normalizedHargaJual = normalizeMoney(selected.hargaJual);

  const cost = normalizedHpp + normalizedOverhead;

  const basePriceDisplay =
    normalizedHargaJual && normalizedHargaJual > 0
      ? normalizedHargaJual
      : cost
      ? Math.round(cost * 1.6)
      : 0;

  const baseProfitPct = calcProfitPercent(
    normalizedHpp,
    normalizedOverhead,
    basePriceDisplay
  );

  const newProfitPct = calcProfitPercent(
    normalizedHpp,
    normalizedOverhead,
    targetPrice || basePriceDisplay
  );

  const afterTax = Math.round((targetPrice || 0) * 1.1);
  const onlineFood = Math.round((targetPrice || 0) * 1.15);

  /* ====== Bantuan AI ====== */
  const handleAiClick = () => {
    if (!cost) return;

    const currentPrice = basePriceDisplay || Math.round(cost * 1.6);

    const targetMargin = 0.5; // 50% margin ideal
    let suggested = Math.round(cost / (1 - targetMargin));

    if (suggested >= currentPrice) {
      suggested = Math.round((cost + currentPrice) / 2);
    }

    if (suggested <= cost) {
      suggested = Math.round(cost * 1.1);
    }

    const profitPct = calcProfitPercent(
      normalizedHpp,
      normalizedOverhead,
      suggested
    );

    setTargetInput(String(suggested));
    setAiNote(
      `AI menyarankan harga sekitar ${rupiah(
        suggested
      )} dengan perkiraan profit ${formatPercent(profitPct)}.`
    );
  };

  const isSelectedRecommended =
    selected.id === (sortedListByProfit[0]?.id ?? null);

  /* ========= RENDER ========= */

  return (
    <div className="min-h-screen bg-[#F5F5F5] px-8 pb-10 pt-8">
      <div className="mx-auto max-w-6xl">
        {/* TITLE */}
        <h1 className="text-[22px] font-semibold leading-[30px] text-gray-900">
          Kalkulator Promo - Diskon
        </h1>

        {/* ================== CARD 1: PILIH MENU (ATAS) ================== */}
        <section className="mt-6 rounded-[28px] bg-white px-6 py-5 shadow-sm">
          {/* header + search */}
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-base font-semibold text-gray-900">
              Pilih Menu
            </h2>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  // search selalu aktif, baik dropdown kebuka maupun nggak
                }}
                placeholder="Cari menu..."
                className="h-9 rounded-full border border-red-500 bg-white px-4 text-xs outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
              />
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-red-600 text-white shadow-sm"
              >
                <SearchIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* ========== BARIS TERPILIH + DROPDOWN LIST ========== */}
          <div className="relative">
            {/* Baris menu yang sedang dipilih */}
            <button
              type="button"
              onClick={() => setListOpen((v) => !v)}
              className="flex w-full items-center justify-between rounded-[24px] border border-gray-200 bg-white px-5 py-3 text-left transition hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-900">
                  {selected.name}
                </span>
                {isSelectedRecommended && (
                  <span className="rounded-full bg-gray-100 px-2 py-[2px] text-[10px] font-medium text-gray-600">
                    Rekomendasi
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-gray-900">
                  {rupiah(
                    normalizeMoney(selected.hargaJual) || basePriceDisplay
                  )}
                </span>
                <span
                  className={`text-sm font-semibold ${classForPercent(
                    baseProfitPct
                  )}`}
                >
                  {formatPercent(baseProfitPct)}
                </span>
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-gray-800 shadow-sm">
                  <span className="text-[18px] leading-none">
                    {listOpen ? "▴" : "▾"}
                  </span>
                </div>
              </div>
            </button>

            {/* Dropdown daftar menu (muncul kalau panah diklik) */}
            {listOpen && (
              <div className="absolute left-0 right-0 z-30 mt-2 rounded-2xl border border-gray-200 bg-white py-1 shadow-lg">
                {filteredProducts.length === 0 && (
                  <div className="px-4 py-3 text-xs text-gray-500">
                    Menu tidak ditemukan.
                  </div>
                )}

                {filteredProducts.map((p) => {
                  const nHpp = normalizeMoney(p.hpp);
                  const nOvh = normalizeMoney(p.overhead);
                  const nHarga = normalizeMoney(p.hargaJual);
                  const pct = calcProfitPercent(nHpp, nOvh, nHarga);
                  const isActive = p.id === selected.id;
                  const isRekom = p.id === sortedListByProfit[0]?.id;

                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setSelectedId(p.id);
                        setAiNote(null);
                        setListOpen(false);
                      }}
                      className={`flex w-full items-center justify-between px-5 py-3 text-left text-sm transition ${
                        isActive ? "bg-gray-50" : "hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-gray-900">
                          {p.name}
                        </span>
                        {isRekom && (
                          <span className="rounded-full bg-gray-100 px-2 py-[2px] text-[10px] font-medium text-gray-600">
                            Rekomendasi
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-6">
                        <span className="text-sm font-medium text-gray-900">
                          {rupiah(nHarga)}
                        </span>
                        <span
                          className={`text-sm font-semibold ${classForPercent(
                            pct
                          )}`}
                        >
                          {formatPercent(pct)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ================== ROW 2: DETAIL + TARGET ================== */}
        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          {/* DETAIL MENU (kiri) */}
          <div className="rounded-[28px] border border-gray-200 bg-white px-6 py-5 shadow-sm">
            <div className="flex items-baseline justify-between gap-3">
              <div className="flex items-baseline gap-2">
                <h3 className="text-lg font-semibold text-gray-900">
                  {selected.name}
                </h3>
                <span
                  className={`text-sm font-semibold ${classForPercent(
                    baseProfitPct
                  )}`}
                >
                  {formatPercent(baseProfitPct)}
                </span>
              </div>
            </div>

            <div className="mt-4 space-y-1 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>HPP</span>
                <span className="font-medium text-gray-900">
                  {rupiah(normalizedHpp)}
                </span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Overhead</span>
                <span className="font-medium text-gray-900">
                  {rupiah(normalizedOverhead)}
                </span>
              </div>
              <div className="flex justify-between font-semibold text-gray-900">
                <span>Harga Jual</span>
                <span>{rupiah(normalizedHargaJual)}</span>
              </div>
            </div>
          </div>

          {/* TARGET HARGA DISKON (kanan) */}
          <div className="rounded-[28px] border border-gray-200 bg-white px-6 py-5 shadow-sm">
            <div>
              <p className="text-[14px] font-semibold text-gray-900">
                Target Harga Diskon
              </p>

              <div className="mt-2 flex items-center justify-between gap-4">
                <input
                  type="text"
                  value={targetInput}
                  onChange={(e) => {
                    setTargetInput(e.target.value);
                    setAiNote(null);
                  }}
                  placeholder="Rp 20.000"
                  className="h-11 w-full flex-1 rounded-full border border-gray-300 bg-white px-5 text-sm font-medium text-gray-900 placeholder:text-gray-400 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                />

                <button
                  type="button"
                  onClick={handleAiClick}
                  className="h-11 shrink-0 rounded-full bg-red-600 px-6 text-[11px] font-semibold uppercase tracking-[0.08em] text-white shadow-sm"
                >
                  BANTUAN AI ➜
                </button>
              </div>

              {aiNote && (
                <p className="mt-2 text-[11px] text-gray-500">{aiNote}</p>
              )}
            </div>

            <div className="mt-4 rounded-[22px] border-2 border-red-500 bg-white px-5 py-4">
              <div className="flex flex-wrap items-baseline gap-2 text-lg font-semibold text-gray-900 md:text-xl">
                <span>{rupiah(basePriceDisplay)}</span>
                <span className="text-base text-gray-500">→</span>
                <span>{rupiah(targetPrice || 0)}</span>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${badgeColorForPercent(
                    newProfitPct
                  )}`}
                >
                  Profit {formatPercent(newProfitPct)}
                </span>
              </div>

              <p className="mt-3 text-xs leading-relaxed text-gray-600">
                {getPromoInsight(newProfitPct)}
              </p>

              <div className="mt-4 grid gap-4 text-sm text-gray-800 md:grid-cols-2">
                <div>
                  <p className="text-xs text-gray-500">(After Tax)</p>
                  <p className="font-semibold">{rupiah(afterTax || 0)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">(Online Food)</p>
                  <p className="font-semibold">{rupiah(onlineFood || 0)}</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
