"use client";
import React, { useEffect, useMemo, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://api.fortislab.id";

/* ========== TYPES ========== */
type Bahan = {
  id: string;
  nama_bahan: string;
  satuan?: string | null;
  harga?: number | null;
  purchase_qty?: number | null;
  purchase_unit?: string | null;
  created_at?: string;
};

/* ========== UTILS ========== */
function getOwnerId(): string | null {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem("owner_id");
  return v && v !== "" ? v : null;
}
function useToast() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 3500);
    return () => clearTimeout(t);
  }, [msg]);
  const Toast = () =>
    msg ? (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-2xl bg-black/80 text-white px-4 py-2 text-sm shadow-lg z-50">
        {msg}
      </div>
    ) : null;
  return { setMsg, Toast };
}
function useDebounce<T>(v: T, d = 400) {
  const [x, setX] = useState(v);
  useEffect(() => {
    const t = setTimeout(() => setX(v), d);
    return () => clearTimeout(t);
  }, [v, d]);
  return x;
}
function clean(obj: Record<string, any>) {
  const o: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== "" && v !== null && v !== undefined) o[k] = v;
  }
  return o;
}
async function readErr(res: Response) {
  try {
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("json")) {
      const j = await res.json();
      return j?.message || j?.error || j?.detail || JSON.stringify(j);
    }
    const t = await res.text();
    return t || `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status}`;
  }
}
const j = (x: any) => JSON.stringify(x);
function currency(n?: number | null) {
  if (n == null) return "-";
  try {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `Rp ${Math.round(n).toLocaleString("id-ID")}`;
  }
}

/* ========== PRIMS ========== */
function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const f = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) addEventListener("keydown", f);
    return () => removeEventListener("keydown", f);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(720px,95vw)]">
        <div className="rounded-3xl bg-white shadow-[0_20px_60px_rgba(0,0,0,0.25)] p-6 md:p-7">
          <div className="flex items-start justify-between mb-4 md:mb-6">
            <h3 className="text-2xl md:text-[26px] font-bold tracking-tight">
              {title}
            </h3>
            <button
              onClick={onClose}
              className="rounded-full p-2 hover:bg-black/5"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

/* — Konfirmasi Hapus — */
function ConfirmDeleteModal({
  open,
  name,
  onCancel,
  onConfirm,
  loading,
}: {
  open: boolean;
  name?: string;
  onCancel: () => void;
  onConfirm: () => void;
  loading?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-black/50" />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(640px,92vw)]">
        <div className="rounded-3xl bg-white shadow-2xl p-6 md:p-8 text-center">
          <div className="text-[22px] md:text-[26px] font-extrabold leading-snug">
            Yakin Ingin Menghapus
            <br />
            Bahan ini?
          </div>
          <div className="mt-4 text-base md:text-lg text-black/70 font-medium">
            {name || "-"}
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              onClick={onCancel}
              disabled={loading}
              className="rounded-2xl border border-gray-300 px-5 py-3 font-semibold hover:bg-black/5 disabled:opacity-60"
            >
              Batal
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="rounded-2xl bg-red-700 text-white px-5 py-3 font-semibold shadow hover:bg-red-800 active:scale-[.99] disabled:opacity-60"
            >
              {loading ? "Menghapus…" : "Hapus!"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* --------- Form --------- */
function BahanForm({
  initial,
  submitting,
  onSubmit,
}: {
  initial?: Partial<Bahan>;
  submitting: boolean;
  onSubmit: (p: Partial<Bahan>) => Promise<void>;
}) {
  const [nama_bahan, setNama] = useState(initial?.nama_bahan ?? "");
  const [harga, setHarga] = useState(
    initial?.harga != null ? String(initial.harga) : ""
  );
  const [purchase_qty, setQty] = useState(
    initial?.purchase_qty != null ? String(initial.purchase_qty) : ""
  );
  // sinkronisasi unit: tampilkan prioritas purchase_unit → satuan
  const initialUnit = (initial?.purchase_unit || initial?.satuan || "") + "";
  const [satuan, setSatuan] = useState(initial?.satuan ?? initialUnit);
  const [purchase_unit, setUnit] = useState(initial?.purchase_unit ?? initialUnit);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const unit = (purchase_unit || satuan || "").toString().trim().toLowerCase();
        await onSubmit({
          nama_bahan,
          harga: harga ? Number(harga) : undefined,
          purchase_qty: purchase_qty ? Number(purchase_qty) : undefined,
          // kirim dua-duanya konsisten (biar BE mana pun happy)
          purchase_unit: unit || undefined,
          satuan: unit || undefined,
        });
      }}
      className="space-y-5"
    >
      <div className="space-y-4">
        <label className="flex flex-col gap-2">
          <span className="text-[15px] font-medium">Nama Bahan</span>
          <input
            required
            value={nama_bahan}
            onChange={(e) => setNama(e.target.value)}
            className="rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-red-200"
            placeholder="ex : kopi arabika"
          />
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-[15px] font-medium">Harga Beli</span>
            <input
              type="number"
              min={0}
              value={harga}
              onChange={(e) => setHarga(e.target.value)}
              className="rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-red-200"
              placeholder="ex : 50000"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-[15px] font-medium">Volume</span>
            <input
              type="number"
              min={0}
              value={purchase_qty}
              onChange={(e) => setQty(e.target.value)}
              className="rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-red-200"
              placeholder="ex : 100"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-[15px] font-medium">Satuan</span>
            <input
              value={purchase_unit || satuan}
              onChange={(e) => {
                const v = e.target.value;
                setUnit(v);
                setSatuan((prev) => prev || v); // kalau kosong, sync ke satuan
              }}
              className="rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-red-200"
              placeholder="ml / g / pcs"
            />
          </label>
        </div>
      </div>
      <div className="pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-2xl bg-red-700 text-white px-5 py-3 font-semibold shadow hover:bg-red-800 active:scale-[.99] disabled:opacity-60 transition"
        >
          {submitting ? "Menyimpan…" : "Simpan Bahan"}
        </button>
      </div>
    </form>
  );
}

/* ========== PAGE ========== */
export default function BahanTab() {
  const { setMsg, Toast } = useToast();
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [items, setItems] = useState<Bahan[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const dq = useDebounce(q, 400);
  const [openAdd, setOpenAdd] = useState(false);
  const [editItem, setEditItem] = useState<Bahan | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // modal hapus kustom
  const [deleteTarget, setDeleteTarget] = useState<Bahan | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setOwnerId(getOwnerId());
  }, []);

  async function fetchList() {
    if (!ownerId) return;
    try {
      setLoading(true);
      const res = await fetch(
        `${API_BASE}/setup/bahan?owner_id=${encodeURIComponent(
          ownerId
        )}&limit=1000&offset=0`,
        {
          headers: { "x-owner-id": ownerId, "Cache-Control": "no-cache" },
        }
      );
      if (!res.ok) throw new Error(`Fetch gagal: ${res.status}`);
      const data = await res.json();
      // normalisasi ringan (pastikan purchase_unit/satuan terisi)
      const arr: Bahan[] = (Array.isArray(data?.data) ? data.data : data).map((x: any) => ({
        id: x.id || x.uuid,
        nama_bahan: x.nama_bahan ?? x.nama ?? "",
        harga: typeof x.harga === "number" ? x.harga : Number(x.harga ?? 0),
        purchase_qty: typeof x.purchase_qty === "number" ? x.purchase_qty : Number(x.purchase_qty ?? x.qty ?? 0),
        purchase_unit: (x.purchase_unit || x.volume_unit || x.satuan || x.unit || "") + "",
        satuan: (x.satuan || x.purchase_unit || "") + "",
        created_at: x.created_at,
      }));
      setItems(arr);
    } catch (e: any) {
      console.error(e);
      setMsg(e?.message || "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    fetchList();
  }, [ownerId]);

  const filtered = useMemo(() => {
    const s = dq.trim().toLowerCase();
    if (!s) return items;
    return items.filter(
      (it) =>
        (it.nama_bahan || "").toLowerCase().includes(s) ||
        (it.satuan || "").toLowerCase().includes(s) ||
        (it.purchase_unit || "").toLowerCase().includes(s)
    );
  }, [items, dq]);

  function isNameDuplicate(name: string, exceptId?: string) {
    const n = (name || "").trim().toLowerCase();
    if (!n) return false;
    return items.some(
      (it) => (it.nama_bahan || "").toLowerCase() === n && it.id !== exceptId
    );
  }

  /* ===== CREATE ===== */
  async function createBahan(p: Partial<Bahan>) {
    if (!ownerId) return;
    if (isNameDuplicate(p.nama_bahan || "")) {
      setMsg("Nama bahan sudah ada untuk owner ini.");
      return;
    }
    const unit = (p.purchase_unit || p.satuan || "").toString().trim().toLowerCase();
    const body = clean({
      nama_bahan: (p.nama_bahan || "").trim(),
      nama: (p.nama_bahan || "").trim(),
      harga: typeof p.harga === "number" ? p.harga : undefined,
      purchase_qty:
        typeof p.purchase_qty === "number" ? p.purchase_qty : undefined,
      purchase_unit: unit || undefined,
      satuan: unit || undefined,
      owner_id: ownerId,
    });
    try {
      setSubmitting(true);
      const res = await fetch(
        `${API_BASE}/setup/bahan?owner_id=${encodeURIComponent(ownerId)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-owner-id": ownerId },
          body: j(body),
        }
      );
      if (!res.ok) {
        const why = await readErr(res);
        if (/duplicate/i.test(why) || res.status === 409)
          throw new Error("Nama bahan sudah ada untuk owner ini.");
        throw new Error(`POST gagal: ${why}`);
      }
      setMsg("Bahan ditambahkan");
      setOpenAdd(false);
      await fetchList();
    } catch (e: any) {
      console.error(e);
      setMsg(e?.message || "Gagal menambah bahan");
    } finally {
      setSubmitting(false);
    }
  }

  /* ===== UPDATE (POST-first → PUT/PATCH fallback) ===== */
  async function updateBahan(id: string, p: Partial<Bahan>) {
    if (!ownerId) return;
    if (isNameDuplicate(p.nama_bahan || "", id)) {
      setMsg("Nama bahan sudah ada untuk owner ini.");
      return;
    }
    const unit = (p.purchase_unit || p.satuan || "").toString().trim().toLowerCase();
    const base = clean({
      id,
      owner_id: ownerId,
      nama_bahan: p.nama_bahan ? p.nama_bahan.trim() : undefined,
      nama: p.nama_bahan ? p.nama_bahan.trim() : undefined,
      harga: typeof p.harga === "number" ? p.harga : undefined,
      purchase_qty:
        typeof p.purchase_qty === "number" ? p.purchase_qty : undefined,
      purchase_unit: unit || undefined,
      satuan: unit || undefined,
    });

    const tries: Array<{ url: string; body: any }> = [
      {
        url: `${API_BASE}/setup/bahan/update?owner_id=${encodeURIComponent(
          ownerId
        )}`,
        body: base,
      },
      {
        url: `${API_BASE}/setup/bahan/${id}/update?owner_id=${encodeURIComponent(
          ownerId
        )}`,
        body: base,
      },
      {
        url: `${API_BASE}/setup/bahan?owner_id=${encodeURIComponent(ownerId)}`,
        body: { _action: "update", ...base },
      },
      {
        url: `${API_BASE}/setup/bahan/${id}?owner_id=${encodeURIComponent(
          ownerId
        )}`,
        body: { _method: "PUT", ...base },
      },
    ];

    try {
      setSubmitting(true);
      for (const t of tries) {
        try {
          const r = await fetch(t.url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-owner-id": ownerId!,
            },
            body: j(t.body),
          });
          if (r.ok) {
            setMsg("Perubahan disimpan");
            setEditItem(null);
            await fetchList();
            return;
          }
          if (![404, 405].includes(r.status)) {
            const why = await readErr(r);
            if (/duplicate/i.test(why) || r.status === 409)
              throw new Error("Nama bahan sudah ada untuk owner ini.");
            throw new Error(`Update gagal: ${why}`);
          }
        } catch {
          /* lanjut */
        }
      }
      // PUT/PATCH (fallback terakhir)
      for (const method of ["PUT", "PATCH"] as const) {
        const r = await fetch(
          `${API_BASE}/setup/bahan/${id}?owner_id=${encodeURIComponent(
            ownerId!
          )}`,
          {
            method,
            headers: {
              "Content-Type": "application/json",
              "x-owner-id": ownerId!,
            },
            body: j(base),
          }
        );
        if (r.ok) {
          setMsg("Perubahan disimpan");
          setEditItem(null);
          await fetchList();
          return;
        }
        if (![404, 405].includes(r.status)) {
          const why = await readErr(r);
          if (/duplicate/i.test(why) || r.status === 409)
            throw new Error("Nama bahan sudah ada untuk owner ini.");
          throw new Error(`Update gagal: ${why}`);
        }
      }
      throw new Error("Network/CORS saat update (semua fallback gagal).");
    } catch (e: any) {
      console.error(e);
      setMsg(e?.message || "Gagal menyimpan perubahan");
    } finally {
      setSubmitting(false);
    }
  }

  /* ===== DELETE: POST-only first + optimistic UI ===== */
  async function reallyDelete(id: string) {
    if (!ownerId) return;
    const tries = [
      {
        url: `${API_BASE}/setup/bahan/delete?owner_id=${encodeURIComponent(
          ownerId
        )}`,
        body: { id, owner_id: ownerId },
      },
      {
        url: `${API_BASE}/setup/bahan/${id}/delete?owner_id=${encodeURIComponent(
          ownerId
        )}`,
        body: { owner_id: ownerId },
      },
      {
        url: `${API_BASE}/setup/bahan?owner_id=${encodeURIComponent(ownerId)}`,
        body: { _action: "delete", id, owner_id: ownerId },
      },
      {
        url: `${API_BASE}/setup/bahan/${id}?owner_id=${encodeURIComponent(
          ownerId
        )}`,
        body: { _method: "DELETE", id, owner_id: ownerId },
      },
    ];
    for (const t of tries) {
      try {
        const r = await fetch(t.url, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-owner-id": ownerId! },
          body: j(t.body),
        });
        if (r.ok) return;
        if (![404, 405].includes(r.status)) {
          const why = await readErr(r);
          throw new Error(`Delete gagal: ${why}`);
        }
      } catch {
        /* lanjut */
      }
    }
    // terakhir: DELETE asli
    const r = await fetch(
      `${API_BASE}/setup/bahan/${id}?owner_id=${encodeURIComponent(ownerId)}`,
      { method: "DELETE", headers: { "x-owner-id": ownerId! } }
    );
    if (!r.ok) throw new Error(`Delete gagal: ${await readErr(r)}`);
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    try {
      setDeleting(true);
      await reallyDelete(id);
      // OPTIMISTIC UPDATE
      setItems((prev) => prev.filter((x) => x.id !== id));
      setMsg("Bahan dihapus");
      setDeleteTarget(null);
      // Sync ulang dari server
      await fetchList();
    } catch (e: any) {
      console.error(e);
      setMsg(e?.message || "Gagal menghapus");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Toast />
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => setOpenAdd(true)}
          className="rounded-2xl bg-red-700 text-white px-4 py-2 shadow hover:bg-red-800 active:scale-[.99] transition"
        >
          Tambah Bahan +
        </button>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ex : kopi arabika"
          className="rounded-2xl border px-3 py-2 outline-none focus:ring-2 focus:ring-black/10 w-64"
        />
      </div>

      <div className="rounded-2xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left">
              <th className="px-4 py-3">Nama Bahan</th>
              <th className="px-4 py-3">Harga</th>
              <th className="px-4 py-3">Volume</th>
              <th className="px-4 py-3">Satuan</th>
              <th className="px-4 py-3 w-32">Edit/Hapus</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-10 text-center" colSpan={5}>
                  Memuat…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td
                  className="px-4 py-12 text-center text-gray-500"
                  colSpan={5}
                >
                  Belum ada data.
                </td>
              </tr>
            ) : (
              filtered.map((it) => (
                <tr key={it.id} className="border-t hover:bg-gray-50/60">
                  <td className="px-4 py-3 font-medium">{it.nama_bahan}</td>
                  <td className="px-4 py-3">{currency(it.harga)}</td>
                  <td className="px-4 py-3">{it.purchase_qty ?? 0}</td>
                  {/* ⬇️ bukan hard-code "g", dinamis dari purchase_unit/satuan */}
                  <td className="px-4 py-3">{it.purchase_unit || it.satuan || "-"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditItem(it)}
                        className="rounded-lg px-2 py-1 border hover:bg-black/5"
                        aria-label="Edit"
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => setDeleteTarget(it)}
                        className="rounded-lg px-2 py-1 border hover:bg-red-50 text-red-600"
                        aria-label="Hapus"
                        title="Hapus"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      <Modal open={openAdd} onClose={() => setOpenAdd(false)} title="Tambah Bahan">
        <BahanForm submitting={submitting} onSubmit={createBahan} />
      </Modal>
      <Modal
        open={!!editItem}
        onClose={() => setEditItem(null)}
        title={`Edit: ${editItem?.nama_bahan ?? ""}`}
      >
        {editItem && (
          <BahanForm
            initial={editItem}
            submitting={submitting}
            onSubmit={(p) => updateBahan(editItem.id, p)}
          />
        )}
      </Modal>

      {/* Modal Hapus kustom */}
      <ConfirmDeleteModal
        open={!!deleteTarget}
        name={deleteTarget?.nama_bahan}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        loading={deleting}
      />
    </div>
  );
}
