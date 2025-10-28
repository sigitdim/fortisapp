"use client";

import { useEffect, useState } from "react";
import { exportToCsv } from "@/lib/csv";

type Row = {
  nama_produk: string;
  hpp_total_per_porsi: number;
  harga_jual_user: number;
  profit_user_per_porsi: number;
  margin_user_persen: number;
};

export default function PricingPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    // Dummy contoh; nanti diganti fetch Supabase/view
    setRows([
      { nama_produk: "Churros", hpp_total_per_porsi: 0, harga_jual_user: 10000, profit_user_per_porsi: 10000, margin_user_persen: 100 },
      { nama_produk: "Es Kopi Susu", hpp_total_per_porsi: 0, harga_jual_user: 20000, profit_user_per_porsi: 20000, margin_user_persen: 100 },
      { nama_produk: "Kopi Kaleng", hpp_total_per_porsi: 0, harga_jual_user: 50000, profit_user_per_porsi: 50000, margin_user_persen: 100 },
    ]);
  }, []);

  const filtered = rows.filter(r => r.nama_produk.toLowerCase().includes(search.toLowerCase()));

  function handleExport() {
    exportToCsv(filtered, "pricing.csv");
  }

  return (
    <div className="p-6 space-y-4">
      {/* Header Toolbar */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Pricing</h1>
        <button
          onClick={handleExport}
          className="border rounded-xl px-3 py-2 hover:bg-gray-100"
        >
          Export CSV
        </button>
      </div>

      {/* KPI Cards */}
      <div className="flex gap-4">
        <div className="border p-4 rounded-xl flex-1 text-center">
          <p className="text-gray-500">Total Produk</p>
          <p className="text-xl font-bold">{filtered.length}</p>
        </div>
        <div className="border p-4 rounded-xl flex-1 text-center">
          <p className="text-gray-500">Rata-rata Margin</p>
          <p className="text-xl font-bold">
            {filtered.length
              ? `${Math.round(filtered.reduce((s, r) => s + r.margin_user_persen, 0) / filtered.length)}%`
              : "0%"}
          </p>
        </div>
        <div className="border p-4 rounded-xl flex-1 text-center">
          <p className="text-gray-500">Margin &lt; 20%</p>
          <p className="text-xl font-bold">
            {filtered.filter(r => r.margin_user_persen < 20).length}
          </p>
        </div>
      </div>

      {/* Search + Reload */}
      <div className="flex gap-2 items-center">
        <input
          placeholder="Cari nama produk..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded-xl px-3 py-2 flex-1"
        />
        <button
          onClick={() => setSearch("")}
          className="border rounded-xl px-3 py-2 hover:bg-gray-100"
        >
          Reload
        </button>
      </div>

      {/* Table */}
      <table className="min-w-full border rounded-xl">
        <thead className="bg-gray-100">
          <tr>
            <th className="border px-3 py-2 text-left">Produk</th>
            <th className="border px-3 py-2 text-right">HPP</th>
            <th className="border px-3 py-2 text-right">Harga Jual</th>
            <th className="border px-3 py-2 text-right">Profit</th>
            <th className="border px-3 py-2 text-right">Margin</th>
            <th className="border px-3 py-2 text-center">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((r, i) => (
            <tr key={i}>
              <td className="border px-3 py-2">{r.nama_produk}</td>
              <td className="border px-3 py-2 text-right">Rp {r.hpp_total_per_porsi}</td>
              <td className="border px-3 py-2 text-right">
                <input
                  defaultValue={r.harga_jual_user}
                  className="border rounded px-2 py-1 w-24 text-right"
                />
              </td>
              <td className="border px-3 py-2 text-right">Rp {r.profit_user_per_porsi.toLocaleString()}</td>
              <td className="border px-3 py-2 text-right">{r.margin_user_persen}%</td>
              <td className="border px-3 py-2 text-center">
                <button className="border rounded px-3 py-1 hover:bg-gray-100">Simpan</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
