"use client";

import React, { useEffect, useMemo, useState } from "react";

/** ====== CONFIG ====== */
const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.fortislab.id";
const OWNER_ID =
  process.env.NEXT_PUBLIC_OWNER_ID ||
  "f6269e9a-bc6d-4f8b-aa45-08affc769e5a";

/** ====== TYPES ====== */
type Produk = {
  id: string;
  nama: string;
  kategori?: string | null;
  harga?: number | null;
  aktif?: boolean | null;
  created_at?: string | null;
  [key: string]: any;
};

type ApiResponse<T> = { ok: boolean; data?: T; error?: string };

/** ====== UTIL ====== */
function cx(...cls: Array<string | false | null | undefined>) {
  return cls.filter(Boolean).join(" ");
}
const numberOrNull = (v: any) =>
  v === "" || v === null || v === undefined ? null : Number(v);

/** Ambil field dengan daftar alias */
function pick<T = any>(
  obj: Record<string, any>,
  candidates: string[],
  fallback: any = undefined
): T {
  for (const k of candidates) {
    if (obj && Object.prototype.hasOwnProperty.call(obj, k)) return obj[k];
  }
  return fallback;
}

/** Normalisasi 1 row produk dari BE ke shape FE */
function normalizeProduk(raw: any): Produk {
  // beberapa kemungkinan alias dari BE
  const id = pick<string>(raw, ["id", "produk_id", "uuid", "gid"], "");
  const nama = pick<string>(raw, ["nama", "name", "product_name", "judul"], "");
  const kategori = pick<string | null>(raw, ["kategori", "category"], null);
  const harga = pick<number | null>(raw, ["harga", "harga_jual_user", "price"], null);
  const aktif = pick<boolean | null>(raw, ["aktif", "active", "is_active"], true);
  const created_at = pick<string | null>(raw, ["created_at", "createdAt"], null);
  return { id, nama, kategori, harga, aktif, created_at, ...raw };
}

/** ====== API WRAPPER (toleran JSON/204) ====== */
async function api<T = any>(path: string, init?: RequestInit): Promise<ApiResponse<T>> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-owner-id": OWNER_ID,
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  // 204 / tanpa body → anggap ok
  if (res.status === 204) return { ok: true } as ApiResponse<T>;

  // coba baca teks dulu, karena kadang server kirim text/html
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : { ok: res.ok };
  } catch {
    // jika non-JSON tapi HTTP 2xx, treat ok; selain itu beri pesan jelas
    if (res.ok) return { ok: true } as ApiResponse<T>;
    return {
      ok: false,
      error: `Invalid response (${res.status}) from ${path}`,
    } as ApiResponse<T>;
  }

  if (!json?.ok && !res.ok && !json?.error) {
    json.error = `HTTP ${res.status} on ${path}`;
  }
  return json as ApiResponse<T>;
}

async function getProduk(): Promise<Produk[]> {
  const r = await api<any[]>("/setup/produk");
  if (!r.ok) throw new Error(r.error || "Gagal memuat produk");
  const arr = Array.isArray(r.data) ? r.data : [];
  return arr.map(normalizeProduk);
}

async function upsertProduk(payload: Partial<Produk>): Promise<Produk> {
  const r = await api<any>("/setup/produk", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(r.error || "Gagal menyimpan produk");
  const data = Array.isArray(r.data) ? r.data[0] : r.data;
  return normalizeProduk(data);
}

async function deleteProduk(id: string): Promise<void> {
  // 1) coba POST /delete (sesuai update BE)
  let r = await api(`/setup/produk/delete`, {
    method: "POST",
    body: JSON.stringify({ id }),
  });
  if (r.ok) return;

  // 2) fallback: DELETE /setup/produk/:id
  r = await api(`/setup/produk/${id}`, { method: "DELETE" });
  if (!r.ok) throw new Error(r.error || "Gagal menghapus produk");
}

/** ====== UI ATOMS ====== */
function Card(props: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cx(
        "rounded-2xl border border-gray-200 bg-white shadow-sm",
        "transition hover:shadow-md",
        props.className
      )}
    />
  );
}
function Button({
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cx(
        "px-4 py-2 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 active:bg-gray-200",
        "text-sm font-medium",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
    />
  );
}
function PrimaryButton({
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cx(
        "px-4 py-2 rounded-xl bg-black text-white hover:bg-gray-800 active:bg-gray-900",
        "text-sm font-semibold shadow-sm",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
    />
  );
}
function DangerButton({
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cx(
        "px-3 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 active:bg-red-800",
        "text-sm font-semibold shadow-sm",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
    />
  );
}

/** ====== MODAL ====== */
function Modal({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-xl rounded-2xl bg-white shadow-xl">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="text-lg font-semibold">{title}</h3>
            <button onClick={onClose} className="rounded-lg p-1 hover:bg-gray-100" aria-label="Tutup">✕</button>
          </div>
          <div className="p-4">{children}</div>
          <div className="p-4 border-t">{footer}</div>
        </div>
      </div>
    </div>
  );
}

/** ====== PAGE ====== */
export default function SetupProdukPage() {
  const [rows, setRows] = useState<Produk[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [sortBy, setSortBy] = useState<keyof Produk>("nama");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [editing, setEditing] = useState<Partial<Produk> | null>(null);
  const [confirmDel, setConfirmDel] = useState<Produk | null>(null);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setRows(await getProduk());
    } catch (e: any) {
      setError(e?.message || "Gagal memuat data.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    let arr = [...rows];
    if (term) {
      arr = arr.filter(
        (r) =>
          r.nama?.toLowerCase().includes(term) ||
          (r.kategori || "")?.toLowerCase().includes(term) ||
          String(r.harga ?? "").toLowerCase().includes(term)
      );
    }
    arr.sort((a, b) => {
      const A = (a[sortBy] ?? "").toString().toLowerCase();
      const B = (b[sortBy] ?? "").toString().toLowerCase();
      if (A < B) return sortDir === "asc" ? -1 : 1;
      if (A > B) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [rows, q, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  function startCreate() {
    setEditing({ id: "", nama: "", kategori: "", harga: null, aktif: true });
  }
  function startEdit(row: Produk) {
    setEditing({
      id: row.id,
      nama: row.nama ?? "",
      kategori: row.kategori ?? "",
      harga: row.harga ?? null,
      aktif: row.aktif ?? true,
    });
  }

  async function onSave() {
    if (!editing) return;
    if (!editing.nama || String(editing.nama).trim() === "") {
      setBanner("Nama produk wajib diisi.");
      return;
    }
    setSaving(true);
    setBanner(null);
    setError(null);
    try {
      const payload = {
        id: editing.id || undefined, // upsert by id jika ada
        nama: String(editing.nama).trim(),
        kategori:
          editing.kategori === "" || editing.kategori === undefined
            ? null
            : editing.kategori,
        harga:
          editing.harga === undefined
            ? null
            : numberOrNull(editing.harga as any),
        aktif:
          editing.aktif === undefined ? true : Boolean(editing.aktif as any),
      };
      await upsertProduk(payload);
      await load();
      setEditing(null);
      setBanner("Berhasil menyimpan produk.");
    } catch (e: any) {
      setError(e?.message || "Gagal menyimpan.");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(row: Produk) {
    setDeleting(true);
    setError(null);
    try {
      await deleteProduk(row.id);
      await load();
      setConfirmDel(null);
      setBanner(`Produk "${row.nama}" telah dihapus.`);
    } catch (e: any) {
      setError(e?.message || "Gagal menghapus.");
    } finally {
      setDeleting(false);
    }
  }

  function exportCSV() {
    const data = filtered.map((r) => ({
      id: r.id,
      nama: r.nama,
      kategori: r.kategori ?? "",
      harga: r.harga ?? "",
      aktif: r.aktif ?? "",
      created_at: r.created_at ?? "",
    }));
    const headers = Object.keys(data[0] || {});
    const csv =
      [headers.join(",")]
        .concat(
          data.map((row) =>
            headers
              .map((h) => {
                const raw = (row as any)[h];
                const cell =
                  raw === null || raw === undefined ? "" : String(raw);
                return cell.includes(",") || cell.includes('"') || cell.includes("\n")
                  ? `"${cell.replace(/"/g, '""')}"`
                  : cell;
              })
              .join(",")
          )
        )
        .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `produk_${new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/[:T]/g, "-")}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Setup · Produk</h1>
          <p className="text-sm text-gray-600">
            GET/POST upsert/POST delete — sinkron BE (22 Okt).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={exportCSV}>Export CSV</Button>
          <Button onClick={load}>Refresh</Button>
          <PrimaryButton onClick={startCreate}>+ Tambah Produk</PrimaryButton>
        </div>
      </div>

      {banner && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-green-800">
          {banner}
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-800">
          {error}
        </div>
      )}

      <Card className="p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Cari nama/kategori/harga…"
              className="w-72 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10"
            />
            <div className="hidden md:block text-xs text-gray-500">
              {filtered.length} data
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={String(sortBy)}
              onChange={(e) => setSortBy(e.target.value as keyof Produk)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              <option value="nama">Sort: Nama</option>
              <option value="kategori">Sort: Kategori</option>
              <option value="harga">Sort: Harga</option>
              <option value="created_at">Sort: Dibuat</option>
            </select>
            <select
              value={sortDir}
              onChange={(e) => setSortDir(e.target.value as any)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              <option value="asc">A → Z</option>
              <option value="desc">Z → A</option>
            </select>
          </div>
        </div>

        <div className="mt-4 overflow-auto rounded-xl border border-gray-200">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left">
                <th className="px-4 py-3">Nama</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3">Harga</th>
                <th className="px-4 py-3 w-32">Status</th>
                <th className="px-4 py-3 w-40 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    Memuat data…
                  </td>
                </tr>
              ) : paged.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    Tidak ada data.
                  </td>
                </tr>
              ) : (
                paged.map((r) => (
                  <tr key={r.id} className="border-t hover:bg-gray-50 transition">
                    <td className="px-4 py-3 font-medium">{r.nama || "-"}</td>
                    <td className="px-4 py-3">{r.kategori || "-"}</td>
                    <td className="px-4 py-3">
                      {r.harga == null
                        ? "-"
                        : new Intl.NumberFormat("id-ID").format(Number(r.harga))}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cx(
                          "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
                          r.aktif ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"
                        )}
                      >
                        {r.aktif ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          onClick={() =>
                            setEditing({
                              id: r.id,
                              nama: r.nama ?? "",
                              kategori: r.kategori ?? "",
                              harga: r.harga ?? null,
                              aktif: r.aktif ?? true,
                            })
                          }
                        >
                          Edit
                        </Button>
                        <DangerButton onClick={() => setConfirmDel(r)}>
                          Hapus
                        </DangerButton>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="mt-4 flex items-center justify-between">
          <div className="text-xs text-gray-500">
            Halaman {page} dari {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setPage(1)} disabled={page === 1}>
              «
            </Button>
            <Button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
              Sebelumnya
            </Button>
            <Button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Berikutnya
            </Button>
            <Button onClick={() => setPage(totalPages)} disabled={page === totalPages}>
              »
            </Button>
          </div>
        </div>
      </Card>

      {/* Modal Tambah/Edit */}
      <Modal
        open={Boolean(editing)}
        onClose={() => (saving ? null : setEditing(null))}
        title={editing?.id ? "Edit Produk" : "Tambah Produk"}
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button disabled={saving} onClick={() => setEditing(null)}>
              Batal
            </Button>
            <PrimaryButton disabled={saving} onClick={onSave}>
              {saving ? "Menyimpan..." : "Simpan"}
            </PrimaryButton>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-600">Nama</label>
              <input
                value={editing?.nama ?? ""}
                onChange={(e) =>
                  setEditing((s) => ({ ...(s as any), nama: e.target.value }))
                }
                placeholder="Contoh: Kopi Susu Gula Aren"
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600">Kategori</label>
              <input
                value={editing?.kategori ?? ""}
                onChange={(e) =>
                  setEditing((s) => ({ ...(s as any), kategori: e.target.value }))
                }
                placeholder="Contoh: Minuman"
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-600">Harga Jual</label>
              <input
                type="number"
                inputMode="numeric"
                value={editing?.harga ?? ""}
                onChange={(e) =>
                  setEditing((s) => ({
                    ...(s as any),
                    harga: e.target.value === "" ? null : Number(e.target.value),
                  }))
                }
                placeholder="Contoh: 22000"
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10"
              />
            </div>
            <div className="flex items-end gap-2">
              <label className="text-xs text-gray-600 w-24">Status</label>
              <button
                onClick={() =>
                  setEditing((s) => ({ ...(s as any), aktif: !s?.aktif }))
                }
                className={cx(
                  "mt-1 inline-flex items-center rounded-xl border px-3 py-2 text-sm",
                  editing?.aktif
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-gray-200 bg-gray-50 text-gray-700"
                )}
              >
                {editing?.aktif ? "Aktif" : "Nonaktif"}
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal Konfirmasi Hapus */}
      <Modal
        open={Boolean(confirmDel)}
        onClose={() => (deleting ? null : setConfirmDel(null))}
        title="Hapus Produk"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button disabled={deleting} onClick={() => setConfirmDel(null)}>
              Batal
            </Button>
            <DangerButton
              disabled={deleting}
              onClick={() => confirmDel && onDelete(confirmDel)}
            >
              {deleting ? "Menghapus..." : "Hapus"}
            </DangerButton>
          </div>
        }
      >
        <p>
          Yakin hapus produk{" "}
          <span className="font-semibold">{confirmDel?.nama}</span>? Tindakan ini
          tidak dapat dibatalkan.
        </p>
      </Modal>
    </div>
  );
}
