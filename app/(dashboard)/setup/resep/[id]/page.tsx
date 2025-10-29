"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { rupiah } from "@/lib/format";

type Bahan = { id: string; nama_bahan: string; satuan: string; harga: number };
type Resep = { id: string; nama_resep: string };
type DetailRow = {
  id: string; resep_id: string; bahan_id: string;
  qty: number; unit: string; created_at: string;
  bahan?: Bahan | null;
};

export default function ResepDetailPage() {
  const p = useParams<{ id: string }>()! as { id: string } | null;
  const resepId = p?.id ?? "";
  const [resep, setResep] = useState<Resep | null>(null);
  const [bahanList, setBahanList] = useState<Bahan[]>([]);
  const [rows, setRows] = useState<DetailRow[]>([]);
  const [bahanId, setBahanId] = useState("");
  const [qty, setQty] = useState<string>("");
  const [unit, setUnit] = useState("gram");
  const [editing, setEditing] = useState<DetailRow | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    setErr(null);
    const r = await supabase.from("resep").select("id,nama_resep").eq("id", resepId).maybeSingle();
    if (!r.error) setResep(r.data as any);
    const b = await supabase.from("bahan").select("*").order("nama_bahan");
    if (!b.error) setBahanList((b.data as Bahan[]) ?? []);
    const d = await supabase.from("resep_detail")
      .select("*, bahan:bahan(*)")
      .eq("resep_id", resepId)
      .order("created_at", { ascending: false });
    if (d.error) setErr(d.error.message); else setRows((d.data as DetailRow[]) ?? []);
  };

  useEffect(() => { load(); }, [resepId]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(null); setMsg(null);
    const q = Number(qty);
    if (!bahanId || !Number.isFinite(q) || q <= 0) { setErr("Pilih bahan & isi qty > 0"); return; }
    const { error } = await supabase.from("resep_detail").insert([{ resep_id: resepId, bahan_id: bahanId, qty: q, unit }]);
    if (error) setErr(error.message);
    else { setBahanId(""); setQty(""); setUnit("gram"); setMsg("Item ditambah."); load(); }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const q = Number(editing.qty);
    if (!Number.isFinite(q) || q <= 0) { setErr("Qty harus angka > 0"); return; }
    const { error } = await supabase.from("resep_detail")
      .update({ qty: q, unit: editing.unit })
      .eq("id", editing.id);
    if (error) setErr(error.message);
    else { setEditing(null); setMsg("Item diupdate."); load(); }
  };

  const del = async (id: string) => {
    setErr(null); setMsg(null);
    const { error } = await supabase.from("resep_detail").delete().eq("id", id);
    if (error) setErr(error.message); else { setMsg("Item dihapus."); load(); }
  };

  const totalBiaya = useMemo(
    () => rows.reduce((s, r) => s + Number(r.qty) * Number(r.bahan?.harga ?? 0), 0),
    [rows]
  );

  return (
    <div className="p-6 max-w-3xl">
      <a href="/setup/resep" className="underline text-sm">← Kembali</a>
      <h1 className="text-2xl font-bold mb-4">Resep: {resep?.nama_resep ?? "…"}</h1>

      <form onSubmit={add} className="grid grid-cols-3 gap-3 mb-6">
        <select className="border rounded p-2" value={bahanId} onChange={e => { setBahanId(e.target.value); setErr(null); }}>
          <option value="">Pilih bahan…</option>
          {bahanList.map(b => <option key={b.id} value={b.id}>{b.nama_bahan} — {rupiah(b.harga)}/{b.satuan}</option>)}
        </select>
        <input className="border rounded p-2" type="number" min={0} placeholder="qty"
               value={qty} onChange={e => { setQty(e.target.value); setErr(null); }} />
        <input className="border rounded p-2" placeholder="unit (mis. gram)"
               value={unit} onChange={e => { setUnit(e.target.value); setErr(null); }} />
        <button className="border rounded p-2 font-semibold col-span-3">Tambah Bahan</button>
      </form>

      <p className="mb-3 text-sm">Total biaya bahan: <b>{rupiah(totalBiaya)}</b></p>
      {err && <p className="text-red-600 mb-3">Error: {err}</p>}
      {msg && <p className="text-green-700 mb-3">{msg}</p>}

      <div className="space-y-2">
        {rows.map(r => (
          <div key={r.id} className="border rounded p-3">
            {editing?.id === r.id ? (
              <form onSubmit={save} className="grid grid-cols-4 gap-2">
                <div className="col-span-2 text-sm">{r.bahan?.nama_bahan}</div>
                <input className="border rounded p-2" type="number" min={0}
                       value={editing.qty as unknown as number}
                       onChange={e => setEditing({ ...editing!, qty: Number(e.target.value) })}/>
                <input className="border rounded p-2"
                       value={editing.unit}
                       onChange={e => setEditing({ ...editing!, unit: e.target.value })}/>
                <div className="col-span-4 flex gap-2">
                  <button className="border px-3 py-1 rounded text-sm">Simpan</button>
                  <button type="button" className="border px-3 py-1 rounded text-sm" onClick={() => setEditing(null)}>Batal</button>
                </div>
              </form>
            ) : (
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium">{r.bahan?.nama_bahan}</div>
                  <div className="text-sm">
                    {r.qty} {r.unit} × {rupiah(r.bahan?.harga ?? 0)}/{r.bahan?.satuan}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="border px-3 py-1 rounded text-sm" onClick={() => { setEditing(r); setErr(null); setMsg(null); }}>Edit</button>
                  <button className="border px-3 py-1 rounded text-sm" onClick={() => del(r.id)}>Hapus</button>
                </div>
              </div>
            )}
          </div>
        ))}
        {rows.length === 0 && <p className="text-sm text-neutral-500">Belum ada bahan.</p>}
      </div>
    </div>
  );
}
