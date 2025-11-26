"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Search, X } from "lucide-react";
import { SetupTabs } from "../_components/SetupTabs";
import SuccessToast from "@/components/SuccessToast";
import { ownerFetch } from "@/lib/ownerFetch";

/* ========= config ========= */

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "https://api.fortislab.id";

/* ========= types & utils ========= */

type TenagaKategori = "produksi" | "non-produksi" | "Produksi" | "Non_produksi";

type TenagaKerja = {
  id: string;
  nama: string;
  jabatan?: string | null;
  gaji?: number | null; // gaji bulanan
  hari_kerja?: number | null;
  kategori?: TenagaKategori | null;
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
    ...(headers || {}),
  };

  const res = await ownerFetch(url, {
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

/* ========= helpers kecil ========= */

function normalizeKategori(kat?: string | null): TenagaKategori | null {
  if (!kat) return null;
  const lower = kat.toLowerCase();
  if (lower.includes("produksi") && !lower.includes("non")) return "produksi";
  if (lower.includes("non") && lower.includes("produksi")) return "non-produksi";
  return kat as TenagaKategori;
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
  const [jabatan, setJabatan] = useState("");
  const [gaji, setGaji] = useState("");
  const [hariKerja, setHariKerja] = useState("");
  const [kategori, setKategori] = useState<TenagaKategori | "">("");

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

      const mapped: TenagaKerja[] = raw.map((x: any, idx: number) => {
        // ambil hari kerja dari beberapa kemungkinan field
        let hari: number | null = null;

        if (typeof x.hari_kerja === "number") {
          hari = x.hari_kerja;
        } else if (typeof x.hari_kerja_per_bulan === "number") {
          hari = x.hari_kerja_per_bulan;
        } else if (x.hari_kerja != null) {
          hari = Number(x.hari_kerja);
        } else if (x.hari_kerja_per_bulan != null) {
          hari = Number(x.hari_kerja_per_bulan);
        }

        if (Number.isNaN(hari as number)) hari = null;

        return {
          id: String(x.id ?? x.tenaga_kerja_id ?? idx),
          nama: x.nama ?? x.nama_tenaga ?? "",
          jabatan: x.jabatan ?? x.role ?? null,
          gaji:
            typeof x.gaji === "number"
              ? x.gaji
              : x.gaji != null
              ? Number(x.gaji)
              : null,
          hari_kerja: hari,
          kategori: normalizeKategori(
            x.kategori ?? x.kategori_tenaga ?? x.kategori_pekerja
          ),
          created_at: x.created_at,
        };
      });

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
    return rows.filter(
      (r) =>
        (r.nama || "").toLowerCase().includes(q) ||
        (r.jabatan || "").toLowerCase().includes(q)
    );
  }, [rows, query]);

  /* ----- form helpers ----- */

  function resetForm() {
    setNama("");
    setJabatan("");
    setGaji("");
    setHariKerja("");
    setKategori("");
    setEditing(null);
  }

  function openAddModal() {
    resetForm();
    setFormModalOpen(true);
  }

  function openEditModal(row: TenagaKerja) {
    setEditing(row);
    setNama(row.nama || "");
    setJabatan(row.jabatan || "");
    setGaji(
      row.gaji != null && !Number.isNaN(row.gaji) ? String(row.gaji) : ""
    );
    setHariKerja(
      row.hari_kerja != null && !Number.isNaN(row.hari_kerja)
        ? String(row.hari_kerja)
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

    if (!nama.trim() || !gaji.trim()) {
      setErr("Nama dan gaji per bulan wajib diisi.");
      return;
    }

    if (!kategori) {
      setErr("Kategori tenaga kerja wajib diisi (produksi / non-produksi).");
      return;
    }

    try {
      setSaving(true);
      setErr(null);

      const gajiNum = Number(gaji.replace(",", "."));
      const safeGaji = Number.isNaN(gajiNum) ? 0 : gajiNum;

      const hariNum =
        hariKerja.trim() === "" ? null : Number(hariKerja.replace(",", "."));
      const safeHari =
        hariNum === null || Number.isNaN(hariNum) ? null : hariNum;

      const payload: any = {
        nama: nama.trim(),
        jabatan: jabatan.trim() || null,

        // gaji versi lama + versi baru (gaji_bulanan) sekalian
        gaji: safeGaji,
        gaji_bulanan: safeGaji,

        kategori: kategori as TenagaKategori,

        // hari kerja
        hari_kerja: safeHari,
        hari_kerja_per_bulan: safeHari,
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

      <SetupTabs active="tenaga-kerja" />

      <div className="mt-4 rounded-2xl border border-gray-200 bg-white shadow-sm">
        {/* header card */}
        <div className="px-6 py-5">
          <div className="flex flex-col gap-3">
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-2 self-start rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 active:scale-[0.99]"
            >
              <span>Tambah Tenaga Kerja</span>
              <Plus className="h-4 w-4" />
            </button>

            <p className="text-sm text-gray-500">
              Kategori <span className="font-semibold">produksi</span> akan
              dipakai dalam perhitungan HPP. Gaji dianggap{" "}
              <span className="font-semibold">per bulan</span>.
            </p>

            <div className="relative w-full md:w-[420px]">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari nama atau jabatan"
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
                <th className="px-6 py-3 font-semibold">Nama</th>
                <th className="px-6 py-3 font-semibold">Jabatan</th>
                <th className="px-6 py-3 font-semibold">Kategori</th>
                <th className="px-6 py-3 font-semibold">Gaji / Bulan</th>
                <th className="px-6 py-3 font-semibold">Hari Kerja / Bulan</th>
                <th className="px-6 py-3 text-right font-semibold">
                  Edit / Hapus
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-6 text-center text-sm text-gray-500"
                  >
                    Memuat data…
                  </td>
                </tr>
              )}

              {!loading && filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
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
                      {row.jabatan || (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-800">
                      {row.kategori ? (
                        <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-800">
                          {String(row.kategori).replace("_", " ")}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">
                          Belum di-set
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-800">
                      {rupiah(row.gaji)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-800">
                      {row.hari_kerja != null ? `${row.hari_kerja} hari` : "-"}
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
                  Nama
                </label>
                <input
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="ex: Barista A"
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-gray-400"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-800">
                  Jabatan
                </label>
                <input
                  value={jabatan}
                  onChange={(e) => setJabatan(e.target.value)}
                  placeholder="ex: Barista, Cook"
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-gray-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-800">
                  Kategori
                </label>
                <select
                  value={kategori}
                  onChange={(e) =>
                    setKategori(e.target.value as TenagaKategori | "")
                  }
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-gray-400"
                  required
                >
                  <option value="">Pilih kategori</option>
                  <option value="produksi">Produksi</option>
                  <option value="non-produksi">Non-Produksi</option>
                </select>
                <p className="text-xs text-gray-500">
                  Hanya kategori <span className="font-semibold">produksi</span>{" "}
                  yang dihitung ke overhead HPP.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-800">
                  Gaji / Bulan (Rp)
                </label>
                <input
                  type="number"
                  min={0}
                  value={gaji}
                  onChange={(e) => setGaji(e.target.value)}
                  placeholder="ex: 3000000"
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
                  min={0}
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
              Data Tenaga Kerja ini?
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
