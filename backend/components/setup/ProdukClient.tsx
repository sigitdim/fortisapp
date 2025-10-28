// components/setup/ProdukClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { upsertProduk, listProduk } from "@/lib/products"; // asumsi fungsi sudah ada

type Produk = {
  id: string;
  nama: string;
  kategori: string | null;
  harga_jual_user: number | null;
};

type Body = {
  id?: string;
  nama: string;
  kategori?: string | null;
  harga_jual_user?: number | null;
};

export default function ProdukClient() {
  // ====== state ======
  const [rows, setRows] = useState<Produk[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // form
  const [editId, setEditId] = useState<string | null>(null);
  const [nama, setNama] = useState("");
  const [kategori, setKategori] = useState<string | null>(null);
  const [harga, setHarga] = useState<string>("");

  // ====== helpers ======
  const resetForm = () => {
    setEditId(null);
    setNama("");
    setKategori(null);
    setHarga("");
  };

  const load = async () => {
    try {
      setLoading(true);
      setErr(null);
      const res = await listProduk(); // expected: { ok: boolean, data: Produk[] }
      if (!res?.ok) throw new Error("Gagal memuat produk");
      setRows(res.data || []);
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const current = useMemo(
    () => rows.find((r) => r.id === editId) || null,
    [rows, editId]
  );

  // ====== submit ======
  const onSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const finalNama =
      (nama || "").trim() ||
      (current?.nama as any) ||
      (current as any)?.nama_produk ||
      (current as any)?.name ||
      "";

    if (!finalNama) {
      alert("Nama produk wajib diisi");
      return;
    }

    const body: Body = {
      id: editId || undefined, // kalau ada -> update, kalau tidak -> insert
      nama: finalNama,
      kategori: (kategori || "").trim() || null,
      harga_jual_user: harga ? Number(harga) : null,
    };

    try {
      const res = await upsertProduk(body); // expected: { ok: boolean, data?: Produk }
      await load();
      resetForm();
      alert(`Saved: ${res?.data?.nama ?? finalNama}`);
    } catch (e: any) {
      alert(e?.message || String(e));
    }
  };

  // ====== UI ======
  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="rounded-xl border p-4 grid gap-3">
        <div className="grid gap-1">
          <label className="text-sm opacity-80">Nama Produk</label>
          <input
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            placeholder="Contoh: Kopi Susu"
            className="border rounded-lg px-3 py-2"
          />
        </div>

        <div className="grid gap-1">
          <label className="text-sm opacity-80">Kategori</label>
          <input
            value={kategori ?? ""}
            onChange={(e) => setKategori(e.target.value || null)}
            placeholder="Contoh: Minuman"
            className="border rounded-lg px-3 py-2"
          />
        </div>

        <div className="grid gap-1">
          <label className="text-sm opacity-80">Harga Jual (opsional)</label>
          <input
            value={harga}
            onChange={(e) => setHarga(e.target.value)}
            placeholder="e.g. 25000"
            inputMode="numeric"
            className="border rounded-lg px-3 py-2"
          />
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg px-4 py-2 bg-black text-white disabled:opacity-50"
          >
            {editId ? "Update Produk" : "Tambah Produk"}
          </button>
          {editId && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg px-4 py-2 border"
            >
              Batal
            </button>
          )}
        </div>
      </form>

      <div className="rounded-xl border">
        <div className="px-4 py-3 border-b font-medium">Daftar Produk</div>
        {err && <div className="p-4 text-red-600 text-sm">{err}</div>}
        {loading ? (
          <div className="p-4 text-sm opacity-70">Memuat...</div>
        ) : rows.length === 0 ? (
          <div className="p-4 text-sm opacity-70">Belum ada produk.</div>
        ) : (
          <ul className="divide-y">
            {rows.map((r) => (
              <li key={r.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="font-medium">{r.nama}</div>
                  <div className="text-xs opacity-70">
                    {r.kategori || "-"} • Harga: {r.harga_jual_user ?? "-"}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setEditId(r.id);
                    setNama(r.nama || "");
                    setKategori(r.kategori || null);
                    setHarga(r.harga_jual_user ? String(r.harga_jual_user) : "");
                    window?.scrollTo?.({ top: 0, behavior: "smooth" });
                  }}
                  className="text-sm underline"
                >
                  Edit
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
