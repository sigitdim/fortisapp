"use client";

import React, { useEffect, useMemo, useState } from "react";
import { rupiah } from "@/lib/format";
import {
  useProdukList,
  fallbackProducts,
  type Product,
} from "../_hooks/useProdukList";

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

function formatPercent(pct: number) {
  return `${Math.round(pct)}%`;
}

export default function PromoDiskonPage() {
  const { products, loading } = useProdukList();

  const list: Product[] =
    products && products.length > 0 ? products : fallbackProducts;

  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [targetInput, setTargetInput] = useState<string>("20000");

  // Set default selected ke produk pertama begitu data masuk
  useEffect(() => {
    if (!selectedId && list.length > 0) {
      setSelectedId(list[0].id);
    }
  }, [list, selectedId]);

  const filteredProducts = useMemo(() => {
    const term = search.toLowerCase();
    return list.filter((p) =>
      p.name.toLowerCase().includes(term)
    );
  }, [list, search]);

  const selected: Product | null =
    filteredProducts.find((p) => p.id === selectedId) ??
    list.find((p) => p.id === selectedId) ??
    (list[0] ?? null);

  const targetPrice = useMemo(
    () => parseNumberFromCurrency(targetInput),
    [targetInput]
  );

  if (!selected) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] px-6 pb-10 pt-6">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-2xl font-semibold text-gray-900">
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

  const baseProfitPct = calcProfitPercent(
    selected.hpp,
    selected.overhead,
    selected.hargaJual
  );
  const newProfitPct = calcProfitPercent(
    selected.hpp,
    selected.overhead,
    targetPrice || selected.hargaJual
  );

  const afterTax = Math.round((targetPrice || 0) * 1.1);
  const onlineFood = Math.round((targetPrice || 0) * 1.15);

  return (
    <div className="min-h-screen bg-[#F5F5F5] px-6 pb-10 pt-6">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-2xl font-semibold text-gray-900">
          Kalkulator Promo - Diskon
        </h1>

        {/* Kartu besar */}
        <div className="mt-6 rounded-3xl bg-white p-6 shadow-sm">
          {/* Pilih Menu */}
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">
              Pilih Menu
            </h2>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari menu..."
                className="h-10 rounded-full border border-gray-300 px-4 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
              />
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-red-600 text-white shadow-sm"
              >
                <span className="text-lg leading-none">🔍</span>
              </button>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.2fr_minmax(0,1.1fr)]">
            {/* List menu */}
            <div className="space-y-1 rounded-3xl border border-gray-200 bg-white p-4">
              {filteredProducts.map((p) => {
                const pct = calcProfitPercent(
                  p.hpp,
                  p.overhead,
                  p.hargaJual
                );
                const isActive = p.id === selected.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedId(p.id)}
                    className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm transition ${
                      isActive
                        ? "bg-red-50"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-gray-900">
                        {p.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-6">
                      <span className="text-sm font-medium text-gray-900">
                        {rupiah(p.hargaJual)}
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

            {/* Detail + Target Diskon */}
            <div className="grid gap-4 lg:grid-rows-[auto_auto]">
              {/* Kartu info menu */}
              <div className="rounded-3xl border border-gray-200 bg-white p-5">
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
                      {rupiah(selected.hpp)}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Overhead</span>
                    <span className="font-medium text-gray-900">
                      {rupiah(selected.overhead)}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-900 font-semibold">
                    <span>Harga Jual</span>
                    <span>{rupiah(selected.hargaJual)}</span>
                  </div>
                </div>
              </div>

              {/* Target harga diskon + hasil */}
              <div className="rounded-3xl border border-gray-200 bg-white p-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">
                      Target Harga Diskon
                    </p>
                    <input
                      type="text"
                      value={targetInput}
                      onChange={(e) => setTargetInput(e.target.value)}
                      placeholder="Rp 20.000"
                      className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm font-medium text-gray-900 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      alert("Bantuan AI akan segera tersedia")
                    }
                    className="mt-6 h-10 rounded-full bg-red-600 px-4 text-xs font-semibold uppercase tracking-wide text-white shadow-sm"
                  >
                    Bantuan AI ➜
                  </button>
                </div>

                {/* Hasil kalkulasi */}
                <div className="mt-4 rounded-3xl border-2 border-red-500 bg-white p-5">
                  <div className="flex flex-wrap items-baseline gap-2 text-lg font-semibold text-gray-900 md:text-xl">
                    <span>{rupiah(selected.hargaJual)}</span>
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
                    Promo ini masih bisa digunakan, namun kamu perlu
                    memperhatikan kapasitas produksi, target penjualan, dan
                    strategi marketing agar margin tetap sehat.
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
    </div>
  );
}
