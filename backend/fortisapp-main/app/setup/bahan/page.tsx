"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";   // pakai relatif dulu
import { rupiah } from "../../../lib/format";             // kalau dipakai


type Bahan = {
  id: string;
  created_at: string;
  nama_bahan: string;
  satuan: string;
  harga: number;
};

export default function SetupBahanPage() {
  const [items, setItems] = useState<Bahan[]>([]);
  const [nama, setNama] = useState("");
  const [satuan, setSatuan] = useState("gram");
  const [harga, setHarga] = useState<string>("");

  const [editing, setEditing] = useState<Bahan | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("bahan")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) setErr(error.message);
    else setItems((data as Bahan[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setMsg(null);
    const hargaNum = Number(harga);
    if (!nama.trim() || !satuan.trim() || !Number.isFinite(hargaNum) || hargaNum < 0) {
      setErr("Isi nama_bahan & satuan, dan pastikan harga angka ≥ 0."); return;
    }
    setLoading(true);
    const { error } = await supabase.from("bahan").insert([{ nama_bahan: nama.trim(), satuan: satuan.trim(), harga: hargaNum }]);
    setLoading(false);
    if (error) setErr(error.message);
    else { setMsg("Berhasil menambah bahan."); setNama(""); setSatuan("gram"); setHarga(""); load(); }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const hargaNum = Number(editing.harga);
    if (!editing.nama_bahan.trim() || !editing.satuan.trim() || !Number.isFinite(hargaNum) || hargaNum < 0) {
      setErr("Form edit: nama_bahan/satuan wajib, harga angka ≥ 0."); return;
    }
    const { error } = await supabase.from("bahan")
      .update({ nama_bahan: editing.nama_bahan.trim(), satuan: editing.satuan.trim(), harga: hargaNum })
      .eq("id", editing.id);
    if (error) setErr(error.message);
    else { setMsg("Berhasil update."); setEditing(null); load(); }
  };

  const del = async (id: string) => {
    setErr(null); setMsg(null);
    const { error } = await supabase.from("bahan").delete().eq("id", id);
    if (error) setErr(error.message); else { setMsg("Berhasil hapus."); load(); }
  };

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold mb-4">Setup Bahan</h1>

      <form onSubmit={add} className="grid grid-cols-2 gap-3 mb-6">
        <input className="border rounded p-2 col-span-2" placeholder="nama_bahan (mis. Gula)"
               value={nama} onChange={e => { setNama(e.target.value); setErr(null); }} />
        <input className="border rounded p-2" placeholder="satuan (mis. gram/ml/pcs)"
               value={satuan} onChange={e => { setSatuan(e.target.value); setErr(null); }} />
        <input className="border rounded p-2" placeholder="harga (mis. 25000)"
               type="number" min={0} value={harga}
               onChange={e => { setHarga(e.target.value); setErr(null); }} />
        <button className="border rounded p-2 font-semibold col-span-2" disabled={loading}>
          {loading ? "Menyimpan..." : "Tambah"}
        </button>
      </form>

      {err && <p className="text-red-600 mb-3">Error: {err}</p>}
      {msg && <p className="text-green-700 mb-3">{msg}</p>}
      {loading && <p className="text-sm text-neutral-500">Memuat…</p>}
      {!loading && items.length === 0 && <p className="text-sm text-neutral-500">Belum ada data.</p>}

      <div className="space-y-3">
        {items.map(b => (
          <div key={b.id} className="border rounded p-3">
            {editing?.id === b.id ? (
              <form onSubmit={save} className="grid grid-cols-4 gap-2">
                <input className="border rounded p-2 col-span-2"
                       value={editing.nama_bahan}
                       onChange={e => setEditing({ ...editing!, nama_bahan: e.target.value })}/>
                <input className="border rounded p-2"
                       value={editing.satuan}
                       onChange={e => setEditing({ ...editing!, satuan: e.target.value })}/>
                <input className="border rounded p-2" type="number" min={0}
                       value={editing.harga as unknown as number}
                       onChange={e => setEditing({ ...editing!, harga: Number(e.target.value) })}/>
                <div className="col-span-4 flex gap-2">
                  <button className="border px-3 py-1 rounded text-sm">Simpan</button>
                  <button type="button" className="border px-3 py-1 rounded text-sm" onClick={() => setEditing(null)}>Batal</button>
                </div>
              </form>
            ) : (
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium">{b.nama_bahan}</div>
                  <div className="text-sm">{rupiah(b.harga)} per {b.satuan}</div>
                </div>
                <div className="flex gap-2">
                  <button className="border px-3 py-1 rounded text-sm" onClick={() => { setEditing(b); setErr(null); setMsg(null); }}>Edit</button>
                  <button className="border px-3 py-1 rounded text-sm" onClick={() => del(b.id)}>Hapus</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
