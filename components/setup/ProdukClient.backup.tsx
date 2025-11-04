// @ts-nocheck
"use client";
import { useEffect, useMemo, useState } from "react";
import { listProduk, upsertProduk, type Produk } from "@/lib/products";

type UpsertBody = Partial<Produk> & { id?: string };

export default function ProdukClient() {
  const [rows, setRows] = useState<Produk[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [editId, setEditId] = useState<string | null>(null);
  const [nama, setNama] = useState("");
  const [kategori, setKategori] = useState("");
  const [harga, setHarga] = useState<string>("");

  async function load() {
    setLoading(true); setErr(null);
    try { const json = await listProduk(); setRows(json.data || []); }
    catch (e:any) { setErr(e?.message || String(e)); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  function resetForm(){ setEditId(null); setNama(""); setKategori(""); setHarga(""); }

async function onSubmit(e: React.FormEvent) {
  e.preventDefault();

  // cari row yang sedang diedit (kalau ada)
  const current = editId ? rows.find((r) => r.id === editId) : undefined;

  // pastikan nama SELALU ada: ambil dari input, kalau kosong ambil dari row
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

  const body = {
    id: editId || undefined,                       // ada id = UPDATE (Supabase)
    nama: finalNama,                               // SELALU kirim nama
    kategori: (kategori || "").trim() || null,
    harga_jual_user: harga ? Number(harga) : null,
  };

  try {
    const res = await upsertProduk(body);          // UPDATE ke Supabase
    await load();
    resetForm();
    alert(`Saved: ${res.data?.nama ?? finalNama}`);
  } catch (e: any) {
    alert(e?.message || String(e));
  }
