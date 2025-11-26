"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Search, X, AlertCircle } from "lucide-react";
import { SetupTabs } from "../_components/SetupTabs";
import SuccessToast from "@/components/SuccessToast";
import { ownerFetch } from "@/lib/ownerFetch";

/* ========= config ========= */

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "https://api.fortislab.id";

/* ========= types & utils ========= */

type Aset = {
  id: string;
  nama_aset: string;
  kategori?: string | null;
  kategori_hpp?: string | null;
  harga_beli?: number | null;
  nilai_ekonomis?: number | null;
  nilai_residu?: number | null;
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
  const [kategoriHpp, setKategoriHpp] = useState<
    "produksi" | "non-produksi" | ""
  >("");
  const [hargaBeli, setHargaBeli] = useState("");
  const [nilaiEkonomis, setNilaiEkonomis] = useState("");
  const [nilaiResidu, setNilaiResidu] = useState("");
  const [status, setStatus] = useState<"Aktif" | "Rusak" | "Non-Aktif" | "">(
    ""
  );

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

      const mapped: Aset[] = raw.map((x: any, idx: number) => ({
        id: String(x.id ?? idx),
        nama_aset: x.nama_aset ?? x.nama ?? "",
        kategori: x.kategori ?? null,
        kategori_hpp: x.kategori_hpp ?? null,
        harga_beli:
          typeof x.harga_beli === "number"
            ? x.harga_beli
            : x.harga_beli != null
            ? Number(x.harga_beli)
            : null,
        nilai_ekonomis:
          typeof x.nilai_ekonomis === "number"
            ? x.nilai_ekonomis
            : x.nilai_ekonomis != null
            ? Number(x.nilai_ekonomis)
            : null,
        nilai_residu:
          typeof x.nilai_residu === "number"
            ? x.nilai_residu
            : x.nilai_residu != null
            ? Number(x.nilai_residu)
            : null,
        status: x.status ?? null,
        created_at: x.created_at,
      }));

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
    return rows.filter((r) => (r.nama_aset || "").toLowerCase().includes(q));
  }, [rows, query]);

  /* ----- form helpers ----- */

  function resetForm() {
    setNamaAset("");
    setKategori("");
    setKategoriHpp("");
    setHargaBeli("");
    setNilaiEkonomis("");
    setNilaiResidu("");
    setStatus("");
    setEditing(null);
  }

  function openAddModal() {
    resetForm();
    setFormModalOpen(true);
  }

  function openEditModal(row: Aset) {
    setEditing(row);
    setNamaAset(row.nama_aset || "");
    setKategori(row.kategori || "");
    setKategoriHpp(
      (row.kategori_hpp as "produksi" | "non-produksi" | "") || ""
    );
    setHargaBeli(
      row.harga_beli != null && !Number.isNaN(row.harga_beli)
        ? String(row.harga_beli)
        : ""
    );
    setNilaiEkonomis(
      row.nilai_ekonomis != null && !Number.isNaN(row.nilai_ekonomis)
        ? String(row.nilai_ekonomis)
        : ""
    );
    setNilaiResidu(
      row.nilai_residu != null && !Number.isNaN(row.nilai_residu)
        ? String(row.nilai_residu)
        : ""
    );
    setStatus((row.status as "Aktif" | "Rusak" | "Non-Aktif" | "") || "");
    setFormModalOpen(true);
  }

  function closeFormModal() {
    if (saving) return;
    setFormModalOpen(false);
    resetForm();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!namaAset.trim()) {
      setErr("Nama aset wajib diisi.");
      return;
    }
    if (!kategoriHpp) {
      setErr("Kategori HPP wajib dipilih.");
      return;
    }
    if (!hargaBeli.trim() || !nilaiEkonomis.trim()) {
      setErr("Harga beli dan umur ekonomis wajib diisi.");
      return;
    }
    if (!status) {
      setErr("Status aset wajib dipilih.");
      return;
    }

    try {
      setSaving(true);
      setErr(null);

      const hargaNum = Number(hargaBeli.replace(",", "."));
      const safeHarga = Number.isNaN(hargaNum) ? 0 : hargaNum;

      const umurNum = Number(nilaiEkonomis.replace(",", "."));
      const safeUmur = Number.isNaN(umurNum) ? 0 : umurNum;

      const residuNum = Number(nilaiResidu.replace(",", "."));
      const safeResidu = Number.isNaN(residuNum) ? 0 : residuNum;

      const payload = {
        nama_aset: namaAset.trim(),
        kategori: kategori.trim() || null,
        kategori_hpp: kategoriHpp,
        harga_beli: safeHarga,
        nilai_ekonomis: safeUmur,
        nilai_residu: safeResidu,
        status,
      };

      if (editing) {
        await callApi(`/setup/aset/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
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
      const msg = cleanErrorMessage(
        e?.message || "Gagal menyimpan data aset."
      );
      setErr(msg || "Gagal menyimpan data aset. Coba lagi nanti.");
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

  /* ----- helpers UI ----- */

  function formatKategoriHppBadge(value?: string | null) {
    if (!value) return "-";
    const v = value.toLowerCase();
    const label = v === "produksi" ? "produksi" : "non-produksi";
    const isProd = v === "produksi";
    return (
      <span
        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
          isProd ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
        }`}
      >
        {label}
      </span>
    );
  }

  function formatStatusBadge(value?: string | null) {
    if (!value) return "-";
    const v = value.toLowerCase();
    let cls = "bg-gray-100 text-gray-700"; // default non-aktif
    if (v === "aktif") cls = "bg-emerald-100 text-emerald-700";
    else if (v === "rusak") cls = "bg-orange-100 text-orange-700";

    return (
      <span
        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${cls}`}
      >
        {value}
      </span>
    );
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
        <div className="px-6 py-5">
          <div className="flex flex-col gap-3">
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-2 self-start rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 active:scale-[0.99]"
            >
              <span>Tambah Aset</span>
              <Plus className="h-4 w-4" />
            </button>

            <p className="text-sm text-gray-500">
              Kategori HPP <span className="font-semibold">produksi</span> akan
              dipakai untuk menghitung depresiasi di Kalkulator HPP.
            </p>

            <div className="relative w-full md:w-[420px]">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari nama aset"
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 pl-10 text-sm outline-none focus:border-gray-400"
              />
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            </div>
          </div>
        </div>

        {err && (
          <div className="mx-6 mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{err}</span>
          </div>
        )}

        {/* tabel */}
        <div className="overflow-x-auto">
          <table className="min-w-full border-t border-gray-100">
            <thead>
              <tr className="text-left text-sm text-gray-500">
                <th className="px-6 py-3 font-semibold">Nama Aset</th>
                <th className="px-6 py-3 font-semibold">Kategori HPP</th>
                <th className="px-6 py-3 font-semibold">Harga Beli</th>
                <th className="px-6 py-3 font-semibold">Nilai Residu</th>
                <th className="px-6 py-3 font-semibold">Umur Ekonomis</th>
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
                      {row.nama_aset}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-800">
                      {formatKategoriHppBadge(row.kategori_hpp)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-800">
                      {row.harga_beli != null ? rupiah(row.harga_beli) : "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-800">
                      {row.nilai_residu != null ? rupiah(row.nilai_residu) : "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-800">
                      {row.nilai_ekonomis != null
                        ? `${row.nilai_ekonomis} th`
                        : "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-800">
                      {formatStatusBadge(row.status)}
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
                  placeholder="ex: Mesin Espresso, Kulkas 2 Pintu"
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-gray-400"
                  required
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-800">
                    Kategori (bebas)
                  </label>
                  <input
                    value={kategori}
                    onChange={(e) => setKategori(e.target.value)}
                    placeholder="ex: Peralatan, Elektronik"
                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-gray-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-800">
                    Kategori HPP
                  </label>
                  <select
                    value={kategoriHpp}
                    onChange={(e) =>
                      setKategoriHpp(
                        e.target.value as "produksi" | "non-produksi" | ""
                      )
                    }
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-gray-400"
                    required
                  >
                    <option value="">Pilih kategori HPP</option>
                    <option value="produksi">Produksi (masuk HPP)</option>
                    <option value="non-produksi">Non-produksi</option>
                  </select>
                  <p className="text-xs text-gray-500">
                    Hanya aset dengan kategori HPP{" "}
                    <span className="font-semibold">produksi</span> yang
                    dipakai di perhitungan HPP.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-800">
                    Harga Beli (Rp)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={hargaBeli}
                    onChange={(e) => setHargaBeli(e.target.value)}
                    placeholder="ex: 5000000"
                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-gray-400"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-800">
                    Nilai Residu (Rp)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={nilaiResidu}
                    onChange={(e) => setNilaiResidu(e.target.value)}
                    placeholder="ex: 500000"
                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-gray-400"
                  />
                  <p className="text-xs text-gray-500">
                    Nilai perkiraan saat aset habis umur ekonomis.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-800">
                    Umur Ekonomis (tahun)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={nilaiEkonomis}
                    onChange={(e) => setNilaiEkonomis(e.target.value)}
                    placeholder="ex: 5"
                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-gray-400"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-800">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) =>
                    setStatus(
                      e.target.value as "Aktif" | "Rusak" | "Non-Aktif" | ""
                    )
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-gray-400"
                  required
                >
                  <option value="">Pilih status aset</option>
                  <option value="Aktif">Aktif</option>
                  <option value="Rusak">Rusak</option>
                  <option value="Non-Aktif">Non-Aktif</option>
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
              Yakin ingin menghapus
              <br />
              aset ini?
            </h2>
            <p className="mb-1 text-sm font-medium text-gray-800">
              {deleteModalRow.nama_aset}
            </p>
            <p className="mb-8 text-xs text-gray-500">
              Aset yang dihapus tidak akan lagi dipakai dalam perhitungan HPP.
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
