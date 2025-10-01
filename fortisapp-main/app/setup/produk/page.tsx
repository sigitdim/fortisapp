"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { rupiah } from "@/lib/format";

type Produk = { id: string; nama_produk: string; harga_jual: number; created_at: string; };
type RowBiaya = { produk_id: string; nama_produk: string; biaya_bahan: number };

export default function ProdukPage() {
  const [items, setItems] = useState<Produk[]>([]);
  const [biaya, setBiaya] = useState<Record<string, number>>({});
  const [nama, setNama] = useState("");
  const [harga, setHarga] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setErr(null);
    const { data, error } = await supabase.from("produk").select("*").order("created_at", { ascending: false });
    if (!error) setItems((data as Produk[]) ?? []); else setErr(error.message);

    const v = await supabase.from("v_biaya_produk").select("*");
    if (!v.error) {
      const map: Record<string, number> = {};
      (v.data as RowBiaya[]).forEach(r => { map[r.produk_id] = Number(r.biaya_bahan) || 0; });
      setBiaya(map);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = nama.trim(); const h = Number(harga);
    if (!n || !Number.isFinite(h) || h < 0) return;
    setLoading(true);
    const { error } = await supabase.from("produk").insert([{ nama_produk: n, harga_jual: h }]);
    setLoading(false);
    if (!error) { setNama(""); setHarga(""); load(); } else setErr(error.message);
  };

  const del = async (id: string) => {
    setErr(null);
    const { error } = await supabase.from("produk").delete().eq("id", id);
    if (!error) load(); else setErr(error.message);
  };

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold mb-4">Setup Produk</h1>

      <form onSubmit={add} className="grid grid-cols-2 gap-3 mb-6">
        <input className="border rounded p-2 col-span-2" placeholder="nama_produk"
               value={nama} onChange={e => setNama(e.target.value)} />
        <input className="border rounded p-2" type="number" min={0} placeholder="harga_jual"
               value={harga} onChange={e => setHarga(e.target.value)} />
        <button className="border rounded p-2 font-semibold col-span-2" disabled={loading}>
          {loading ? "Menyimpan..." : "Tambah"}
        </button>
      </form>

      {err && <p className="text-red-600 mb-3">Error: {err}</p>}
      {loading && <p className="text-sm text-neutral-500">Memuat…</p>}
      {!loading && items.length === 0 && <p className="text-sm text-neutral-500">Belum ada produk.</p>}

      <div className="space-y-2">
        {items.map(p => {
          const biayaBahan = biaya[p.id] ?? 0;
          const laba = Number(p.harga_jual) - biayaBahan;
          const pers = p.harga_jual ? Math.round((laba / Number(p.harga_jual)) * 100) : 0;
          return (
            <div key={p.id} className="border rounded p-3 flex items-center justify-between">
              <div>
                <div className="font-medium">{p.nama_produk}</div>
                <div className="text-sm">
                  Harga jual: {rupiah(p.harga_jual)} — Biaya bahan: {rupiah(biayaBahan)} — Laba: <b>{rupiah(laba)}</b> ({pers}%)
                </div>
              </div>
              <div className="flex gap-2">
                <a href={`/setup/resep/${p.id}`} className="border px-3 py-1 rounded text-sm">Atur Resep</a>
                <button onClick={() => del(p.id)} className="border px-3 py-1 rounded text-sm">Hapus</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
