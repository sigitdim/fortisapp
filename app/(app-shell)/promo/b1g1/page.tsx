"use client";

import React, { useEffect, useMemo, useState } from "react";
import { rupiah } from "@/lib/format";
import {
  useProdukList,
  fallbackProducts,
  type Product,
} from "../_hooks/useProdukList";

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

function calcProfitPercent(cost: number, price: number) {
  if (!price) return 0;
  return ((price - cost) / price) * 100;
}

function formatPercent(pct: number) {
  return `${Math.round(pct)}%`;
}

export default function PromoB1G1Page() {
  const { products, loading } = useProdukList();
  const list: Product[] =
    products && products.length > 0 ? products : fallbackProducts;

  const [menu1, setMenu1] = useState<string | null>(null);
  const [menu2, setMenu2] = useState<string | null>(null);

  useEffect(() => {
    if (!list.length) return;
    if (!menu1) setMenu1(list[0].id);
    if (!menu2) {
      setMenu2(list[1] ? list[1].id : list[0].id);
    }
  }, [list, menu1, menu2]);

  const product1 = useMemo(
    () =>
      list.find((p) => p.id === menu1) ??
      (list[0] as Product | undefined),
    [list, menu1]
  );
  const product2 = useMemo(
    () =>
      list.find((p) => p.id === menu2) ??
      (list[1] as Product | undefined) ??
      product1,
    [list, menu2, product1]
  );

  if (!product1 || !product2) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] px-6 pb-10 pt-6">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-2xl font-semibold text-gray-900">
            Kalkulator Promo - Buy 1 Get 1
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

  const paidPrice = product1.hargaJual;
  const totalCost =
    product1.hpp +
    product1.overhead +
    product2.hpp +
    product2.overhead;
  const profitPct = calcProfitPercent(totalCost, paidPrice);

  const afterTax = Math.round(paidPrice * 1.1);
  const onlineFood = Math.round(paidPrice * 1.15);

  return (
    <div className="min-h-screen bg-[#F5F5F5] px-6 pb-10 pt-6">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-2xl font-semibold text-gray-900">
          Kalkulator Promo - Buy 1 Get 1
        </h1>

        <div className="mt-6 rounded-3xl bg-white p-6 shadow-sm">
          {/* Top selects */}
          <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Pilih Menu 1
              </p>
              <select
                value={menu1 ?? ""}
                onChange={(e) => setMenu1(e.target.value)}
                className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
              >
                {list.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-900">
                Pilih Menu 2
              </p>
              <select
                value={menu2 ?? ""}
                onChange={(e) => setMenu2(e.target.value)}
                className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
              >
                {list.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end justify-start md:justify-end">
              <button
                type="button"
                onClick={() => alert("Bantuan AI akan segera tersedia")}
                className="mt-4 h-10 rounded-full bg-red-600 px-4 text-xs font-semibold uppercase tracking-wide text-white shadow-sm"
              >
                Bantuan AI ➜
              </button>
            </div>
          </div>

          {/* Cards + result */}
          <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_minmax(0,1.1fr)]">
            {/* Dua kartu menu */}
            <div className="grid gap-4 md:grid-cols-2">
              {[product1, product2].map((p, idx) => {
                const cost = p.hpp + p.overhead;
                const pct = calcProfitPercent(cost, p.hargaJual);
                return (
                  <div
                    key={p.id + idx}
                    className="rounded-3xl border border-gray-200 bg-white p-5"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {p.name}
                      </h3>
                      <span
                        className={`text-sm font-semibold ${classForPercent(
                          pct
                        )}`}
                      >
                        {formatPercent(pct)}
                      </span>
                    </div>
                    <div className="mt-4 space-y-1 text-sm">
                      <div className="flex justify-between text-gray-600">
                        <span>HPP</span>
                        <span className="font-medium text-gray-900">
                          {rupiah(p.hpp)}
                        </span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>Overhead</span>
                        <span className="font-medium text-gray-900">
                          {rupiah(p.overhead)}
                        </span>
                      </div>
                      <div className="flex justify-between text-gray-900 font-semibold">
                        <span>Harga Jual</span>
                        <span>{rupiah(p.hargaJual)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Hasil */}
            <div>
              <div className="rounded-3xl border-2 border-red-500 bg-white p-5">
                <p className="text-sm font-semibold text-gray-900">
                  {product1.name}{" "}
                  <span className="text-gray-500">+</span>{" "}
                  {product2.name}{" "}
                  <span className="text-gray-500">(Free)</span>
                </p>
                <p className="mt-2 text-2xl font-semibold text-gray-900">
                  {rupiah(paidPrice)}
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
                  Promo ini mungkin akan susah dijalankan bila margin terlalu
                  tipis. Pertimbangkan untuk membatasi periode promo atau
                  minimal order agar tetap menguntungkan.
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
