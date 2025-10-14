"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Resep = { id: string; nama_resep: string; created_at: string };

export default function ResepIndexPage() {
  const [rows, setRows] = useState<Resep[]>([]);
  const [nama, setNama] = useState("");
  const [editing, setEditing] = useState<Resep | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    setErr(null);
    const { data, error } = await supabase
      .from("resep")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) setErr(error.message);
    else setRows((data as Resep[]) ?? []);
  };

  useEffect(() => { load(); }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setMsg(null);
    if (!nama.trim()) { setErr("nama_resep wajib diisi"); return; }
    const { error } = await supabase.from("resep").insert([{ nama_resep: nama.trim() }]);
    if (error) setErr(error.message);
    else { setNama(""); setMsg("Resep dibuat."); load(); }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const { error } = await supabase
      .from("resep")
      .update({ nama_resep: editing.nama_resep.trim() })
      .eq("id", editing.id);
    if (error) setErr(error.message);
    else { setEditing(null); setMsg("Nama resep diupdate."); load(); }
  };

  const del = async (id: string) => {
    setErr(null); setMsg(null);
    const { error } = await supabase.from("resep").delete().eq("id", id);
    if (error) setErr(error.message);
    else { setMsg("Resep dihapus."); load(); }
  };

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold mb-4">Setup Resep</h1>

      {/* Create */}
      <form onSubmit={add} className="grid grid-cols-3 gap-3 mb-6">
        <input className="border rounded p-2 col-span-2" placeholder="nama_resep"
               value={nama} onChange={e => { setNama(e.target.value); setErr(null); }} />
        <button className="border rounded p-2 font-semibold">Tambah</button>
      </form>

      {err && <p className="text-red-600 mb-3">Error: {err}</p>}
      {msg && <p className="text-green-700 mb-3">{msg}</p>}

      {/* List + edit/delete */}
      <div className="space-y-2">
        {rows.map(r => (
          <div key={r.id} className="border rounded p-3">
            {editing?.id === r.id ? (
              <form onSubmit={save} className="flex gap-2">
                <input className="border rounded p-2 flex-1"
                       value={editing.nama_resep}
                       onChange={e => setEditing({ ...editing!, nama_resep: e.target.value })}/>
                <button className="border px-3 py-1 rounded text-sm">Simpan</button>
                <button type="button" className="border px-3 py-1 rounded text-sm"
                        onClick={() => setEditing(null)}>Batal</button>
              </form>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <a className="font-medium underline" href={`/setup/resep/${r.id}`}>
                  {r.nama_resep}
                </a>
                <div className="flex gap-2">
                  <button className="border px-3 py-1 rounded text-sm" onClick={() => { setEditing(r); setErr(null); setMsg(null); }}>Edit</button>
                  <button className="border px-3 py-1 rounded text-sm" onClick={() => del(r.id)}>Hapus</button>
                </div>
              </div>
            )}
          </div>
        ))}
        {rows.length === 0 && <p className="text-sm text-neutral-500">Belum ada resep.</p>}
      </div>
    </div>
  );
}
