"use client";

import React, { useEffect, useMemo, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://api.fortislab.id";

type Bahan = {
  id: string;
  nama_bahan: string;
  satuan?: string | null;
  harga?: number | null;
  purchase_qty?: number | null;
  purchase_unit?: string | null;
  created_at?: string;
};

function getOwnerId(): string | null {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem("owner_id");
  return v && v !== "" ? v : null;
}
function setOwnerId(v: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem("owner_id", v);
}

/* Toast mini */
function useToast() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 2200);
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

/* ================= Modal (sesuai figma) ================= */
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
  React.useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(720px,95vw)]">
        <div className="rounded-3xl bg-white shadow-[0_20px_60px_rgba(0,0,0,0.25)] p-6 md:p-7">
          <div className="flex items-start justify-between mb-4 md:mb-6">
            <h3 className="text-2xl md:text-[26px] font-bold tracking-tight">
              {title}
            </h3>
            <button
              onClick={onClose}
              className="rounded-full p-2 hover:bg-black/5 active:scale-95 transition"
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

/* ================= Form Tambah/Edit ================= */
function BahanForm({
  initial,
  submitting,
  onSubmit,
}: {
  initial?: Partial<Bahan>;
  submitting: boolean;
  onSubmit: (payload: Partial<Bahan>) => Promise<void>;
}) {
  const [nama_bahan, setNama] = useState(initial?.nama_bahan ?? "");
  const [harga, setHarga] = useState(
    initial?.harga != null ? String(initial.harga) : ""
  );
  const [purchase_qty, setQty] = useState(
    initial?.purchase_qty != null ? String(initial.purchase_qty) : ""
  );
  const [satuan, setSatuan] = useState(initial?.satuan ?? "");
  const [purchase_unit, setUnit] = useState(initial?.purchase_unit ?? "");

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        await onSubmit({
          nama_bahan,
          harga: harga ? Number(harga) : null,
          purchase_qty: purchase_qty ? Number(purchase_qty) : null,
          // simpan keduanya; FE tampilin purchase_unit, fallback ke satuan
          satuan,
          purchase_unit,
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
                setUnit(e.target.value);
                if (!satuan) setSatuan(e.target.value);
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

/* ================= Page ================= */
export default function PageSetupBahan() {
  const { setMsg, Toast } = useToast();
  const [ownerId, setOwnerIdState] = useState<string | null>(null);
  const [items, setItems] = useState<Bahan[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const dq = useDebounce(q, 400);

  const [openAdd, setOpenAdd] = useState(false);
  const [editItem, setEditItem] = useState<Bahan | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setOwnerIdState(getOwnerId());
  }, []);

  async function fetchList(currentOwner: string) {
    try {
      setLoading(true);
      const res = await fetch(
        `${API_BASE}/setup/bahan?owner_id=${encodeURIComponent(
          currentOwner
        )}&limit=1000&offset=0`,
        { headers: { "x-owner-id": currentOwner } }
      );
      if (!res.ok) throw new Error(`Fetch gagal: ${res.status}`);
      const data = await res.json();
      setItems(Array.isArray(data?.data) ? data.data : data);
    } catch (e: any) {
      console.error(e);
      setMsg(e?.message || "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (ownerId) fetchList(ownerId);
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

  async function createBahan(payload: Partial<Bahan>) {
    if (!ownerId) return;
    try {
      setSubmitting(true);
      const res = await fetch(`${API_BASE}/setup/bahan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-owner-id": ownerId,
        },
        body: JSON.stringify({ ...payload, owner_id: ownerId }),
      });
      if (!res.ok) throw new Error(`POST gagal: ${res.status}`);
      setMsg("Bahan ditambahkan");
      setOpenAdd(false);
      await fetchList(ownerId);
    } catch (e: any) {
      console.error(e);
      setMsg(e?.message || "Gagal menambah bahan");
    } finally {
      setSubmitting(false);
    }
  }
  async function updateBahan(id: string, payload: Partial<Bahan>) {
    if (!ownerId) return;
    try {
      setSubmitting(true);
      const res = await fetch(`${API_BASE}/setup/bahan/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-owner-id": ownerId,
        },
        body: JSON.stringify({ ...payload, owner_id: ownerId }),
      });
      if (!res.ok) throw new Error(`PUT gagal: ${res.status}`);
      setMsg("Perubahan disimpan");
      setEditItem(null);
      await fetchList(ownerId);
    } catch (e: any) {
      console.error(e);
      setMsg(e?.message || "Gagal menyimpan perubahan");
    } finally {
      setSubmitting(false);
    }
  }
  async function deleteBahan(id: string) {
    if (!ownerId) return;
    if (!confirm("Hapus bahan ini?")) return;
    try {
      const res = await fetch(
        `${API_BASE}/setup/bahan/${id}?owner_id=${ownerId}`,
        { method: "DELETE", headers: { "x-owner-id": ownerId } }
      );
      if (!res.ok) throw new Error(`DELETE gagal: ${res.status}`);
      setMsg("Bahan dihapus");
      await fetchList(ownerId);
    } catch (e: any) {
      console.error(e);
      setMsg(e?.message || "Gagal menghapus");
    }
  }

  if (!ownerId) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-2">Pilih Owner</h1>
        <p className="text-gray-600 mb-4">
          Owner belum diset. Masukkan <code>owner_id</code> untuk mulai
          menggunakan Setup Bahan.
        </p>
        <OwnerSetter
          onSet={(id) => {
            setOwnerId(id);
            setOwnerIdState(id);
            location.reload();
          }}
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <Toast />
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Setup · Bahan</h1>
          <p className="text-sm text-gray-600">
            Owner: <span className="font-mono">{ownerId}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ex : kopi arabika"
            className="rounded-2xl border px-3 py-2 outline-none focus:ring-2 focus:ring-black/10 w-64"
          />
          <button
            onClick={() => setOpenAdd(true)}
            className="rounded-2xl bg-red-700 text-white px-4 py-2 shadow hover:bg-red-800 active:scale-[.99] transition"
          >
            Tambah Bahan +
          </button>
        </div>
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
                <td className="px-4 py-12 text-center text-gray-500" colSpan={5}>
                  Belum ada data.
                </td>
              </tr>
            ) : (
              filtered.map((it) => (
                <tr key={it.id} className="border-t hover:bg-gray-50/60">
                  <td className="px-4 py-3 font-medium">{it.nama_bahan}</td>
                  <td className="px-4 py-3">
                    {it.harga != null ? formatRupiah(it.harga) : "-"}
                  </td>
                  <td className="px-4 py-3">{it.purchase_qty ?? 0}</td>
                  <td className="px-4 py-3">
                    {it.purchase_unit || it.satuan || "-"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditItem(it)}
                        className="rounded-lg px-2 py-1 border hover:bg-black/5"
                        aria-label="Edit"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => deleteBahan(it.id)}
                        className="rounded-lg px-2 py-1 border hover:bg-red-50 text-red-600"
                        aria-label="Hapus"
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

      {/* Modal Tambah */}
      <Modal open={openAdd} onClose={() => setOpenAdd(false)} title="Tambah Bahan">
        <BahanForm submitting={submitting} onSubmit={createBahan} />
      </Modal>

      {/* Modal Edit */}
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
    </div>
  );
}

/* Guard Owner */
function OwnerSetter({ onSet }: { onSet: (id: string) => void }) {
  const [v, setV] = useState("7b02d7a1-67aa-42fb-9e92-7cb74e34bdf1");
  return (
    <div className="flex items-end gap-2">
      <label className="flex-1 flex flex-col gap-1">
        <span className="text-sm text-gray-600">Owner ID</span>
        <input
          value={v}
          onChange={(e) => setV(e.target.value)}
          className="rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-black/10 w-[520px]"
        />
      </label>
      <button
        onClick={() => {
          if (!v.trim()) return;
          setOwnerId(v.trim());
          onSet(v.trim());
        }}
        className="rounded-xl bg-black text-white px-4 py-2 shadow hover:opacity-90"
      >
        Set Owner
      </button>
    </div>
  );
}

function formatRupiah(n: number) {
  try {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `Rp ${n}`;
  }
}
