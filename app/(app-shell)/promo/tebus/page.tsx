"use client";

import React, { useEffect, useMemo, useState } from "react";
import { rupiah } from "@/lib/format";
import {
  useProdukList,
  fallbackProducts,
  type Product,
} from "../_hooks/useProdukList";

/* ========= utils ========= */

function parseNumberFromCurrency(input: string): number {
  const digits = input.replace(/[^0-9]/g, "");
  return digits ? parseInt(digits, 10) : 0;
}

function calcProfitPercent(cost: number, price: number) {
  if (!price) return 0;
  return ((price - cost) / price) * 100;
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

function formatPercent(pct: number) {
  const clamped = Math.max(-100, Math.min(300, pct));
  return `${Math.round(clamped)}%`;
}

/* ========= AI copy untuk Tebus Murah ========= */

function getTebusInsight(profitPct: number): string {
  if (!Number.isFinite(profitPct)) profitPct = 0;

  if (profitPct < 5) {
    return (
      "Promo Tebus Murah ini terlalu agresif. Margin hampir habis, sebaiknya hanya dipakai " +
      "untuk momen tertentu (launching / cuci gudang) dan dibatasi kuotanya."
    );
  }

  if (profitPct < 15) {
    return (
      "Profit paket sangat tipis. Batasi periode promo atau buat syarat minimal pembelian, " +
      "dan pastikan ada menu lain yang marginnya lebih tinggi untuk di-upsell."
    );
  }

  if (profitPct < 30) {
    return (
      "Promo masih aman tapi margin mulai menipis. Cocok untuk campaign jangka pendek " +
      "untuk dorong penjualan menu utama sekaligus mengenalkan produk kedua."
    );
  }

  if (profitPct < 50) {
    return (
      "Promo Tebus Murah ini cukup sehat. Kamu memberi harga tebus menarik sambil tetap menjaga " +
      "margin yang nyaman. Bisa dipakai sebagai paket andalan harian atau mingguan."
    );
  }

  return (
    "Promo ini sangat sehat. Margin paket masih tebal walaupun produk kedua ditebus lebih murah, " +
    "kamu bisa lebih agresif di marketing (iklan, voucher, bundling lebih besar) tanpa takut rugi."
  );
}

/* ========= page ========= */

export default function PromoTebusMurahPage() {
  const { products, loading } = useProdukList();
  const list: Product[] =
    products && products.length > 0 ? products : fallbackProducts;

  const [menu1, setMenu1] = useState<string | null>(null);
  const [menu2, setMenu2] = useState<string | null>(null);
  const [targetInput, setTargetInput] = useState<string>("5000");
  const [aiNote, setAiNote] = useState<string | null>(null);

  const listWithProfit = useMemo(() => {
    return list.map((p) => {
      const cost = p.hpp + p.overhead;
      const pct = calcProfitPercent(cost, p.hargaJual);
      return { ...p, baseProfitPct: pct };
    });
  }, [list]);

  const sortedByProfit = useMemo(
    () =>
      [...listWithProfit].sort(
        (a, b) => (b.baseProfitPct || 0) - (a.baseProfitPct || 0)
      ),
    [listWithProfit]
  );

  useEffect(() => {
    if (!sortedByProfit.length) return;

    if (!menu1) {
      setMenu1(sortedByProfit[0].id);
    }

    if (!menu2) {
      if (sortedByProfit.length > 1) {
        setMenu2(sortedByProfit[1].id);
      } else {
        setMenu2(sortedByProfit[0].id);
      }
    }
  }, [sortedByProfit, menu1, menu2]);

  const product1 = useMemo(
    () =>
      listWithProfit.find((p) => p.id === menu1) ??
      (sortedByProfit[0] as Product | undefined),
    [listWithProfit, sortedByProfit, menu1]
  );

  const product2 = useMemo(
    () =>
      listWithProfit.find((p) => p.id === menu2) ??
      (sortedByProfit[1] as Product | undefined) ??
      product1,
    [listWithProfit, sortedByProfit, menu2, product1]
  );

  const tebusHarga = useMemo(
    () => parseNumberFromCurrency(targetInput),
    [targetInput]
  );

  if (!product1 || !product2) {
    return (
      <div className="p-6 md:p-8">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
            Kalkulator Promo - Tebus Murah
          </h1>
          <div className="mt-2 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
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

  const costMain = product1.hpp + product1.overhead;
  const costBonus = product2.hpp + product2.overhead;
  const totalCost = costMain + costBonus;

  const totalPrice = product1.hargaJual + tebusHarga;
  const profitPct = calcProfitPercent(totalCost, totalPrice);

  const afterTax = Math.round(totalPrice * 1.1);
  const onlineFood = Math.round(totalPrice * 1.15);

  const pct1 = calcProfitPercent(costMain, product1.hargaJual);
  const pct2 = calcProfitPercent(costBonus, product2.hargaJual);

  /* ===== Bantuan AI khusus harga tebus ===== */

  const handleAiClick = () => {
    const desiredMargin = 0.25;
    if (!totalCost) return;

    const idealTotalPrice = Math.round(totalCost / (1 - desiredMargin));
    let suggested = idealTotalPrice - product1.hargaJual;

    const minTebus = Math.max(0, Math.round(costBonus * 1.05));
    const maxTebus = Math.round(product2.hargaJual * 0.8);

    suggested = Math.max(minTebus, suggested);
    suggested = Math.min(maxTebus, suggested);

    if (suggested < 0) suggested = 0;

    setTargetInput(String(suggested));

    const newTotalPrice = product1.hargaJual + suggested;
    const newProfitPct = calcProfitPercent(totalCost, newTotalPrice);

    setAiNote(
      `AI menyarankan harga tebus sekitar ${rupiah(
        suggested
      )} dengan perkiraan profit ${formatPercent(
        newProfitPct
      )} untuk paket ini.`
    );
  };

  return (
    <div className="p-6 md:p-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
          Kalkulator Promo - Tebus Murah
        </h1>

        <div className="mt-2 rounded-2xl border border-gray-200 bg-white px-6 py-6 shadow-sm">
          {/* PILIH MENU */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Pilih Menu 1
              </p>
              <div className="mt-2">
                <select
                  value={menu1 ?? ""}
                  onChange={(e) => {
                    setMenu1(e.target.value);
                    setAiNote(null);
                  }}
                  className="w-full rounded-full border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                >
                  {sortedByProfit.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-900">
                Pilih Menu 2
              </p>
              <div className="mt-2">
                <select
                  value={menu2 ?? ""}
                  onChange={(e) => {
                    setMenu2(e.target.value);
                    setAiNote(null);
                  }}
                  className="w-full rounded-full border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                >
                  {sortedByProfit.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* KARTU + HASIL */}
          <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_minmax(0,1.1fr)]">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {product1.name}
                  </h3>
                  <span
                    className={`text-sm font-semibold ${classForPercent(
                      pct1
                    )}`}
                  >
                    {formatPercent(pct1)}
                  </span>
                </div>
                <div className="mt-4 space-y-1 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>HPP</span>
                    <span className="font-medium text-gray-900">
                      {rupiah(product1.hpp)}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Overhead</span>
                    <span className="font-medium text-gray-900">
                      {rupiah(product1.overhead)}
                    </span>
                  </div>
                  <div className="flex justify-between font-semibold text-gray-900">
                    <span>Harga Jual</span>
                    <span>{rupiah(product1.hargaJual)}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {product2.name}
                  </h3>
                  <span
                    className={`text-sm font-semibold ${classForPercent(
                      pct2
                    )}`}
                  >
                    {formatPercent(pct2)}
                  </span>
                </div>
                <div className="mt-4 space-y-1 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>HPP</span>
                    <span className="font-medium text-gray-900">
                      {rupiah(product2.hpp)}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Overhead</span>
                    <span className="font-medium text-gray-900">
                      {rupiah(product2.overhead)}
                    </span>
                  </div>
                  <div className="flex justify-between font-semibold text-gray-900">
                    <span>Harga Jual</span>
                    <span>{rupiah(product2.hargaJual)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-900">
                Harga Produk Utama
              </p>
              <p className="mt-1 text-sm font-semibold text-gray-900">
                {rupiah(product1.hargaJual)}
              </p>

              <p className="mt-4 text-sm font-semibold text-gray-900">
                Target Harga Tebus Murah
              </p>
              <div className="mt-2 flex items-center gap-3">
                <input
                  type="text"
                  value={targetInput}
                  onChange={(e) => {
                    setTargetInput(e.target.value);
                    setAiNote(null);
                  }}
                  placeholder="Rp 5.000"
                  className="h-11 w-full flex-1 rounded-full border border-gray-300 bg-white px-4 text-sm font-medium text-gray-900 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                />
                <button
                  type="button"
                  onClick={handleAiClick}
                  className="h-11 shrink-0 rounded-full bg-red-600 px-5 text-[11px] font-semibold uppercase tracking-[0.08em] text-white shadow-sm"
                >
                  BANTUAN AI ➜
                </button>
              </div>
              {aiNote && (
                <p className="mt-2 text-[11px] text-gray-500">{aiNote}</p>
              )}

              <div className="mt-4 rounded-2xl border-2 border-red-500 bg-white p-5">
                <p className="text-sm font-semibold text-gray-900">
                  {product1.name}{" "}
                  <span className="text-gray-500">+</span>{" "}
                  {product2.name}{" "}
                  <span className="text-gray-500">(Tebus Murah)</span>
                </p>
                <p className="mt-2 text-2xl font-semibold text-gray-900">
                  {rupiah(totalPrice || 0)}
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
                  {getTebusInsight(profitPct)}
                </p>

                <div className="mt-4 grid gap-4 text-sm text-gray-800 md:grid-cols-2">
                  <div>
                    <p className="text-xs text-gray-500">(After Tax)</p>
                    <p className="font-semibold">
                      {rupiah(afterTax || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">(Online Food)</p>
                    <p className="font-semibold">
                      {rupiah(onlineFood || 0)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
