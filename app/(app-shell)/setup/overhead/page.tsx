"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Search, X } from "lucide-react";
import { SetupTabs } from "../_components/SetupTabs";
import SuccessToast from "@/components/SuccessToast";

/* ========= config ========= */

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "https://api.fortislab.id";
const OWNER_ID = process.env.NEXT_PUBLIC_OWNER_ID || "";

/* ========= types & utils ========= */

type OverheadKategori = "operasional" | "maintenance";

type Overhead = {
  id: string;
  nama: string;
  biaya_bulanan?: number | null;
  created_at?: string;
  kategori?: OverheadKategori | null;
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

function cleanErrorMessage(raw: string): string {
  if (!raw) return "";
  let msg = raw;

  // buang tag HTML kalau ada
  msg = msg.replace(/<[^>]+>/g, "");

  // mapping khusus duplicate unique_overhead_owner
  if (msg.includes("unique_overhead_owner")) {
    return "Nama overhead ini sudah digunakan. Gunakan nama lain.";
  }

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

export default function SetupOverheadPage() {
  const [rows, setRows] = useState<Overhead[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 2200);
    return () => clearTimeout(t);
  }, [notice]);

  const [query, setQuery] = useState("");

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editing, setEditing] = useState<Overhead | null>(null);

  const [namaOverhead, setNamaOverhead] = useState("");
  const [biayaBulanan, setBiayaBulanan] = useState("");
  const [kategori, setKategori] = useState<OverheadKategori | "">("");

  const [deleteModalRow, setDeleteModalRow] = useState<Overhead | null>(null);

  /* ----- load data ----- */

  async function fetchData() {
    setLoading(true);
    setErr(null);
    try {
      const res = await callApi("/setup/overhead", { method: "GET" });

      const raw = Array.isArray((res as any)?.data)
        ? (res as any).data
        : Array.isArray(res)
        ? (res as any)
        : [];

      const mapped: Overhead[] = raw.map((x: any, idx: number) => ({
        id: String(x.id ?? x.overhead_id ?? idx),
        nama: x.nama_overhead ?? x.nama ?? "",
        biaya_bulanan:
          typeof x.biaya_bulanan === "number"
            ? x.biaya_bulanan
            : typeof x.biaya === "number"
            ? x.biaya
            : x.biaya_bulanan != null
            ? Number(x.biaya_bulanan)
            : x.biaya != null
            ? Number(x.biaya)
            : null,
        created_at: x.created_at,
        // field kategori dari BE
        kategori:
          (x.kategori as OverheadKategori | null | undefined) ??
          (x.kategori_overhead as OverheadKategori | null | undefined) ??
          null,
      }));

      setRows(mapped);
    } catch (e: any) {
      console.error("Gagal memuat data overhead:", e);
      const msg = cleanErrorMessage(
        e?.message || "Gagal memuat data overhead."
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
    return rows.filter((r) => (r.nama || "").toLowerCase().includes(q));
  }, [rows, query]);

  /* ----- form helpers ----- */

  function resetForm() {
    setNamaOverhead("");
    setBiayaBulanan("");
    setKategori("");
    setEditing(null);
  }

  function openAddModal() {
    resetForm();
    setFormModalOpen(true);
  }

  function openEditModal(row: Overhead) {
    setEditing(row);
    setNamaOverhead(row.nama || "");
    setBiayaBulanan(
      row.biaya_bulanan != null && !Number.isNaN(row.biaya_bulanan)
        ? String(row.biaya_bulanan)
        : ""
    );
    setKategori(row.kategori || "");
    setFormModalOpen(true);
  }

  function closeFormModal() {
    if (saving) return;
    setFormModalOpen(false);
    resetForm();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!namaOverhead.trim() || !biayaBulanan.trim()) {
      setErr("Nama overhead dan biaya per bulan wajib diisi.");
      return;
    }

    if (!kategori) {
      setErr("Kategori overhead wajib diisi (operasional / maintenance).");
      return;
    }

    try {
      setSaving(true);
      setErr(null);

      const biayaNum = Number(biayaBulanan.replace(",", "."));
      const safeBiaya = Number.isNaN(biayaNum) ? 0 : biayaNum;
      const namaTrim = namaOverhead.trim();

      // kontrak BE: { nama, biaya, kategori }
      const payload = {
        nama: namaTrim,
        biaya: safeBiaya,
        kategori: kategori as OverheadKategori,
      };

      if (editing) {
        await callApi(`/setup/overhead/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await callApi("/setup/overhead", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      await fetchData();
      setNotice(
        editing
          ? "Berhasil menyimpan perubahan overhead."
          : "Berhasil menambahkan overhead."
      );
      closeFormModal();
    } catch (e: any) {
      console.error("Gagal menyimpan overhead:", e);
      const msg = cleanErrorMessage(
        e?.message || "Gagal menyimpan data overhead."
      );
      setErr(msg || "Gagal menyimpan data overhead. Coba lagi nanti.");
    } finally {
      setSaving(false);
    }
  }

  /* ----- delete helpers ----- */

  function openDeleteModal(row: Overhead) {
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

      await callApi(`/setup/overhead/${row.id}`, {
        method: "DELETE",
      });

      await fetchData();
      setNotice("Overhead berhasil dihapus.");
      closeDeleteModal();
    } catch (e: any) {
      console.error("Gagal menghapus overhead:", e);
      const msg = cleanErrorMessage(
        e?.message || "Gagal menghapus overhead."
      );
      setErr(msg || "Gagal menghapus overhead. Coba lagi nanti.");
    } finally {
      setDeletingId(null);
    }
  }

  /* ----- render ----- */

  return (
    <div className="p-6 md:p-8">
      {notice && (
        <SuccessToast message={notice} onClose={() => setNotice(null)} />
      )}

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-extrabold tracking-tight">Setup</h1>
      </div>

      <SetupTabs active="overhead" />

      <div className="mt-4 rounded-2xl border border-gray-200 bg-white shadow-sm">
        {/* header card */}
        <div className="px-6 py-5">
          <div className="flex flex-col gap-3">
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-2 self-start rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 active:scale-[0.99]"
            >
              <span>Tambah Overhead</span>
              <Plus className="h-4 w-4" />
            </button>

            <p className="text-sm text-gray-500">
              Biaya overhead selalu dihitung per{" "}
              <span className="font-semibold">bulan</span>.
            </p>

            <div className="relative w-full md:w-[420px]">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ex : Listrik, Sewa, Internet"
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
                <th className="px-6 py-3 font-semibold">Nama Overhead</th>
                <th className="px-6 py-3 font-semibold">Kategori</th>
                <th className="px-6 py-3 font-semibold">Biaya / Bulan</th>
                <th className="px-6 py-3 text-right font-semibold">
                  Edit / Hapus
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
                    className="px-6 py-8 text-center text-sm text-gray-500"
                  >
                    Belum ada data overhead.
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
                      {row.nama}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-800">
                      {row.kategori ? (
                        <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold capitalize text-gray-800">
                          {row.kategori}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">
                          Belum di-set
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-800">
                      {rupiah(row.biaya_bulanan)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          className="rounded-lg border border-gray-200 p-2 hover:bg-gray-50"
                          onClick={() => openEditModal(row)}
                          aria-label="Edit"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4 text-gray-700" />
                        </button>
                        <button
                          className="rounded-lg border border-gray-200 p-2 hover:bg-gray-50"
                          onClick={() => openDeleteModal(row)}
                          aria-label="Hapus"
                          title="Hapus"
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

      {/* ========= MODAL FORM ========= */}
      {formModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="max-h-[85vh] w-[90%] max-w-lg overflow-y-auto rounded-3xl bg-white px-6 py-5 shadow-xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <h2 className="text-2xl font-extrabold text-gray-900">
                {editing ? "Edit Overhead" : "Tambah Overhead"}
              </h2>
              <button
                type="button"
                onClick={closeFormModal}
                className="rounded-full p-1 hover:bg-gray-100"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-800">
                  Nama Overhead
                </label>
                <input
                  value={namaOverhead}
                  onChange={(e) => setNamaOverhead(e.target.value)}
                  placeholder="ex: Listrik, Air, Internet"
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-gray-400"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-800">
                  Kategori
                </label>
                <select
                  value={kategori}
                  onChange={(e) =>
                    setKategori(e.target.value as OverheadKategori | "")
                  }
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-gray-400"
                  required
                >
                  <option value="">Pilih kategori</option>
                  <option value="operasional">Operasional</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-800">
                  Biaya / Bulan (Rp)
                </label>
                <input
                  type="number"
                  min={0}
                  value={biayaBulanan}
                  onChange={(e) => setBiayaBulanan(e.target.value)}
                  placeholder="ex: 500000"
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-gray-400"
                  required
                />
                <p className="text-xs text-gray-500">
                  Biaya ini selalu dianggap per{" "}
                  <span className="font-semibold">bulan</span>.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full rounded-xl bg-red-600 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {saving
                    ? "Menyimpan..."
                    : editing
                    ? "Simpan Perubahan"
                    : "Simpan Overhead"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
              Yakin Ingin Menghapus
              <br />
              Overhead ini?
            </h2>
            <p className="mb-8 text-sm font-medium text-gray-800">
              {deleteModalRow?.nama}
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
                {deletingId ? "Menghapus..." : "Hapus!"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
