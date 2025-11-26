"use client";

import React, { useEffect, useMemo, useState } from "react";
import { rupiah } from "@/lib/format";
import {
  useProdukList,
  fallbackProducts,
  type Product,
} from "../_hooks/useProdukList";

/* ========= utils ========= */

function calcProfitPercent(hpp: number, overhead: number, hargaJual: number) {
  if (!hargaJual) return 0;
  const profit = hargaJual - (hpp + overhead);
  return (profit / hargaJual) * 100;
}

function calcProfitPercentFromCost(cost: number, hargaJual: number) {
  if (!hargaJual) return 0;
  const profit = hargaJual - cost;
  return (profit / hargaJual) * 100;
}

function badgeColorForPercent(pct: number) {
  if (pct >= 50) return "bg-green-100 text-green-700";
  if (pct >= 20) return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
}

function classForPercent(pct: number) {
  if (pct >= 50) return "text-green-600";
  if (pct >= 20) return "text-amber-500";
  return "text-red-500";
}

/** Clamp biar gak muncul  -92400% */
function formatPercent(pct: number) {
  const clamped = Math.max(-100, Math.min(300, pct));
  return `${Math.round(clamped)}%`;
}

function parseNumberFromCurrency(input: string): number {
  const digits = input.replace(/[^0-9]/g, "");
  return digits ? parseInt(digits, 10) : 0;
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

/* ========= page ========= */

export default function PromoBundlingPage() {
  const { products, loading } = useProdukList();
  const list: Product[] =
    products && products.length > 0 ? products : fallbackProducts;

  const [menu1, setMenu1] = useState<string | null>(null);
  const [menu2, setMenu2] = useState<string | null>(null);
  const [targetInput, setTargetInput] = useState<string>("30000");

  // DEFAULT: pilih 2 menu dengan profit tertinggi & tidak sama
  useEffect(() => {
    if (!list.length) return;
    // kalau user sudah pernah pilih, jangan di-override
    if (menu1 && menu2) return;

    const withProfit = list.map((p) => {
      const hpp = normalizeMoney(p.hpp);
      const ovh = normalizeMoney(p.overhead);
      const hj = normalizeMoney(p.hargaJual);
      return {
        id: p.id,
        profit: calcProfitPercent(hpp, ovh, hj),
      };
    });

    // urutkan dari profit terbesar ke terkecil
    withProfit.sort((a, b) => b.profit - a.profit);

    const best = withProfit[0]?.id;
    const second =
      withProfit.find((item) => item.id !== best)?.id ?? withProfit[0]?.id;

    if (!menu1 && best) setMenu1(best);
    if (!menu2 && second) setMenu2(second);
  }, [list, menu1, menu2]);

  const product1 =
    list.find((p) => p.id === menu1) ?? (list[0] as Product | undefined);
  const product2 =
    list.find((p) => p.id === menu2) ??
    (list[1] as Product | undefined) ??
    product1;

  const targetPrice = useMemo(
    () => parseNumberFromCurrency(targetInput),
    [targetInput]
  );

  if (!product1 || !product2) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] px-8 pb-10 pt-8">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-[22px] font-semibold leading-[30px] text-gray-900">
            Kalkulator Promo - Bundling
          </h1>
          <div className="mt-6 rounded-[28px] bg-white p-6 shadow-sm">
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

  // NORMALISASI SEMUA ANGKA
  const hpp1 = normalizeMoney(product1.hpp);
  const ovh1 = normalizeMoney(product1.overhead);
  const hj1 = normalizeMoney(product1.hargaJual);

  const hpp2 = normalizeMoney(product2.hpp);
  const ovh2 = normalizeMoney(product2.overhead);
  const hj2 = normalizeMoney(product2.hargaJual);

  const totalCost = hpp1 + ovh1 + hpp2 + ovh2;
  const profitPct = totalCost
    ? calcProfitPercentFromCost(totalCost, targetPrice || 0)
    : 0;

  const afterTax = Math.round((targetPrice || 0) * 1.1);
  const onlineFood = Math.round((targetPrice || 0) * 1.15);

  const profitMenu1 = calcProfitPercent(hpp1, ovh1, hj1);
  const profitMenu2 = calcProfitPercent(hpp2, ovh2, hj2);

  return (
    <div className="min-h-screen bg-[#F5F5F5] px-8 pb-10 pt-8">
      <div className="mx-auto max-w-6xl">
        {/* TITLE */}
        <h1 className="text-[22px] font-semibold leading-[30px] text-gray-900">
          Kalkulator Promo - Bundling
        </h1>

        {/* KARTU UTAMA */}
        <div className="mt-6 rounded-[28px] bg-white px-6 py-6 shadow-sm">
          {/* ====== BARIS PILIH MENU 1 & 2 ====== */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* MENU 1 */}
            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-900">
                Pilih Menu 1
              </p>

              <div className="inline-flex w-full items-center rounded-full border border-gray-300 bg-white px-4 py-2">
                <select
                  value={menu1 ?? ""}
                  onChange={(e) => setMenu1(e.target.value)}
                  className="w-full bg-transparent text-sm text-gray-900 outline-none"
                >
                  {list.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-2 rounded-[24px] border border-gray-200 bg-white px-5 py-4">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {product1.name}
                  </h3>
                  <span
                    className={`text-sm font-semibold ${classForPercent(
                      profitMenu1
                    )}`}
                  >
                    {formatPercent(profitMenu1)}
                  </span>
                </div>
                <div className="mt-4 space-y-1 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>HPP</span>
                    <span className="font-medium text-gray-900">
                      {rupiah(hpp1)}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Overhead</span>
                    <span className="font-medium text-gray-900">
                      {rupiah(ovh1)}
                    </span>
                  </div>
                  <div className="flex justify-between font-semibold text-gray-900">
                    <span>Harga Jual</span>
                    <span>{rupiah(hj1)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* MENU 2 */}
            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-900">
                Pilih Menu 2
              </p>

              <div className="inline-flex w-full items-center rounded-full border border-gray-300 bg-white px-4 py-2">
                <select
                  value={menu2 ?? ""}
                  onChange={(e) => setMenu2(e.target.value)}
                  className="w-full bg-transparent text-sm text-gray-900 outline-none"
                >
                  {list.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-2 rounded-[24px] border border-gray-200 bg-white px-5 py-4">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {product2.name}
                  </h3>
                  <span
                    className={`text-sm font-semibold ${classForPercent(
                      profitMenu2
                    )}`}
                  >
                    {formatPercent(profitMenu2)}
                  </span>
                </div>
                <div className="mt-4 space-y-1 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>HPP</span>
                    <span className="font-medium text-gray-900">
                      {rupiah(hpp2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Overhead</span>
                    <span className="font-medium text-gray-900">
                      {rupiah(ovh2)}
                    </span>
                  </div>
                  <div className="flex justify-between font-semibold text-gray-900">
                    <span>Harga Jual</span>
                    <span>{rupiah(hj2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* GARIS PEMISAH */}
          <div className="mt-8 border-t border-gray-100" />

          {/* ====== TARGET BUNDLING + HASIL ====== */}
          <div className="mt-6">
            <p className="text-sm font-semibold text-gray-900">
              Target Harga Bundling
            </p>

            <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
              <input
                type="text"
                value={targetInput}
                onChange={(e) => setTargetInput(e.target.value)}
                placeholder="Rp 30.000"
                className="h-11 w-full flex-1 rounded-full border border-gray-300 bg-white px-5 text-sm font-medium text-gray-900 placeholder:text-gray-400 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
              />
              <button
                type="button"
                onClick={() =>
                  alert("Bantuan AI untuk bundling akan segera tersedia")
                }
                className="h-11 shrink-0 rounded-full bg-red-600 px-6 text-[11px] font-semibold uppercase tracking-[0.08em] text-white shadow-sm"
              >
                Bantuan AI ➜
              </button>
            </div>

            <div className="mt-4 rounded-[24px] border-2 border-red-500 bg-white px-6 py-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <span>{product1.name}</span>
                <span className="text-gray-500">+</span>
                <span>{product2.name}</span>
              </div>

              <p className="mt-2 text-2xl font-semibold text-gray-900">
                {rupiah(targetPrice || 0)}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${badgeColorForPercent(
                    profitPct
                  )}`}
                >
                  Profit {formatPercent(profitPct)}
                </span>
              </div>

              <p className="mt-3 text-xs leading-relaxed text-gray-600">
                Promo ini mungkin akan susah dijalankan jika margin terlalu
                kecil. Pertimbangkan volume penjualan dan strategi upselling
                agar bundling tetap menguntungkan.
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
        </div>
      </div> 
    </div>
  );
}
