"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Search, X } from "lucide-react";
import SuccessToast from "@/components/SuccessToast";
import { useRouter } from "next/navigation";

/* ========= config ========= */

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "https://api.fortislab.id";
const OWNER_ID = process.env.NEXT_PUBLIC_OWNER_ID || "";

/* ========= types & utils ========= */

type MenuRow = {
  id: string;
  nama_menu: string;
  // dari /menu → total_hpp (HPP bahan per porsi)
  hpp?: number | null;
  // dari /menu → overhead_per_porsi
  overhead_per_porsi?: number | null;
  harga_jual?: number | null;
  profit_persen?: number | null;
  target_porsi_bulanan?: number | null;
  created_at?: string;
};

function rupiah(n: number | string | null | undefined) {
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

function persen(n: number | string | null | undefined) {
  if (n == null) return "-";
  const x = typeof n === "string" ? Number(n) : n;
  if (x == null || Number.isNaN(x)) return "-";
  return `${x.toFixed(1)}%`;
}

function cleanErrorMessage(raw: string): string {
  if (!raw) return "";
  let msg = raw;
  msg = msg.replace(/<[^>]+>/g, "");
  msg = msg.replace(/^Error\s*/i, "");
  return msg.trim();
}

async function callApi(
  path: string,
  options: RequestInit & { asJson?: boolean } = {}
): Promise<any> {
  const { asJson = true, headers, ...rest } = options;
  const url = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;

  const mergedHeaders: HeadersInit = {
    "Content-Type": "application/json",
    "x-owner-id": OWNER_ID,
    ...(headers || {}),
  };

  const res = await fetch(url, {
    ...rest,
    headers: mergedHeaders,
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }

  return asJson ? res.json() : res;
}

/* ========= Page ========= */

export default function MenuPage() {
  const router = useRouter();

  const [rows, setRows] = useState<MenuRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 2200);
    return () => clearTimeout(t);
  }, [notice]);

  const [query, setQuery] = useState("");

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteModalRow, setDeleteModalRow] = useState<MenuRow | null>(null);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editing, setEditing] = useState<MenuRow | null>(null);
  const [editHargaJual, setEditHargaJual] = useState("");
  const [editTargetPorsi, setEditTargetPorsi] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  /* ----- load data dari /menu (kontrak BE FINAL) ----- */

  async function fetchData() {
    setLoading(true);
    setErr(null);
    try {
      const res = await callApi("/menu", { method: "GET" });

      const raw = Array.isArray((res as any)?.data)
        ? (res as any).data
        : Array.isArray(res)
        ? (res as any)
        : [];

      const mapped: MenuRow[] = raw.map((x: any, idx: number) => {
        // optional: debug kalau mau cek lagi kontrak
        // console.log("[menu] raw row:", x);

        const hppValue =
          x.total_hpp != null
            ? Number(x.total_hpp)
            : x.hpp != null
            ? Number(x.hpp)
            : null;

        const overheadValue =
          x.overhead_per_porsi != null ? Number(x.overhead_per_porsi) : null;

        const hargaJualValue =
          x.harga_jual != null ? Number(x.harga_jual) : null;

        const profitPersenValue =
          x.margin_persen != null
            ? Number(x.margin_persen)
            : x.profit_persen != null
            ? Number(x.profit_persen)
            : null;

        const targetBulananValue =
          x.target_porsi_bulanan != null
            ? Number(x.target_porsi_bulanan)
            : null;

        return {
          id: String(x.id ?? x.menu_id ?? idx),
          nama_menu: x.nama_menu ?? x.nama ?? "",
          hpp: hppValue,
          overhead_per_porsi: overheadValue,
          harga_jual: hargaJualValue,
          profit_persen: profitPersenValue,
          target_porsi_bulanan: targetBulananValue,
          created_at: x.created_at,
        };
      });

      console.log("[menu] mapped from /menu:", mapped);
      setRows(mapped);
    } catch (e: any) {
      console.error("Gagal memuat data menu (/menu):", e);
      const msg = cleanErrorMessage(
        e?.message || "Gagal memuat data menu dari /menu."
      );
      setErr(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  /* ----- derived (search) ----- */

  const filtered = useMemo(() => {
    const q = (query || "").trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => (r.nama_menu || "").toLowerCase().includes(q));
  }, [rows, query]);

  /* ----- delete helpers ----- */

  function openDeleteModal(row: MenuRow) {
    setDeleteModalRow(row);
  }

  function closeDeleteModal() {
    if (deletingId) return;
    setDeleteModalRow(null);
  }

  async function handleDelete() {
    const row = deleteModalRow;
    if (!row) return;
    try {
      setDeletingId(row.id);
      setErr(null);

      await callApi(`/menu/${row.id}`, {
        method: "DELETE",
      });

      await fetchData();
      setNotice("Menu berhasil dihapus. Data HPP & komponennya ikut terhapus.");
      closeDeleteModal();
    } catch (e: any) {
      console.error("Gagal menghapus menu:", e);
      const msg = cleanErrorMessage(e?.message || "Gagal menghapus menu.");
      setErr(msg || "Gagal menghapus menu. Coba lagi nanti.");
    } finally {
      setDeletingId(null);
    }
  }

  /* ----- edit helpers ----- */

  function openEditModal(row: MenuRow) {
    setEditing(row);
    setEditHargaJual(
      row.harga_jual != null && !Number.isNaN(row.harga_jual)
        ? String(row.harga_jual)
        : ""
    );
    setEditTargetPorsi(
      row.target_porsi_bulanan != null &&
        !Number.isNaN(row.target_porsi_bulanan)
        ? String(row.target_porsi_bulanan)
        : ""
    );
    setEditModalOpen(true);
  }

  function closeEditModal() {
    if (savingEdit) return;
    setEditModalOpen(false);
    setEditing(null);
    setEditHargaJual("");
    setEditTargetPorsi("");
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;

    if (!editTargetPorsi.trim()) {
      setErr("Target penjualan / bulan wajib diisi.");
      return;
    }

    try {
      setSavingEdit(true);
      setErr(null);

      const targetNum = Number(editTargetPorsi.replace(",", "."));
      const safeTarget = Number.isNaN(targetNum) ? 0 : targetNum;

      const body: any = {
        nama_menu: editing.nama_menu,
        // kontrak final BE → pakai target_porsi_bulanan
        target_porsi_bulanan: safeTarget,
      };

      if (editHargaJual.trim()) {
        const hargaNum = Number(editHargaJual.replace(",", "."));
        const safeHarga = Number.isNaN(hargaNum) ? 0 : hargaNum;
        // kontrak final BE → pakai harga_jual
        body.harga_jual = safeHarga;
      }

      console.log("[menu] PUT body /menu/:id =", body);

      await callApi(`/menu/${editing.id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });

      await fetchData();
      setNotice("Menu berhasil diperbarui.");
      closeEditModal();
    } catch (e: any) {
      console.error("Gagal menyimpan menu:", e);
      const msg = cleanErrorMessage(
        e?.message || "Gagal menyimpan perubahan menu."
      );
      setErr(msg || "Gagal menyimpan perubahan menu. Coba lagi nanti.");
    } finally {
      setSavingEdit(false);
    }
  }

  /* ----- render ----- */

  return (
    <div className="p-6 md:p-8">
      {notice && (
        <SuccessToast message={notice} onClose={() => setNotice(null)} />
      )}

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Daftar Menu
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Pantau HPP, harga jual, dan target penjualan per menu. Data HPP
            bahan per porsi berasal dari endpoint{" "}
            <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">
              /menu
            </code>
            .
          </p>
        </div>

        <button
          onClick={() => router.push("/hpp")}
          className="hidden items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 md:inline-flex"
        >
          <span>+ Menu dari Kalkulator HPP</span>
        </button>
      </div>

      <div className="mt-2 rounded-2xl border border-gray-200 bg-white shadow-sm">
        {/* header card */}
        <div className="px-6 py-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-2">
              <button
                onClick={() => router.push("/hpp")}
                className="inline-flex items-center gap-2 self-start rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 active:scale-[0.99] md:hidden"
              >
                <span>Tambah Menu via HPP</span>
                <Plus className="h-4 w-4" />
              </button>
              <p className="text-xs text-gray-500">
                Menambah menu baru dilakukan dari halaman{" "}
                <span className="font-semibold">Kalkulator HPP</span>. Di sini
                kamu bisa mengatur harga jual dan target penjualan per bulan,
                sementara nilai HPP &amp; overhead dihitung otomatis di backend.
              </p>
            </div>

            <div className="relative w-full md:w-[320px]">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari nama menu"
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 pl-10 text-sm outline-none focus:border-gray-400"
              />
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            </div>
          </div>
        </div>

        {err && (
          <div className="mx-6 mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {err}
          </div>
        )}

        {/* tabel */}
        <div className="overflow-x-auto">
          <table className="min-w-full border-t border-gray-100">
            <thead>
              <tr className="text-left text-sm text-gray-500">
                <th className="px-6 py-3 font-semibold">Nama Menu</th>
                <th className="px-6 py-3 font-semibold">HPP / Porsi (Bahan)</th>
                <th className="px-6 py-3 font-semibold">Overhead / Porsi</th>
                <th className="px-6 py-3 font-semibold">Harga Jual</th>
                <th className="px-6 py-3 font-semibold">% Profit</th>
                <th className="px-6 py-3 font-semibold">
                  Target / Bulan (porsi)
                </th>
                <th className="px-6 py-3 text-right font-semibold">
                  Edit / Hapus
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
                    className="px-6 py-8 text-center text-sm text-gray-500"
                  >
                    Belum ada menu. Tambahkan dari Kalkulator HPP.
                  </td>
                </tr>
              )}

              {!loading &&
                filtered.map((row) => (
                  <tr
                    key={row.id}
                    className="border-t border-gray-100 hover:bg-gray-50/60"
                  >
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                      {row.nama_menu}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-800">
                      {row.hpp != null ? rupiah(row.hpp) : "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-800">
                      {row.overhead_per_porsi != null
                        ? rupiah(row.overhead_per_porsi)
                        : "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-800">
                      {row.harga_jual != null ? rupiah(row.harga_jual) : "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-800">
                      {row.profit_persen != null
                        ? persen(row.profit_persen)
                        : "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-800">
                      {row.target_porsi_bulanan != null
                        ? row.target_porsi_bulanan
                        : "-"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          className="rounded-lg border border-gray-200 p-2 hover:bg-gray-50"
                          onClick={() => openEditModal(row)}
                          aria-label="Edit"
                          title="Edit menu"
                        >
                          <Pencil className="h-4 w-4 text-gray-700" />
                        </button>
                        <button
                          className="rounded-lg border border-gray-200 p-2 hover:bg-gray-50"
                          onClick={() => openDeleteModal(row)}
                          aria-label="Hapus"
                          title="Hapus menu"
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
        </div>
      </div>

      {/* ========= MODAL DELETE ========= */}
      {deleteModalRow && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="w-[90%] max-w-md rounded-3xl bg-white px-6 py-5 text-center shadow-xl">
            <div className="mb-6 flex items-start justify-between">
              <div />
              <button
                type="button"
                onClick={closeDeleteModal}
                className="rounded-full p-1 hover:bg-gray-100"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <h2 className="mb-3 text-2xl font-extrabold text-gray-900">
              Hapus menu ini?
            </h2>
            <p className="mb-2 text-sm font-medium text-gray-800">
              {deleteModalRow?.nama_menu}
            </p>
            <p className="mb-8 text-xs text-gray-500">
              Data HPP dan seluruh komponennya juga akan ikut terhapus.
            </p>

            <div className="flex flex-col gap-3 md:flex-row">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={!!deletingId}
                className="w-full rounded-xl border border-gray-300 bg-white py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-60"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={!!deletingId}
                className="w-full rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deletingId ? "Menghapus..." : "Hapus Menu"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========= MODAL EDIT ========= */}
      {editModalOpen && editing && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="max-h-[85vh] w-[90%] max-w-lg overflow-y-auto rounded-3xl bg-white px-6 py-5 shadow-xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <h2 className="text-2xl font-extrabold text-gray-900">
                Edit Menu
              </h2>
              <button
                type="button"
                onClick={closeEditModal}
                className="rounded-full p-1 hover:bg-gray-100"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-6">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-800">
                  Nama Menu
                </label>
                <input
                  value={editing.nama_menu}
                  readOnly
                  className="w-full cursor-not-allowed rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-600"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-800">
                  Harga Jual (Rp)
                </label>
                <input
                  type="number"
                  min={0}
                  value={editHargaJual}
                  onChange={(e) => setEditHargaJual(e.target.value)}
                  placeholder="ex: 25000"
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-gray-400"
                />
                <p className="text-xs text-gray-500">
                  Kosongkan jika tidak ingin mengubah harga jual.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-800">
                  Target Penjualan / Bulan (porsi)
                </label>
                <input
                  type="number"
                  min={0}
                  value={editTargetPorsi}
                  onChange={(e) => setEditTargetPorsi(e.target.value)}
                  placeholder="contoh: 300"
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-gray-400"
                  required
                />
                <p className="text-xs text-gray-500">
                  Angka ini dipakai backend untuk membagi total overhead ke tiap
                  menu.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="w-full rounded-xl bg-red-600 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {savingEdit ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
