"use client";

import React, { useEffect, useMemo, useState } from "react";

type OverheadItem = {
  id: string;
  nama: string;
  biaya?: number | null;
  durasi?: string | null; // ex: "Bulan"
  owner_id?: string | null;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "https://api.fortislab.id";

function rupiah(n?: number | null) {
  if (n == null) return "-";
  try {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
  } catch {
    return `Rp ${n}`;
  }
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={[
        "w-full rounded-xl border px-4 py-3 outline-none",
        "placeholder:text-gray-400",
        props.className || "",
      ].join(" ")}
    />
  );
}

function Modal({
  open, onClose, title, children,
}: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-[71] w-[720px] max-w-[92%] rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between">
          <h2 className="text-2xl font-extrabold">{title}</h2>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-gray-100" aria-label="Close">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function DangerConfirm({
  open, onCancel, onConfirm, name,
}: { open: boolean; onCancel: () => void; onConfirm: () => void; name: string }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative z-[81] w-[640px] max-w-[92%] rounded-2xl bg-white p-8 text-center shadow-2xl">
        <div className="mb-3 text-[22px] font-extrabold leading-snug">
          Yakin Ingin Menghapus Overhead?
        </div>
        <div className="mb-6 text-base text-gray-600">{name}</div>
        <div className="flex items-center justify-center gap-3">
          <button onClick={onCancel} className="min-w-[140px] rounded-xl border px-5 py-3 hover:bg-gray-50">Batal</button>
          <button onClick={onConfirm} className="min-w-[140px] rounded-xl bg-red-700 px-5 py-3 font-semibold text-white hover:bg-red-800">Hapus!</button>
        </div>
      </div>
    </div>
  );
}

export default function OverheadTab() {
  const [items, setItems] = useState<OverheadItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<OverheadItem | null>(null);
  const [form, setForm] = useState<{ nama: string; biaya: string; durasi: string }>({
    nama: "", biaya: "", durasi: "Bulan",
  });
  const [confirmDel, setConfirmDel] = useState<OverheadItem | null>(null);

  const ownerId = typeof window !== "undefined" ? localStorage.getItem("owner_id") || "" : "";

  async function fetchData() {
    if (!ownerId) return;
    setLoading(true);
    try {
      const url = `${API_BASE}/setup/overhead?owner_id=${encodeURIComponent(ownerId)}`;
      const r = await fetch(url, { headers: { "x-owner-id": ownerId }, cache: "no-store" });
      const j = await r.json();
      const list: OverheadItem[] = (j?.data || j || []).map((x: any) => ({
        id: x.id || x.uuid || "",
        nama: x.nama_overhead ?? x.nama ?? "",
        // normalisasi supaya angka gak nol padahal ada di kolom lain
        biaya: typeof x.biaya === "number" ? x.biaya
              : typeof x.biaya_bulanan === "number" ? x.biaya_bulanan
              : typeof x.cost === "number" ? x.cost : null,
        durasi: x.durasi || x.duration || "Bulan",
        owner_id: x.owner_id ?? null,
      }));
      setItems(list);
    } catch (e) {
      console.error(e);
      alert("Gagal memuat data overhead");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); /* eslint-disable-next-line */ }, [ownerId]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((it) => (it.nama || "").toLowerCase().includes(s));
  }, [q, items]);

  function openAdd() {
    setEditing(null);
    setForm({ nama: "", biaya: "", durasi: "Bulan" });
    setModalOpen(true);
  }

  function openEdit(it: OverheadItem) {
    setEditing(it);
    setForm({
      nama: it.nama || "",
      biaya: it.biaya != null ? String(it.biaya) : "",
      durasi: it.durasi || "Bulan",
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!ownerId) { alert("Owner belum dipilih."); return; }
    const payload = {
      nama: form.nama.trim(),
      biaya: Number(form.biaya || 0),
      durasi: form.durasi.trim() || "Bulan",
      owner_id: ownerId,
    };
    try {
      if (editing) {
        const r = await fetch(`${API_BASE}/setup/overhead/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", "x-owner-id": ownerId },
          body: JSON.stringify(payload),
        });
        if (!r.ok) throw new Error(await r.text());
      } else {
        const r = await fetch(`${API_BASE}/setup/overhead`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-owner-id": ownerId },
          body: JSON.stringify(payload),
        });
        if (!r.ok) throw new Error(await r.text());
      }
      setModalOpen(false);
      await fetchData();
    } catch (e: any) {
      console.error(e);
      alert(`Simpan gagal: ${e?.message || e}`);
    }
  }

  async function doDelete(it: OverheadItem) {
    try {
      const r = await fetch(`${API_BASE}/setup/overhead/${it.id}`, {
        method: "DELETE",
        headers: { "x-owner-id": ownerId },
      });
      if (!r.ok) throw new Error(await r.text());
      setConfirmDel(null);
      setItems((prev) => prev.filter((p) => p.id !== it.id));
    } catch (e: any) {
      console.error(e);
      alert(`Hapus gagal: ${e?.message || e}`);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <button onClick={openAdd} className="rounded-xl bg-red-700 px-5 py-3 font-semibold text-white hover:bg-red-800">
          Tambah Overhead +
        </button>
        <div className="flex-1" />
        <div className="w-[360px] max-w-full">
          <TextInput placeholder="ex : Listrik" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="bg-gray-50 text-left text-sm">
              <th className="border-b px-5 py-3 font-semibold">Nama Overhead</th>
              <th className="border-b px-5 py-3 font-semibold">Biaya</th>
              <th className="border-b px-5 py-3 font-semibold">Durasi</th>
              <th className="border-b px-5 py-3 font-semibold text-right">Edit/Hapus</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((it) => (
              <tr key={it.id} className="hover:bg-gray-50">
                <td className="border-b px-5 py-4">{it.nama}</td>
                <td className="border-b px-5 py-4">{rupiah(it.biaya)}</td>
                <td className="border-b px-5 py-4">{it.durasi || "-"}</td>
                <td className="border-b px-5 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <button className="rounded-lg border px-3 py-2 hover:bg-gray-50" onClick={() => openEdit(it)} title="Edit">✏️</button>
                    <button className="rounded-lg border px-3 py-2 hover:bg-gray-50" onClick={() => setConfirmDel(it)} title="Hapus">🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && (
              <tr><td className="px-5 py-6 text-center text-gray-500" colSpan={4}>Tidak ada data</td></tr>
            )}
            {loading && (
              <tr><td className="px-5 py-6 text-center text-gray-500" colSpan={4}>Memuat...</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? `Edit: ${editing.nama}` : "Tambah Overhead"}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-semibold">Nama Overhead</label>
            <TextInput value={form.nama} onChange={(e) => setForm((f) => ({ ...f, nama: e.target.value }))} placeholder="ex: Listrik" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold">Biaya</label>
            <TextInput inputMode="numeric" value={form.biaya} onChange={(e) => setForm((f) => ({ ...f, biaya: e.target.value.replace(/[^\d]/g, "") }))} placeholder="ex: 1200000" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold">Durasi</label>
            <TextInput value={form.durasi} onChange={(e) => setForm((f) => ({ ...f, durasi: e.target.value }))} placeholder="ex: Bulan" />
          </div>
          <div className="md:col-span-2 mt-2 flex items-center justify-end gap-3">
            <button onClick={() => setModalOpen(false)} className="rounded-xl border px-5 py-3 hover:bg-gray-50">Batal</button>
            <button onClick={handleSave} className="rounded-xl bg-red-700 px-5 py-3 font-semibold text-white hover:bg-red-800">Simpan</button>
          </div>
        </div>
      </Modal>

      <DangerConfirm open={!!confirmDel} name={confirmDel?.nama || ""} onCancel={() => setConfirmDel(null)} onConfirm={() => confirmDel && doDelete(confirmDel)} />
    </div>
  );
}
