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

type TenagaKerja = {
  id: string;
  nama: string;
  posisi?: string | null;
  gaji_bulanan?: number | null;
  hari_kerja?: number | null;
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
  let msg = raw || "";
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

export default function SetupTenagaKerjaPage() {
  const [rows, setRows] = useState<TenagaKerja[]>([]);
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
  const [editing, setEditing] = useState<TenagaKerja | null>(null);

  const [nama, setNama] = useState("");
  const [posisi, setPosisi] = useState("");
  const [gajiBulanan, setGajiBulanan] = useState("");
  const [hariKerja, setHariKerja] = useState("26"); // default 26 hari

  const [deleteModalRow, setDeleteModalRow] = useState<TenagaKerja | null>(
    null
  );

  /* ----- load data ----- */

  async function fetchData() {
    setLoading(true);
    setErr(null);
    try {
      const res = await callApi("/setup/tenaga_kerja", { method: "GET" });

      const raw = Array.isArray((res as any)?.data)
        ? (res as any).data
        : Array.isArray(res)
        ? (res as any)
        : [];

      const mapped: TenagaKerja[] = raw.map((x: any, idx: number) => ({
        id: String(x.id ?? x.tenaga_kerja_id ?? idx),
        nama: x.nama ?? x.nama_tenaga ?? "",
        posisi: x.posisi ?? x.jabatan ?? "",
        gaji_bulanan:
          typeof x.gaji_bulanan === "number"
            ? x.gaji_bulanan
            : typeof x.gaji === "number"
            ? x.gaji
            : x.gaji_bulanan != null
            ? Number(x.gaji_bulanan)
            : x.gaji != null
            ? Number(x.gaji)
            : null,
        // 🔥 penting: baca hari_kerja_per_bulan dari BE
        hari_kerja:
          typeof x.hari_kerja_per_bulan === "number"
            ? x.hari_kerja_per_bulan
            : x.hari_kerja_per_bulan != null
            ? Number(x.hari_kerja_per_bulan)
            : typeof x.hari_kerja === "number"
            ? x.hari_kerja
            : x.hari_kerja != null
            ? Number(x.hari_kerja)
            : 26,
      }));

      setRows(mapped);
    } catch (e: any) {
      console.error("Gagal memuat data tenaga kerja:", e);
      const msg = cleanErrorMessage(
        e?.message || "Gagal memuat data tenaga kerja."
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
    return rows.filter((r) =>
      (r.nama || "").toLowerCase().includes(q)
    );
  }, [rows, query]);

  /* ----- form helpers ----- */

  function resetForm() {
    setNama("");
    setPosisi("");
    setGajiBulanan("");
    setHariKerja("26");
    setEditing(null);
  }

  function openAddModal() {
    resetForm();
    setFormModalOpen(true);
  }

  function openEditModal(row: TenagaKerja) {
    setEditing(row);
    setNama(row.nama || "");
    setPosisi(row.posisi || "");
    setGajiBulanan(
      row.gaji_bulanan != null && !Number.isNaN(row.gaji_bulanan)
        ? String(row.gaji_bulanan)
        : ""
    );
    setHariKerja(
      row.hari_kerja != null && !Number.isNaN(row.hari_kerja)
        ? String(row.hari_kerja)
        : "26"
    );
    setFormModalOpen(true);
  }

  function closeFormModal() {
    if (saving) return;
    setFormModalOpen(false);
    resetForm();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!nama.trim() || !gajiBulanan.trim()) {
      setErr("Nama tenaga kerja dan gaji bulanan wajib diisi.");
      return;
    }

    try {
      setSaving(true);
      setErr(null);

      const gajiNum = Number(gajiBulanan.replace(",", "."));
      const hariNum = Number(hariKerja || "0");

      const safeGaji = Number.isNaN(gajiNum) ? 0 : gajiNum;
      const safeHari =
        Number.isNaN(hariNum) || hariNum <= 0 ? 26 : hariNum;

      const namaTrim = nama.trim();
      const posisiTrim = posisi.trim() || "Operasional";

      // Kontrak BE (FINAL):
      // POST:
      // { nama, jabatan, gaji_bulanan, hari_kerja }
      // PUT:
      // { nama, jabatan/posisi, gaji_bulanan, hari_kerja }
      const payload: any = {
        nama: namaTrim,
        jabatan: posisiTrim,
        posisi: posisiTrim, // alias, aman menurut kontrak BE
        gaji_bulanan: safeGaji,
        hari_kerja: safeHari,
      };

      if (editing) {
        await callApi(`/setup/tenaga_kerja/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await callApi("/setup/tenaga_kerja", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      await fetchData();
      setNotice(
        editing
          ? "Berhasil menyimpan perubahan tenaga kerja."
          : "Berhasil menambahkan tenaga kerja."
      );
      closeFormModal();
    } catch (e: any) {
      console.error("Gagal menyimpan tenaga kerja:", e);
      const msg = cleanErrorMessage(
        e?.message || "Gagal menyimpan data tenaga kerja."
      );
      setErr(msg || "Gagal menyimpan data tenaga kerja. Coba lagi nanti.");
    } finally {
      setSaving(false);
    }
  }

  /* ----- delete helpers ----- */

  function openDeleteModal(row: TenagaKerja) {
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

      await callApi(`/setup/tenaga_kerja/${row.id}`, {
        method: "DELETE",
      });

      await fetchData();
      setNotice("Tenaga kerja berhasil dihapus.");
      closeDeleteModal();
    } catch (e: any) {
      console.error("Gagal menghapus tenaga kerja:", e);
      const msg = cleanErrorMessage(
        e?.message || "Gagal menghapus tenaga kerja."
      );
      setErr(msg || "Gagal menghapus tenaga kerja. Coba lagi nanti.");
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

      {/* aktifkan tab tenaga-kerja */}
      <SetupTabs active="tenaga-kerja" />

      <div className="mt-4 rounded-2xl border border-gray-200 bg-white shadow-sm">
        {/* header card */}
        <div className="flex flex-col gap-3 px-6 py-5 md:flex-row md:items-center md:justify-between">
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 active:scale-[0.99] md:text-sm"
          >
            <span>Tambah Tenaga Kerja</span>
            <Plus className="h-4 w-4" />
          </button>

          <div className="relative w-full md:w-[420px]">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ex : Monang"
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 pl-10 text-sm outline-none focus:border-gray-400"
            />
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
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
                <th className="px-6 py-3 font-semibold">
                  Nama Tenaga Kerja
                </th>
                <th className="px-6 py-3 font-semibold">Posisi</th>
                <th className="px-6 py-3 font-semibold">Gaji</th>
                <th className="px-6 py-3 font-semibold">Hari Kerja</th>
                <th className="px-6 py-3 text-right font-semibold">
                  Edit / Hapus
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-6 text-center text-sm text-gray-500"
                  >
                    Memuat data…
                  </td>
                </tr>
              )}

              {!loading && filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-sm text-gray-500"
                  >
                    Belum ada data tenaga kerja.
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
                      {row.posisi || "Operasional"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-800">
                      {rupiah(row.gaji_bulanan)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-800">
                      {row.hari_kerja ?? 26}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          className="rounded-lg border border-gray-200 p-2 hover:bg-white"
                          onClick={() => openEditModal(row)}
                          aria-label="Edit"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4 text-gray-700" />
                        </button>
                        <button
                          className="rounded-lg border border-gray-200 p-2 hover:bg-white"
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
                {editing ? "Edit Tenaga Kerja" : "Tambah Tenaga Kerja"}
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
                  Nama Tenaga Kerja
                </label>
                <input
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="ex: Barista"
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-gray-400"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-800">
                  Posisi / Jabatan
                </label>
                <input
                  value={posisi}
                  onChange={(e) => setPosisi(e.target.value)}
                  placeholder="ex: Operasional"
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-gray-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-800">
                  Gaji Bulanan (Rp)
                </label>
                <input
                  type="number"
                  min={0}
                  value={gajiBulanan}
                  onChange={(e) => setGajiBulanan(e.target.value)}
                  placeholder="ex: 1500000"
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-gray-400"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-800">
                  Hari Kerja / Bulan
                </label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={hariKerja}
                  onChange={(e) => setHariKerja(e.target.value)}
                  placeholder="ex: 26"
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-gray-400"
                />
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
                    : "Simpan Tenaga Kerja"}
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
              Tenaga Kerja ini?
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
