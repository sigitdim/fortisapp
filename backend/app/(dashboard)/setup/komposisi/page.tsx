"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

/* ========= Types ========= */
type Product = { id: string; nama_produk: string };
type BahanLite = { id: string; nama_bahan: string; satuan: string | null };
type KomposisiRow = {
  id: string;
  produk_id: string;
  bahan_id: string;
  qty: number;
  unit: string;
  // join (alias "bahan")
  bahan?: { id: string; nama_bahan: string; satuan: string | null };
};

/* ========= Helpers ========= */
const nf = (n: number | null | undefined) => {
  if (n == null) return "-";
  const val = Number(n);
  return Number.isFinite(val) ? val.toString() : "-";
};

/* ========= Page ========= */
export default function KomposisiPage() {
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [produkList, setProdukList] = useState<Product[]>([]);
  const [produkId, setProdukId] = useState<string>("");

  const [bahanList, setBahanList] = useState<BahanLite[]>([]);
  const [rows, setRows] = useState<KomposisiRow[]>([]);

  // create form
  const [bahanId, setBahanId] = useState("");
  const [qty, setQty] = useState<number>(1);
  const [unit, setUnit] = useState<string>("gr");

  // inline edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftQty, setDraftQty] = useState<number>(1);
  const [draftUnit, setDraftUnit] = useState<string>("gr");

  const toast = (t: string, isErr = false) => {
    isErr ? setErr(t) : setMsg(t);
    setTimeout(() => {
      setMsg(null);
      setErr(null);
    }, 2000);
  };

  const loadInit = async () => {
    setLoading(true);
    setErr(null);
    try {
      // RLS akan otomatis filter by owner
      const [{ data: produk }, { data: bahan }] = await Promise.all([
        supabase.from("produk").select("id,nama_produk").order("nama_produk", { ascending: true }),
        supabase.from("bahan").select("id,nama_bahan,satuan").order("nama_bahan", { ascending: true }),
      ]);
      setProdukList((produk ?? []) as Product[]);
      setBahanList((bahan ?? []) as BahanLite[]);
    } catch (e: any) {
      setErr(e.message ?? "Gagal memuat master data");
    } finally {
      setLoading(false);
    }
  };

  const loadRows = async (pid: string) => {
    if (!pid) {
      setRows([]);
      return;
    }
    setErr(null);
    try {
      const { data, error } = await supabase
        .from("komposisi")
        .select("id,produk_id,bahan_id,qty,unit,bahan:bahan_id(id,nama_bahan,satuan)")
        .eq("produk_id", pid)
        .order("id", { ascending: true });
      if (error) throw error;
      setRows((data ?? []) as any);
    } catch (e: any) {
      setErr(e.message ?? "Gagal memuat komposisi");
    }
  };

  useEffect(() => {
    loadInit();
  }, []);
  useEffect(() => {
    loadRows(produkId);
    // reset form saat ganti produk
    setBahanId("");
    setQty(1);
    setUnit("gr");
    setEditingId(null);
  }, [produkId]);

  /* ======== Create ======== */
  const onSelectBahan = (id: string) => {
    setBahanId(id);
    const b = bahanList.find((x) => x.id === id);
    if (b?.satuan) setUnit(b.satuan);
  };

  const addKomposisi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!produkId || !bahanId) return toast("Pilih produk & bahan.", true);
    if (qty <= 0) return toast("Qty harus > 0", true);

    // cegah duplikat bahan dalam produk yang sama
    const already = rows.some((r) => r.bahan_id === bahanId);
    if (already) return toast("Bahan sudah ada di komposisi produk ini.", true);

    try {
      setLoading(true);
      const { error } = await supabase
        .from("komposisi")
        .insert([{ produk_id: produkId, bahan_id: bahanId, qty, unit }]);
      if (error) throw error;

      toast("Komposisi ditambahkan");
      setBahanId("");
      setQty(1);
      setUnit("gr");
      await loadRows(produkId);
    } catch (e: any) {
      toast(e.message ?? "Gagal menambah komposisi", true);
    } finally {
      setLoading(false);
    }
  };

  /* ======== Inline edit ======== */
  const startEdit = (r: KomposisiRow) => {
    setEditingId(r.id);
    setDraftQty(r.qty);
    setDraftUnit(r.unit);
  };

  const saveEdit = async (id: string) => {
    if (draftQty <= 0) return toast("Qty harus > 0", true);
    try {
      setLoading(true);
      const { error } = await supabase
        .from("komposisi")
        .update({ qty: draftQty, unit: draftUnit })
        .eq("id", id);
      if (error) throw error;
      toast("Perubahan disimpan");
      setEditingId(null);
      await loadRows(produkId);
    } catch (e: any) {
      toast(e.message ?? "Gagal menyimpan", true);
    } finally {
      setLoading(false);
    }
  };

  /* ======== Delete ======== */
  const remove = async (id: string) => {
    const ok = confirm("Hapus baris komposisi ini?");
    if (!ok) return;
    try {
      setLoading(true);
      const { error } = await supabase.from("komposisi").delete().eq("id", id);
      if (error) throw error;
      toast("Baris dihapus");
      await loadRows(produkId);
    } catch (e: any) {
      toast(e.message ?? "Gagal menghapus", true);
    } finally {
      setLoading(false);
    }
  };

  const currentProduk = useMemo(
    () => produkList.find((p) => p.id === produkId)?.nama_produk ?? "",
    [produkList, produkId]
  );

  if (loading && produkList.length === 0) return <div className="p-6">Loading…</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Setup › Komposisi</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadRows(produkId)}
            disabled={!produkId || loading}
            className="rounded-lg border px-3 py-1 text-sm disabled:opacity-50"
          >
            {loading ? "Memuat..." : "Refresh"}
          </button>
        </div>
      </div>

      {msg && <div className="rounded-lg bg-green-100 p-3 text-sm">{msg}</div>}
      {err && <div className="rounded-lg bg-red-100 p-3 text-sm">{err}</div>}

      {/* PILIH PRODUK */}
      <section className="space-y-2">
        <label className="block text-sm font-semibold">Pilih Produk</label>
        <select
          className="border rounded p-2 w-full max-w-md"
          value={produkId}
          onChange={(e) => setProdukId(e.target.value)}
        >
          <option value="">— pilih —</option>
          {produkList.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nama_produk}
            </option>
          ))}
        </select>
        {produkId && (
          <p className="text-xs text-gray-500">
            Komposisi untuk: <b>{currentProduk}</b>
          </p>
        )}
      </section>

      {/* FORM TAMBAH */}
      <section className="border rounded-xl p-4">
        <h2 className="font-semibold mb-2">Tambah Komposisi</h2>
        <form onSubmit={addKomposisi} className="grid gap-3 md:grid-cols-4 md:items-end">
          <div className="md:col-span-2">
            <label className="block text-sm mb-1">Bahan</label>
            <select
              className="border rounded p-2 w-full"
              value={bahanId}
              disabled={!produkId || loading}
              onChange={(e) => onSelectBahan(e.target.value)}
              required
            >
              <option value="">— pilih bahan —</option>
              {bahanList.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nama_bahan} {b.satuan ? `(${b.satuan})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1">Qty</label>
            <input
              type="number"
              step="0.01"
              min={0.01}
              className="border rounded p-2 w-full"
              value={qty}
              disabled={!produkId || loading}
              onChange={(e) => setQty(Number(e.target.value))}
              required
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Unit</label>
            <input
              className="border rounded p-2 w-full"
              value={unit}
              disabled={!produkId || loading}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="gr / ml / pcs"
              required
            />
          </div>

          <div className="md:col-span-4">
            <button
              type="submit"
              className="rounded-lg px-4 py-2 bg-black text-white disabled:opacity-50"
              disabled={!produkId || !bahanId || qty <= 0 || loading}
            >
              Tambah
            </button>
          </div>
        </form>
      </section>

      {/* TABLE */}
      <section className="border rounded-xl overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-left">Bahan</th>
              <th className="p-3 text-left">Qty</th>
              <th className="p-3 text-left">Unit</th>
              <th className="p-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const isEditing = editingId === r.id;
              return (
                <tr key={r.id} className="border-t">
                  <td className="p-3">{r.bahan?.nama_bahan ?? r.bahan_id}</td>
                  <td className="p-3">
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.01"
                        min={0.01}
                        className="border rounded p-1 w-28"
                        value={draftQty}
                        onChange={(e) => setDraftQty(Number(e.target.value))}
                        disabled={loading}
                        autoFocus
                      />
                    ) : (
                      nf(r.qty)
                    )}
                  </td>
                  <td className="p-3">
                    {isEditing ? (
                      <input
                        className="border rounded p-1 w-28"
                        value={draftUnit}
                        onChange={(e) => setDraftUnit(e.target.value)}
                        disabled={loading}
                      />
                    ) : (
                      r.unit
                    )}
                  </td>
                  <td className="p-3 text-right space-x-2">
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => saveEdit(r.id)}
                          disabled={loading}
                          className="rounded-lg border px-3 py-1 text-xs"
                        >
                          Simpan
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          disabled={loading}
                          className="rounded-lg border px-3 py-1 text-xs"
                        >
                          Batal
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startEdit(r)}
                          disabled={loading}
                          className="rounded-lg border px-3 py-1 text-xs"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => remove(r.id)}
                          disabled={loading}
                          className="rounded-lg border px-3 py-1 text-xs"
                        >
                          Hapus
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td className="p-6 text-center text-gray-500" colSpan={4}>
                  {produkId ? "Belum ada komposisi untuk produk ini." : "Pilih produk terlebih dahulu."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
