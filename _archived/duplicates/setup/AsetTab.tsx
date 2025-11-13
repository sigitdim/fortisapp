"use client";

import React, { useEffect, useMemo, useState } from "react";

type AsetItem = {
  id: string;
  nama: string;
  kategori?: string | null;
  harga_beli?: number | null;
  waktu_beli?: string | null;       // mis. "06/23"
  nilai_ekonomis?: string | null;   // mis. "24 Bulan"
  status?: string | null;           // "Aktif" | "Non-Aktif" | "Rusak" (opsional)
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
      <div className="relative z-[71] w-[900px] max-w-[92%] rounded-2xl bg-white p-6 shadow-2xl">
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
          Yakin Ingin Menghapus Aset ini?
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

export default function AsetTab() {
  const [items, setItems] = useState<AsetItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AsetItem | null>(null);
  const [form, setForm] = useState<{
    nama: string; kategori: string; harga: string; waktu: string; nilai: string; status: string;
  }>({
    nama: "", kategori: "", harga: "", waktu: "", nilai: "", status: "Aktif",
  });
  const [confirmDel, setConfirmDel] = useState<AsetItem | null>(null);

  const ownerId = typeof window !== "undefined" ? localStorage.getItem("owner_id") || "" : "";

  async function fetchData() {
    if (!ownerId) return;
    setLoading(true);
    try {
      const url = `${API_BASE}/setup/aset?owner_id=${encodeURIComponent(ownerId)}`;
      const r = await fetch(url, { headers: { "x-owner-id": ownerId }, cache: "no-store" });
      const j = await r.json();
      const list: AsetItem[] = (j?.data || j || []).map((x: any) => ({
        id: x.id || x.uuid || "",
        nama: x.nama_aset ?? x.nama ?? "",
        kategori: x.kategori || x.category || null,
        harga_beli: typeof x.harga_beli === "number" ? x.harga_beli : typeof x.harga === "number" ? x.harga : null,
        waktu_beli: x.waktu_beli || x.tanggal_beli || null,
        nilai_ekonomis: x.nilai_ekonomis || x.masa_manfaat || null,
        status: x.status || null,
        owner_id: x.owner_id ?? null,
      }));
      setItems(list);
    } catch (e) {
      console.error(e);
      alert("Gagal memuat data aset");
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
    setForm({ nama: "", kategori: "", harga: "", waktu: "", nilai: "", status: "Aktif" });
    setModalOpen(true);
  }

  function openEdit(it: AsetItem) {
    setEditing(it);
    setForm({
      nama: it.nama || "",
      kategori: it.kategori || "",
      harga: it.harga_beli != null ? String(it.harga_beli) : "",
      waktu: it.waktu_beli || "",
      nilai: it.nilai_ekonomis || "",
      status: it.status || "Aktif",
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!ownerId) { alert("Owner belum dipilih."); return; }
    const payload = {
      nama: form.nama.trim(),
      kategori: form.kategori.trim() || null,
      harga_beli: Number(form.harga || 0),
      waktu_beli: form.waktu.trim() || null,
      nilai_ekonomis: form.nilai.trim() || null,
      status: form.status.trim() || null,
      owner_id: ownerId,
    };
    try {
      if (editing) {
        const r = await fetch(`${API_BASE}/setup/aset/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", "x-owner-id": ownerId },
          body: JSON.stringify(payload),
        });
        if (!r.ok) throw new Error(await r.text());
      } else {
        const r = await fetch(`${API_BASE}/setup/aset`, {
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

  async function doDelete(it: AsetItem) {
    try {
      const r = await fetch(`${API_BASE}/setup/aset/${it.id}`, {
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
          Tambah Aset +
        </button>
        <div className="flex-1" />
        <div className="w-[360px] max-w-full">
          <TextInput placeholder="ex : Mesin Espresso" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="bg-gray-50 text-left text-sm">
              <th className="border-b px-5 py-3 font-semibold">Nama Aset</th>
              <th className="border-b px-5 py-3 font-semibold">Kategori</th>
              <th className="border-b px-5 py-3 font-semibold">Harga Beli</th>
              <th className="border-b px-5 py-3 font-semibold">Waktu Beli</th>
              <th className="border-b px-5 py-3 font-semibold">Nilai Ekonomis</th>
              <th className="border-b px-5 py-3 font-semibold">Status</th>
              <th className="border-b px-5 py-3 font-semibold text-right">Edit/Hapus</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((it) => (
              <tr key={it.id} className="hover:bg-gray-50">
                <td className="border-b px-5 py-4">{it.nama}</td>
                <td className="border-b px-5 py-4">{it.kategori || "-"}</td>
                <td className="border-b px-5 py-4">{rupiah(it.harga_beli)}</td>
                <td className="border-b px-5 py-4">{it.waktu_beli || "-"}</td>
                <td className="border-b px-5 py-4">{it.nilai_ekonomis || "-"}</td>
                <td className="border-b px-5 py-4">{it.status || "-"}</td>
                <td className="border-b px-5 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <button className="rounded-lg border px-3 py-2 hover:bg-gray-50" onClick={() => openEdit(it)} title="Edit">✏️</button>
                    <button className="rounded-lg border px-3 py-2 hover:bg-gray-50" onClick={() => setConfirmDel(it)} title="Hapus">🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && (
              <tr><td className="px-5 py-6 text-center text-gray-500" colSpan={7}>Tidak ada data</td></tr>
            )}
            {loading && (
              <tr><td className="px-5 py-6 text-center text-gray-500" colSpan={7}>Memuat...</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? `Edit: ${editing.nama}` : "Tambah Aset"}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="md:col-span-3">
            <label className="mb-1 block text-sm font-semibold">Nama Aset</label>
            <TextInput value={form.nama} onChange={(e) => setForm((f) => ({ ...f, nama: e.target.value }))} placeholder="ex: Mesin Espresso" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold">Kategori</label>
            <TextInput value={form.kategori} onChange={(e) => setForm((f) => ({ ...f, kategori: e.target.value }))} placeholder="ex: Bar" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold">Harga Beli</label>
            <TextInput inputMode="numeric" value={form.harga} onChange={(e) => setForm((f) => ({ ...f, harga: e.target.value.replace(/[^\d]/g, "") }))} placeholder="ex: 1200000" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold">Waktu Beli</label>
            <TextInput value={form.waktu} onChange={(e) => setForm((f) => ({ ...f, waktu: e.target.value }))} placeholder="ex: 06/23" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold">Nilai Ekonomis</label>
            <TextInput value={form.nilai} onChange={(e) => setForm((f) => ({ ...f, nilai: e.target.value }))} placeholder="ex: 24 Bulan" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold">Status</label>
            <TextInput value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} placeholder="ex: Aktif" />
          </div>
          <div className="md:col-span-3 mt-2 flex items-center justify-end gap-3">
            <button onClick={() => setModalOpen(false)} className="rounded-xl border px-5 py-3 hover:bg-gray-50">Batal</button>
            <button onClick={handleSave} className="rounded-xl bg-red-700 px-5 py-3 font-semibold text-white hover:bg-red-800">Simpan</button>
          </div>
        </div>
      </Modal>

      <DangerConfirm open={!!confirmDel} name={confirmDel?.nama || ""} onCancel={() => setConfirmDel(null)} onConfirm={() => confirmDel && doDelete(confirmDel)} />
    </div>
  );
}
