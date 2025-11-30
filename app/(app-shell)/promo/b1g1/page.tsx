"use client";

import React, { useEffect, useMemo, useState } from "react";
import { rupiah } from "@/lib/format";
import {
  useProdukList,
  fallbackProducts,
  type Product,
} from "../_hooks/useProdukList";

/* ========= helpers ========= */

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
  const clamped = Math.max(-100, Math.min(300, pct));
  return `${Math.round(clamped)}%`;
}

/* ========= AI copy untuk B1G1 ========= */

function getB1G1Insight(profitPct: number): string {
  if (!Number.isFinite(profitPct)) profitPct = 0;

  if (profitPct < 5) {
    return (
      "Promo Beli 1 Gratis 1 ini terlalu agresif. Margin hampir habis, sebaiknya hanya dipakai " +
      "untuk momen tertentu (launching / cuci gudang) dan dibatasi kuotanya."
    );
  }

  if (profitPct < 15) {
    return (
      "Profit per transaksi sangat tipis. Batasi periode promo atau buat minimal order, " +
      "dan pastikan ada menu lain yang marginnya lebih tinggi untuk di-upsell."
    );
  }

  if (profitPct < 30) {
    return (
      "Promo masih aman tapi margin mulai menipis. Cocok untuk narik traffic di jam sepi " +
      "atau hari tertentu saja, bukan dipakai sepanjang waktu."
    );
  }

  if (profitPct < 50) {
    return (
      "Promo Beli 1 Gratis 1 ini masih cukup sehat. Kamu tetap memberi nilai besar ke pelanggan " +
      "sambil menjaga margin yang nyaman. Bisa dipakai sebagai campaign berkala."
    );
  }

  return (
    "Promo ini sangat sehat. Margin masih tebal walaupun sudah Beli 1 Gratis 1, " +
    "kamu bisa lebih agresif di marketing (iklan, voucher, affiliate) tanpa takut rugi."
  );
}

/* ========= page ========= */

export default function PromoB1G1Page() {
  const { products, loading } = useProdukList();
  const list: Product[] =
    products && products.length > 0 ? products : fallbackProducts;

  const [menu1, setMenu1] = useState<string | null>(null);
  const [menu2, setMenu2] = useState<string | null>(null);
  const [aiNote, setAiNote] = useState<string | null>(null);

  useEffect(() => {
    if (!list.length) return;
    if (!menu1) setMenu1(list[0].id);
    if (!menu2) {
      const second = list.find((p) => p.id !== list[0].id);
      setMenu2((second ?? list[0]).id);
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
      list.find((p) => p.id !== menu1) ??
      (list[1] as Product | undefined) ??
      product1,
    [list, menu2, menu1, product1]
  );

  if (!product1 || !product2) {
    return (
      <div className="p-6 md:p-8">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
            Kalkulator Promo - Buy 1 Get 1
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

  const cost1 = (product1.hpp ?? 0) + (product1.overhead ?? 0);
  const cost2 = (product2.hpp ?? 0) + (product2.overhead ?? 0);

  const paidPrice = product1.hargaJual;
  const totalCost = cost1 + cost2;
  const profitPct = calcProfitPercent(totalCost, paidPrice);

  const afterTax = Math.round(paidPrice * 1.1);
  const onlineFood = Math.round(paidPrice * 1.15);

  const profitMenu1 = calcProfitPercent(cost1, product1.hargaJual);
  const profitMenu2 = calcProfitPercent(cost2, product2.hargaJual);

  const optionsMenu2 = list.filter((p) => p.id !== (menu1 ?? ""));

  /* ====== Bantuan AI B1G1 ====== */
  const handleAiClick = () => {
    if (!product1 || !product2) return;

    let paid = product1;
    let free = product2;

    if ((product2.hargaJual ?? 0) > (product1.hargaJual ?? 0)) {
      paid = product2;
      free = product1;
      setMenu1(product2.id);
      setMenu2(product1.id);
    } else {
      setMenu1(product1.id);
      setMenu2(product2.id);
    }

    const paidCost =
      (paid.hpp ?? 0) + (paid.overhead ?? 0) + (free.hpp ?? 0) + (free.overhead ?? 0);
    const paidProfitPct = calcProfitPercent(paidCost, paid.hargaJual ?? 0);

    setAiNote(
      `AI menyarankan menjadikan ${paid.name} sebagai menu bayar dan ${free.name} sebagai menu gratis. ` +
        `Perkiraan profit promo sekitar ${formatPercent(
          paidProfitPct
        )} per transaksi (sebelum pajak & biaya platform).`
    );
  };

  return (
    <div className="p-6 md:p-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
          Kalkulator Promo - Buy 1 Get 1
        </h1>

        <section className="mt-2 rounded-2xl border border-gray-200 bg-white px-6 py-5 shadow-sm">
          {/* PILIH MENU + AI */}
          <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Pilih Menu 1 (yang Dibayar)
              </p>
              <select
                value={menu1 ?? ""}
                onChange={(e) => {
                  setMenu1(e.target.value);
                  setAiNote(null);
                }}
                className="mt-2 h-11 w-full rounded-full border border-gray-300 bg-white px-4 text-sm text-gray-900 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
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
                Pilih Menu 2 (Gratis)
              </p>
              <select
                value={menu2 ?? ""}
                onChange={(e) => {
                  setMenu2(e.target.value);
                  setAiNote(null);
                }}
                className="mt-2 h-11 w-full rounded-full border border-gray-300 bg-white px-4 text-sm text-gray-900 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
              >
                {optionsMenu2.length > 0
                  ? optionsMenu2.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))
                  : list.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
              </select>
            </div>

            <div className="flex flex-col items-start justify-end md:items-end">
              <button
                type="button"
                onClick={handleAiClick}
                className="mt-4 h-11 rounded-full bg-red-600 px-5 text-[11px] font-semibold uppercase tracking-[0.08em] text-white shadow-sm"
              >
                BANTUAN AI ➜
              </button>
              {aiNote && (
                <p className="mt-2 max-w-xs text-[11px] text-gray-500 md:text-right">
                  {aiNote}
                </p>
              )}
            </div>
          </div>

          {/* DUA KARTU MENU */}
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-white px-6 py-5">
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

            <div className="rounded-2xl border border-gray-200 bg-white px-6 py-5">
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

          {/* HASIL B1G1 */}
          <div className="mt-6 rounded-2xl border-2 border-red-500 bg-white px-6 py-5">
            <p className="text-sm font-semibold text-gray-900">
              {product1.name} <span className="text-gray-500">+</span>{" "}
              {product2.name}{" "}
              <span className="text-gray-500">(Gratis)</span>
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
              {getB1G1Insight(profitPct)}
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
        </section>
      </div>
    </div>
  );
}
