"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Search, X, CheckCircle2 } from "lucide-react";
import { SetupTabs } from "../_components/SetupTabs";
import { createPortal } from "react-dom";
import { ownerFetch } from "@/lib/ownerFetch";

/* ========= config ========= */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://api.fortislab.id";

/* ========= helpers ========= */

type Bahan = {
  id: string;
  nama_bahan: string;
  harga?: number | null;
  volume_default?: number | null;
  satuan?: string | null;
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
  let msg = raw;
  // kalau backend kirim JSON { ok:false, message:"..." }
  if (msg.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(msg);
      if (parsed?.message) msg = String(parsed.message);
    } catch {
      // ignore
    }
  }
  return msg.replace(/<[^>]+>/g, "");
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
    cache: "no-store",
    ...rest,
    headers: mergedHeaders,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }

  return asJson ? res.json() : res;
}

/* ========= page ========= */

export default function SetupBahanPage() {
  const [list, setList] = useState<Bahan[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // modal state
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [deleteModalRow, setDeleteModalRow] = useState<Bahan | null>(null);
  const [editing, setEditing] = useState<Bahan | null>(null);

  // form
  const [namaBahan, setNamaBahan] = useState("");
  const [hargaBeli, setHargaBeli] = useState("");
  const [volume, setVolume] = useState("");
  const [satuan, setSatuan] = useState("");

  const [notice, setNotice] = useState<{ type: "success"; text: string } | null>(
    null
  );

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 2200);
    return () => clearTimeout(t);
  }, [notice]);

  function showSuccess(text: string) {
    setNotice({ type: "success", text });
  }

  function SuccessToast({ text }: { text: string }) {
    if (typeof window === "undefined") return null;
    return createPortal(
      <div className="fixed right-4 top-4 z-[10000] inline-flex items-center gap-2 rounded-xl bg-green-50 px-4 py-2 text-sm font-medium text-green-800 shadow ring-1 ring-green-200">
        <CheckCircle2 className="h-4 w-4" />
        <span>{text}</span>
      </div>,
      document.body
    );
  }

  /* ----- load data ----- */

  async function fetchData() {
    setLoading(true);
    setErr(null);
    try {
      const res = await callApi(`/setup/bahan?t=${Date.now()}`, {
        method: "GET",
        cache: "no-store" as RequestCache,
      });

      const raw = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res)
        ? res
        : [];
      const rows: Bahan[] = raw.map((x: any) => ({
        id: String(x.id ?? x.bahan_id ?? crypto.randomUUID()),
        nama_bahan: x.nama_bahan ?? x.nama ?? "",
        harga: x.harga ?? x.price ?? null,
        volume_default: Number(x.purchase_qty ?? x.volume_default ?? x.volume ?? 0),
        satuan: x.purchase_unit ?? x.satuan ?? x.unit ?? null,
      }));
      setList(rows);
    } catch (e: any) {
      setErr(cleanErrorMessage(e?.message || "Gagal memuat data bahan."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  /* ----- derived list (search) ----- */

  const filtered = useMemo(() => {
    const q = (query || "").trim().toLowerCase();
    if (!q) return list;
    return list.filter((r) => (r.nama_bahan || "").toLowerCase().includes(q));
  }, [list, query]);

  /* ----- form helpers ----- */

  function resetForm() {
    setNamaBahan("");
    setHargaBeli("");
    setVolume("");
    setSatuan("");
    setEditing(null);
  }

  function openAddModal() {
    resetForm();
    setFormModalOpen(true);
  }

  function openEditModal(row: Bahan) {
    setEditing(row);
    setNamaBahan(row.nama_bahan || "");
    setHargaBeli(
      row.harga != null && !Number.isNaN(row.harga) ? String(row.harga) : ""
    );
    setVolume(
      row.volume_default != null && !Number.isNaN(row.volume_default)
        ? String(row.volume_default)
        : ""
    );
    setSatuan(row.satuan || "");
    setFormModalOpen(true);
  }

  function closeFormModal() {
    if (saving) return;
    setFormModalOpen(false);
    resetForm();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!namaBahan.trim() || !hargaBeli.trim() || !satuan.trim()) {
      setErr("Nama, harga, dan satuan wajib diisi.");
      return;
    }

    try {
      setSaving(true);
      setErr(null);

      const hargaNum = Number(hargaBeli.replace(",", "."));
      const volNum =
        volume.trim() === "" ? null : Number(volume.replace(",", "."));
      const namaTrim = namaBahan.trim();
      const satuanTrim = satuan.trim();

      const payload: any = {
        nama: namaTrim,
        nama_bahan: namaTrim,
        satuan: satuanTrim,
        harga: Number.isNaN(hargaNum) ? 0 : hargaNum,
        purchase_qty: Number.isNaN(volNum as any) || volNum == null ? 0 : volNum,
        purchase_unit: satuanTrim,
      };

      if (editing) {
        await callApi(`/setup/bahan/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });

        // OPTIMISTIC UPDATE – langsung update row di state
        setList((prev) =>
          prev.map((it) =>
            it.id === editing.id
              ? {
                  ...it,
                  nama_bahan: payload.nama ?? payload.nama_bahan ?? it.nama_bahan,
                  harga: payload.harga ?? it.harga,
                  volume_default:
                    typeof payload.purchase_qty === "number"
                      ? payload.purchase_qty
                      : it.volume_default,
                  satuan: payload.purchase_unit ?? it.satuan,
                }
              : it
          )
        );
      } else {
        await callApi("/setup/bahan", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      await fetchData(); // sinkron final
      showSuccess(
        editing
          ? "Berhasil menyimpan perubahan."
          : "Berhasil menambahkan bahan."
      );
      closeFormModal();
    } catch (e: any) {
      const msg = cleanErrorMessage(
        (e?.message || "Gagal menyimpan bahan.") as string
      );
      setErr(msg);
    } finally {
      setSaving(false);
    }
  }

  /* ----- delete helpers ----- */

  function openDeleteModal(row: Bahan) {
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

      await callApi(`/setup/bahan/${row.id}`, { method: "DELETE" });

      // OPTIMISTIC REMOVE – hilangkan langsung dari tabel
      setList((prev) => prev.filter((it) => it.id !== row.id));

      await fetchData(); // sinkron final
      showSuccess("Bahan berhasil dihapus.");
      closeDeleteModal();
    } catch (e: any) {
      const msg = cleanErrorMessage(e?.message || "");
      if (msg.toLowerCase().includes("not found")) {
        await fetchData();
        closeDeleteModal();
        return;
      }
      setErr(msg || "Gagal menghapus bahan.");
    } finally {
      setDeletingId(null);
    }
  }

  /* ----- render ----- */

  return (
    <div className="p-6 md:p-8">
      {notice ? <SuccessToast text={notice.text} /> : null}

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-extrabold tracking-tight">Setup</h1>
      </div>

      <SetupTabs active="bahan" />

      <div className="mt-4 rounded-2xl border border-gray-200 bg-white shadow-sm">
        {/* header card: tombol + search */}
        <div className="flex flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between">
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 active:scale-[0.99]"
          >
            <span>Tambah Bahan</span>
            <Plus className="h-4 w-4" />
          </button>

          <div className="relative w-full md:w-[420px]">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari bahan, ex: kopi arabika"
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
                <th className="px-6 py-3 font-semibold">Nama Bahan</th>
                <th className="px-6 py-3 font-semibold">Harga</th>
                <th className="px-6 py-3 font-semibold">Volume</th>
                <th className="px-6 py-3 font-semibold">Satuan</th>
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
                    Belum ada data bahan.
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
                      {row.nama_bahan}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-800">
                      {row.harga != null ? rupiah(row.harga) : "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-800">
                      {row.volume_default != null
                        ? row.volume_default
                        : "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-800">
                      {row.satuan || "—"}
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

      {/* ========= MODAL FORM TAMBAH / EDIT ========= */}
      {formModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="max-h-[85vh] w-[90%] max-w-lg overflow-y-auto rounded-3xl bg-white px-6 py-5 shadow-xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <h2 className="text-2xl font-extrabold text-gray-900">
                {editing ? "Edit Bahan" : "Tambah Bahan"}
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
                  Nama Bahan
                </label>
                <input
                  value={namaBahan}
                  onChange={(e) => setNamaBahan(e.target.value)}
                  placeholder="Nama Bahan"
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-gray-400"
                  required
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-800">
                    Harga Beli
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={hargaBeli}
                    onChange={(e) => setHargaBeli(e.target.value)}
                    placeholder="ex : 50000"
                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-gray-400"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-800">
                    Volume
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={volume}
                    onChange={(e) => setVolume(e.target.value)}
                    placeholder="ex : 100"
                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-gray-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-800">
                    Satuan
                  </label>
                  <input
                    value={satuan}
                    onChange={(e) => setSatuan(e.target.value)}
                    placeholder="ex: gram, ml, kg"
                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-gray-400"
                    required
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full rounded-xl bg-red-600 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {saving ? "Menyimpan..." : "Simpan Bahan"}
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
              Bahan ini?
            </h2>
            <p className="mb-8 text-sm font-medium text-gray-800">
              {deleteModalRow.nama_bahan}
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
