"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchRekapHPP, RekapRow } from "@/lib/hppRekap";
import { toRupiah } from "@/lib/rupiah";

type SortKey =
  | "nama"
  | "harga"
  | "bahan"
  | "overhead"
  | "tenaga"
  | "hpp"
  | "margin"
  | "laba";
type SortDir = "asc" | "desc";

export default function RekapHPPPage() {
  const [rows, setRows] = useState<RekapRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // UI state
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("nama");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // fetch
  useEffect(() => {
    setLoading(true);
    fetchRekapHPP()
      .then(setRows)
      .catch((e) => setErr(String(e)))
      .finally(() => setLoading(false));
  }, []);

  // computed helpers
  type RowCalc = RekapRow & {
    _harga: number;
    _hpp: number;
    _laba: number;
    _margin: number;
  };

  const filteredSorted: RowCalc[] = useMemo(() => {
    const needle = q.trim().toLowerCase();

    const mapped: RowCalc[] = rows.map((r) => {
      const harga = Number(r.harga_jual_user ?? 0) || 0;
      const hpp =
        Number(r.hpp_total_per_porsi ?? 0) ||
        Number(r.hpp_bahan_per_porsi ?? 0) +
          Number(r.overhead_per_porsi ?? 0) +
          Number(r.tenaga_kerja_per_porsi ?? 0) ||
        0;
      const laba = Math.max(0, harga - hpp);
      const margin = harga > 0 ? (laba / harga) * 100 : 0;
      return { ...r, _harga: harga, _hpp: hpp, _laba: laba, _margin: margin };
    });

    const filt = mapped.filter(
      (r) =>
        !needle ||
        (r.nama_produk || "").toLowerCase().includes(needle)
    );

    const dir = sortDir === "asc" ? 1 : -1;
    filt.sort((a, b) => {
      const cmp = (x: number | string, y: number | string) =>
        x < y ? -1 : x > y ? 1 : 0;

      switch (sortKey) {
        case "nama":
          return dir * cmp(a.nama_produk || "", b.nama_produk || "");
        case "harga":
          return dir * (a._harga - b._harga);
        case "bahan":
          return dir * ((a.hpp_bahan_per_porsi ?? 0) - (b.hpp_bahan_per_porsi ?? 0));
        case "overhead":
          return dir * ((a.overhead_per_porsi ?? 0) - (b.overhead_per_porsi ?? 0));
        case "tenaga":
          return dir * ((a.tenaga_kerja_per_porsi ?? 0) - (b.tenaga_kerja_per_porsi ?? 0));
        case "hpp":
          return dir * (a._hpp - b._hpp);
        case "margin":
          return dir * (a._margin - b._margin);
        case "laba":
          return dir * (a._laba - b._laba);
      }
    });

    return filt;
  }, [rows, q, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(filteredSorted.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const paged = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSorted.slice(start, start + pageSize);
  }, [filteredSorted, currentPage, pageSize]);

  // handlers
  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  }

  function csvExport() {
    const header = [
      "Produk",
      "Harga Jual",
      "HPP Bahan",
      "Overhead",
      "Tenaga Kerja",
      "HPP Total",
      "Margin(%)",
      "Laba/Porsi",
    ];
    const lines = [header.join(",")];

    filteredSorted.forEach((r) => {
      const row = [
        `"${(r.nama_produk || "").replace(/"/g, '""')}"`,
        r._harga,
        r.hpp_bahan_per_porsi ?? 0,
        r.overhead_per_porsi ?? 0,
        r.tenaga_kerja_per_porsi ?? 0,
        r._hpp,
        r._margin.toFixed(2),
        r._laba,
      ];
      lines.push(row.join(","));
    });

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "rekap_hpp.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Rekap HPP per Produk</h1>
        <div className="flex items-center gap-2">
          <button onClick={csvExport} className="border rounded px-3 py-2">
            Export CSV
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          className="border rounded px-3 py-2"
          placeholder="Cari produk…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
        <div className="text-sm text-gray-600">
          {filteredSorted.length} item • Halaman {currentPage}/{pageCount}
        </div>
        {loading && <span className="text-sm text-gray-500">Loading…</span>}
        {err && <span className="text-sm text-red-600">Error: {err}</span>}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm">Rows:</span>
          <select
            className="border rounded px-2 py-1"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
          >
            {[10, 20, 50, 100].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-2xl border overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-700">
            <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-left select-none">
              {[
                { label: "Produk", key: "nama" as const },
                { label: "Harga Jual", key: "harga" as const },
                { label: "HPP Bahan", key: "bahan" as const },
                { label: "Overhead", key: "overhead" as const },
                { label: "Tenaga Kerja", key: "tenaga" as const },
                { label: "HPP Total", key: "hpp" as const },
                { label: "Margin", key: "margin" as const },
                { label: "Laba/porsi", key: "laba" as const },
              ].map((col) => (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col.key)}
                  className="cursor-pointer"
                  title="Klik untuk mengurutkan"
                >
                  <div className="inline-flex items-center gap-1">
                    <span>{col.label}</span>
                    {sortKey === col.key && (
                      <span className="text-xs opacity-60">
                        {sortDir === "asc" ? "▲" : "▼"}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-gray-500">
                  Belum ada data.
                </td>
              </tr>
            ) : (
              paged.map((r) => {
                const harga = Number(r.harga_jual_user ?? 0) || 0;
                const hpp =
                  Number(r.hpp_total_per_porsi ?? 0) ||
                  Number(r.hpp_bahan_per_porsi ?? 0) +
                    Number(r.overhead_per_porsi ?? 0) +
                    Number(r.tenaga_kerja_per_porsi ?? 0) ||
                  0;
                const laba = Math.max(0, harga - hpp);
                const margin = harga > 0 ? (laba / harga) * 100 : 0;

                return (
                  <tr key={r.produk_id} className="border-t [&>td]:px-4 [&>td]:py-2">
                    <td className="font-medium">{r.nama_produk || "-"}</td>
                    <td>{harga ? toRupiah(harga) : "-"}</td>
                    <td>{toRupiah(r.hpp_bahan_per_porsi ?? 0)}</td>
                    <td>{toRupiah(r.overhead_per_porsi ?? 0)}</td>
                    <td>{toRupiah(r.tenaga_kerja_per_porsi ?? 0)}</td>
                    <td className="font-medium">{toRupiah(hpp)}</td>
                    <td>{margin.toFixed(1)}%</td>
                    <td className="font-semibold">{toRupiah(laba)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      <div className="flex items-center gap-2 justify-end">
        <button
          className="border rounded px-3 py-1 disabled:opacity-40"
          onClick={() => setPage(1)}
          disabled={currentPage <= 1}
        >
          « First
        </button>
        <button
          className="border rounded px-3 py-1 disabled:opacity-40"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={currentPage <= 1}
        >
          ‹ Prev
        </button>
        <span className="text-sm">Page {currentPage} / {pageCount}</span>
        <button
          className="border rounded px-3 py-1 disabled:opacity-40"
          onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
          disabled={currentPage >= pageCount}
        >
          Next ›
        </button>
        <button
          className="border rounded px-3 py-1 disabled:opacity-40"
          onClick={() => setPage(pageCount)}
          disabled={currentPage >= pageCount}
        >
          Last »
        </button>
      </div>

      <p className="text-sm text-gray-500">
        Data HPP dari <code>v_hpp_final</code>. Klik header untuk sort, gunakan search & pagination di atas.
      </p>
    </div>
  );
}
