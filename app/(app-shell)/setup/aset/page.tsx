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

type Aset = {
  id: string;
  nama: string;
  kategori: string;
  harga_beli?: number | null;
  waktu_beli?: string | null; // ISO string "2025-12-01"
  nilai_ekonomis_bulan?: number | null;
  status?: string | null;
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
  let msg = raw || "";
  msg = msg.replace(/<[^>]+>/g, "");
  msg = msg.replace(/^Error\s*/i, "");
  return msg.trim();
}

// Tampilkan di tabel sebagai "MM/YY" (contoh: 12/25) kalau stringnya ISO (YYYY-MM-DD)
function formatWaktuBeliDisplay(v?: string | null): string {
  if (!v) return "—";
  try {
    // kalau backend sudah kirim format lain (mis: "12/25"), jangan di-oprek
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;

    const [yearStr, monthStr] = v.split("-");
    const yy = yearStr.slice(-2);
    return `${monthStr}/${yy}`;
  } catch {
    return v || "—";
  }
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

export default function SetupAsetPage() {
  const [rows, setRows] = useState<Aset[]>([]);
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
  const [editing, setEditing] = useState<Aset | null>(null);

  const [namaAset, setNamaAset] = useState("");
  const [kategori, setKategori] = useState("");
  const [hargaBeli, setHargaBeli] = useState("");
  const [waktuBeli, setWaktuBeli] = useState(""); // ISO date (YYYY-MM-DD)
  const [nilaiEkonomis, setNilaiEkonomis] = useState("");
  const [status, setStatus] = useState("Aktif");

  const [deleteModalRow, setDeleteModalRow] = useState<Aset | null>(null);

  /* ----- load data ----- */

  async function fetchData() {
    setLoading(true);
    setErr(null);
    try {
      const res = await callApi("/setup/aset", { method: "GET" });

      const raw = Array.isArray((res as any)?.data)
        ? (res as any).data
        : Array.isArray(res)
        ? (res as any)
        : [];

      const mapped: Aset[] = raw.map((x: any, idx: number) => {
        const backendId = x.id ?? x.aset_id ?? idx;
        return {
          id: String(backendId),
          nama: x.nama ?? x.nama_aset ?? "",
          kategori: x.kategori ?? x.category ?? "",
          harga_beli: x.harga_beli ?? x.harga ?? null,
          waktu_beli: x.waktu_beli ?? x.tanggal_beli ?? x.tgl_beli ?? null,
          nilai_ekonomis_bulan:
            x.nilai_ekonomis_bulan ??
            x.nilai_ekonomis ??
            x.masa_manfaat_bulan ??
            null,
          status: x.status ?? "",
          created_at: x.created_at,
        };
      });

      setRows(mapped);
    } catch (e: any) {
      console.error("Gagal memuat data aset:", e);
      const msg = cleanErrorMessage(e?.message || "Gagal memuat data aset.");
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
    setNamaAset("");
    setKategori("");
    setHargaBeli("");
    setWaktuBeli("");
    setNilaiEkonomis("");
    setStatus("Aktif");
    setEditing(null);
  }

  function openAddModal() {
    resetForm();
    setFormModalOpen(true);
  }

  function openEditModal(row: Aset) {
    setEditing(row);
    setNamaAset(row.nama || "");
    setKategori(row.kategori || "");
    setHargaBeli(
      row.harga_beli != null && !Number.isNaN(row.harga_beli)
        ? String(row.harga_beli)
        : ""
    );

    // kalau BE sudah simpan ISO, pakai langsung; kalau bentuknya "12/25" kita gak bisa konversi balik dengan aman → biarkan kosong
    if (row.waktu_beli && /^\d{4}-\d{2}-\d{2}$/.test(row.waktu_beli)) {
      setWaktuBeli(row.waktu_beli);
    } else {
      setWaktuBeli("");
    }

    setNilaiEkonomis(
      row.nilai_ekonomis_bulan != null &&
      !Number.isNaN(row.nilai_ekonomis_bulan)
        ? String(row.nilai_ekonomis_bulan)
        : ""
    );
    setStatus(row.status || "Aktif");
    setFormModalOpen(true);
  }

  function closeFormModal() {
    if (saving) return;
    setFormModalOpen(false);
    resetForm();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!namaAset.trim() || !kategori.trim() || !hargaBeli.trim()) {
      setErr("Nama aset, kategori, dan harga beli wajib diisi.");
      return;
    }

    try {
      setSaving(true);
      setErr(null);

      const hargaNum = Number(hargaBeli.replace(",", "."));
      const nilaiNum =
        nilaiEkonomis.trim() === ""
          ? null
          : Number(nilaiEkonomis.replace(",", "."));

      const namaTrim = namaAset.trim();
      const kategoriTrim = kategori.trim();
      const statusTrim = status.trim() || "Aktif";

      // waktuBeli sudah dalam format ISO (YYYY-MM-DD) dari input[type=date]
      const waktuTrim = waktuBeli || null;

      const payload: any = {
        nama: namaTrim,
        nama_aset: namaTrim,
        kategori: kategoriTrim,
        harga_beli: Number.isNaN(hargaNum) ? 0 : hargaNum,
        harga: Number.isNaN(hargaNum) ? 0 : hargaNum,
        waktu_beli: waktuTrim,
        tanggal_beli: waktuTrim,
        nilai_ekonomis_bulan:
          nilaiNum == null || Number.isNaN(nilaiNum) ? null : nilaiNum,
        nilai_ekonomis:
          nilaiNum == null || Number.isNaN(nilaiNum) ? null : nilaiNum,
        status: statusTrim,
      };

      if (editing) {
        try {
          await callApi(`/setup/aset/${editing.id}`, {
            method: "PUT",
            body: JSON.stringify(payload),
          });
        } catch (errPut: any) {
          const msg = String(errPut?.message || "");
          console.warn("PUT /setup/aset/:id gagal:", msg);

          if (msg.includes("Cannot PUT /setup/aset")) {
            await callApi(`/setup/aset/${editing.id}`, {
              method: "DELETE",
            });
            await callApi("/setup/aset", {
              method: "POST",
              body: JSON.stringify(payload),
            });
          } else {
            throw errPut;
          }
        }
      } else {
        await callApi("/setup/aset", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      await fetchData();
      setNotice(
        editing
          ? "Berhasil menyimpan perubahan aset."
          : "Berhasil menambahkan aset."
      );
      closeFormModal();
    } catch (e: any) {
      console.error("Gagal menyimpan aset:", e);
      const msg = cleanErrorMessage(e?.message || "Gagal menyimpan aset.");
      setErr(msg || "Gagal menyimpan aset. Coba lagi nanti.");
    } finally {
      setSaving(false);
    }
  }

  /* ----- delete helpers ----- */

  function openDeleteModal(row: Aset) {
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

      await callApi(`/setup/aset/${row.id}`, {
        method: "DELETE",
      });

      await fetchData();
      setNotice("Aset berhasil dihapus.");
      closeDeleteModal();
    } catch (e: any) {
      console.error("Gagal menghapus aset:", e);
      const msg = cleanErrorMessage(e?.message || "Gagal menghapus aset.");
      setErr(msg || "Gagal menghapus aset. Coba lagi nanti.");
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

      <SetupTabs active="aset" />

      <div className="mt-4 rounded-2xl border border-gray-200 bg-white shadow-sm">
        {/* header card */}
        <div className="flex flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between">
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 active:scale-[0.99]"
          >
            <span>Tambah Aset</span>
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
                <th className="px-6 py-3 font-semibold">Nama Aset</th>
                <th className="px-6 py-3 font-semibold">Kategori</th>
                <th className="px-6 py-3 font-semibold">Harga Beli</th>
                <th className="px-6 py-3 font-semibold">Waktu Beli</th>
                <th className="px-6 py-3 font-semibold">Nilai Ekonomis</th>
                <th className="px-6 py-3 font-semibold">Status</th>
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
                    Belum ada data aset.
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
                      {row.kategori}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-800">
                      {rupiah(row.harga_beli)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-800">
                      {formatWaktuBeliDisplay(row.waktu_beli)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-800">
                      {row.nilai_ekonomis_bulan != null
                        ? `${row.nilai_ekonomis_bulan} Bulan`
                        : "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-800">
                      {row.status || "Aktif"}
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
                {editing ? "Edit Aset" : "Tambah Aset"}
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
                  Nama Aset
                </label>
                <input
                  value={namaAset}
                  onChange={(e) => setNamaAset(e.target.value)}
                  placeholder="ex: Monang"
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-gray-400"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-800">
                  Kategori
                </label>
                <input
                  value={kategori}
                  onChange={(e) => setKategori(e.target.value)}
                  placeholder="ex: Bar, Kitchen, Kasir"
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-gray-400"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-800">
                  Harga Beli
                </label>
                <input
                  type="number"
                  min={0}
                  value={hargaBeli}
                  onChange={(e) => setHargaBeli(e.target.value)}
                  placeholder="ex: 1200000"
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-gray-400"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-800">
                  Waktu Beli
                </label>
                <input
                  type="date"
                  value={waktuBeli}
                  onChange={(e) => setWaktuBeli(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-gray-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-800">
                  Nilai Ekonomis (Bulan)
                </label>
                <input
                  type="number"
                  min={1}
                  value={nilaiEkonomis}
                  onChange={(e) => setNilaiEkonomis(e.target.value)}
                  placeholder="ex: 24"
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-gray-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-800">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-gray-400"
                >
                  <option value="Aktif">Aktif</option>
                  <option value="Non-Aktif">Non-Aktif</option>
                  <option value="Rusak">Rusak</option>
                </select>
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
                    : "Simpan Aset"}
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
              Aset ini?
            </h2>
            <p className="mb-8 text-sm font-medium text-gray-800">
              {deleteModalRow.nama}
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
