"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { SetupTabs } from "@/components/setup/SetupTabs";

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

type Aset = {
  id: string;
  nama_aset: string;
  kategori?: string | null;
  harga_beli?: number | null;
  waktu_beli?: string | null; // "06/23"
  nilai_ekonomis?: string | null; // "24 Bulan"
  status?: string | null; // "Aktif", "Non-Aktif"
};

export default function SetupAsetPage() {
  const [list, setList] = useState<Aset[]>([]);
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

        const res = await fetch("/api/setup/aset", {
          cache: "no-store",
          headers: ownerId ? { "x-owner-id": ownerId } : undefined,
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text?.slice(0, 200) || `HTTP ${res.status}`);
        }

        const json = await res.json();
        const rows: Aset[] = (json?.data ?? json ?? []).map((x: any) => ({
          id: x.id ?? crypto.randomUUID(),
          nama_aset: x.nama_aset ?? x.nama ?? "",
          kategori: x.kategori ?? x.category ?? "",
          harga_beli: x.harga_beli ?? x.harga ?? x.price ?? null,
          waktu_beli: x.waktu_beli ?? x.tanggal_beli ?? "",
          nilai_ekonomis: x.nilai_ekonomis ?? x.masa_manfaat ?? "",
          status: x.status ?? "",
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
    return list.filter((r) => r.nama_aset?.toLowerCase().includes(q));
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
            onClick={() => alert("TODO: modal Tambah Aset")}
          >
            <span>Tambah Aset</span>
            <Plus className="h-4 w-4" />
          </button>

          <div className="relative w-full md:w-[520px]">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari Aset (ex: Monang)"
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
                <th className="px-6 py-3 font-semibold">Nama Aset</th>
                <th className="px-6 py-3 font-semibold">Kategori</th>
                <th className="px-6 py-3 font-semibold">Harga Beli</th>
                <th className="px-6 py-3 font-semibold">Waktu Beli</th>
                <th className="px-6 py-3 font-semibold">Nilai Ekonomis</th>
                <th className="px-6 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 text-right font-semibold">
                  Edit/Hapus
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-6 text-center text-sm text-gray-500"
                  >
                    Memuat data…
                  </td>
                </tr>
              )}

              {!loading && filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
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
                      {row.nama_aset}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-800">
                      {row.kategori || "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-800">
                      {row.harga_beli != null
                        ? rupiahLocal(row.harga_beli)
                        : "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-800">
                      {row.waktu_beli || "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-800">
                      {row.nilai_ekonomis || "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-800">
                      {row.status || "—"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          className="rounded-lg border border-gray-200 p-2 hover:bg-white"
                          onClick={() =>
                            alert(`TODO: Edit ${row.nama_aset}`)
                          }
                        >
                          <Pencil className="h-4 w-4 text-gray-700" />
                        </button>
                        <button
                          className="rounded-lg border border-gray-200 p-2 hover:bg-white"
                          onClick={() =>
                            confirm(`Hapus ${row.nama_aset}?`) &&
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
            Aset dipakai untuk alokasi penyusutan di kalkulator HPP.
          </span>
        </div>
      </div>
    </div>
  );
}
