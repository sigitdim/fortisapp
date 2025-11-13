"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { SetupTabs } from "@/components/setup/SetupTabs";
import { rupiah } from "@/lib/rupiah"; // kalau ga punya, copy helper rupiah dari atas

// Kalau belum punya helper rupiah terpisah, hapus import di atas
// dan copy ulang fungsi rupiah dari halaman Bahan.

type Overhead = {
  id: string;
  nama_overhead: string;
  biaya?: number | null;
  durasi?: string | null; // "Bulan", dsb
};

function rupiahLocal(n: number | string | null | undefined) {
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

export default function SetupOverheadPage() {
  const [list, setList] = useState<Overhead[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const ownerId =
          typeof window !== "undefined"
            ? localStorage.getItem("owner_id") || ""
            : "";

        const res = await fetch("/api/setup/overhead", {
          cache: "no-store",
          headers: ownerId ? { "x-owner-id": ownerId } : undefined,
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text?.slice(0, 200) || `HTTP ${res.status}`);
        }

        const json = await res.json();
        const rows: Overhead[] = (json?.data ?? json ?? []).map((x: any) => ({
          id: x.id ?? crypto.randomUUID(),
          nama_overhead: x.nama_overhead ?? x.nama ?? "",
          biaya: x.biaya ?? x.cost ?? null,
          durasi: x.durasi ?? x.periode ?? "Bulan",
        }));
        if (alive) setList(rows);
      } catch (e: any) {
        if (alive) setErr(e?.message || "Gagal memuat data.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((r) =>
      r.nama_overhead?.toLowerCase().includes(q)
    );
  }, [list, query]);

  return (
    <div className="p-6 md:p-8">
      <h1 className="mb-6 text-3xl font-extrabold tracking-tight">Setup</h1>

      <div className="mb-6">
        <SetupTabs />
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
          <button
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 active:scale-[0.99]"
            onClick={() => alert("TODO: modal Tambah Overhead")}
          >
            <span>Tambah Overhead</span>
            <Plus className="h-4 w-4" />
          </button>

          <div className="relative w-full md:w-[520px]">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari Overhead (ex: Listrik)"
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 pl-10 text-sm outline-none focus:border-gray-400"
            />
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>
        </div>

        {err && (
          <div className="mx-5 mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {err}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full border-t border-gray-100">
            <thead>
              <tr className="text-left text-sm text-gray-500">
                <th className="px-6 py-3 font-semibold">Nama Overhead</th>
                <th className="px-6 py-3 font-semibold">Biaya</th>
                <th className="px-6 py-3 font-semibold">Durasi</th>
                <th className="px-6 py-3 text-right font-semibold">
                  Edit/Hapus
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-6 text-center text-sm text-gray-500"
                  >
                    Memuat data…
                  </td>
                </tr>
              )}

              {!loading && filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-10 text-center text-sm text-gray-500"
                  >
                    Belum ada data
                  </td>
                </tr>
              )}

              {!loading &&
                filtered.map((row) => (
                  <tr
                    key={row.id}
                    className="border-t border-gray-100 hover:bg-gray-50/60"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {row.nama_overhead}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-800">
                      {row.biaya != null ? rupiahLocal(row.biaya) : "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-800">
                      {row.durasi || "—"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          className="rounded-lg border border-gray-200 p-2 hover:bg-white"
                          onClick={() =>
                            alert(`TODO: Edit ${row.nama_overhead}`)
                          }
                        >
                          <Pencil className="h-4 w-4 text-gray-700" />
                        </button>
                        <button
                          className="rounded-lg border border-gray-200 p-2 hover:bg-white"
                          onClick={() =>
                            confirm(`Hapus ${row.nama_overhead}?`) &&
                            alert("TODO: Delete")
                          }
                        >
                          <Trash2 className="h-4 w-4 text-gray-700" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-6 py-4 text-xs text-gray-500">
          <span>Total: {filtered.length}</span>
          <span>
            Perubahan overhead akan mempengaruhi perhitungan HPP semua produk.
          </span>
        </div>
      </div>
    </div>
  );
}
