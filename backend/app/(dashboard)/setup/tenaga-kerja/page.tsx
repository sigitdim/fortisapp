// app/setup/tenaga-kerja/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type ProdukLite = { id: string; nama_produk: string };
type TKRow = { produk_id: string; nilai: number | null };

async function upsertTK(produk_id: string, nilai: number) {
  const { error } = await supabase
    .from("tenaga_kerja_produk")
    .upsert({ produk_id, nilai }, { onConflict: "produk_id" });
  if (error) throw error;
}

export default function TenagaKerjaMassEditPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [produk, setProduk] = useState<ProdukLite[]>([]);
  const [query, setQuery] = useState("");

  const [currentMap, setCurrentMap] = useState<Record<string, number>>({});
  const [editMap, setEditMap] = useState<Record<string, string>>({});
  const [statusMap, setStatusMap] = useState<Record<string, string>>({});
  const [savingAll, setSavingAll] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id ?? null;

      // ---- get produk (conditionally filter by owner) ----
      let q = supabase.from("produk").select("id, nama_produk");
      if (uid) q = q.eq("owner", uid);
      q = q.order("nama_produk", { ascending: true });
      const { data: plist, error: pErr } = (await q) as {
        data: ProdukLite[] | null;
        error: any;
      };
      if (pErr) {
        console.error(pErr);
        setProduk([]);
        setLoading(false);
        return;
      }
      const p = plist ?? [];
      setProduk(p);

      // ---- get tenaga_kerja map ----
      const { data: tkRows } = (await supabase
        .from("tenaga_kerja_produk")
        .select("produk_id, nilai")) as { data: TKRow[] | null };

      const cmap: Record<string, number> = {};
      (tkRows ?? []).forEach((r) => (cmap[r.produk_id] = Number(r.nilai ?? 0)));
      setCurrentMap(cmap);

      // prefill edit
      const pref: Record<string, string> = {};
      p.forEach((item) => (pref[item.id] = String(cmap[item.id] ?? 0)));
      setEditMap(pref);

      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return produk;
    return produk.filter((p) => p.nama_produk.toLowerCase().includes(q));
  }, [produk, query]);

  const copyFromFirst = () => {
    if (filtered.length === 0) return;
    const firstId = filtered[0].id;
    const val = editMap[firstId] ?? "0";
    const next = { ...editMap };
    filtered.forEach((p) => (next[p.id] = val));
    setEditMap(next);
  };

  const saveOne = async (id: string) => {
    try {
      setStatusMap((s) => ({ ...s, [id]: "Saving…" }));
      const v = editMap[id]?.trim() ?? "0";
      const num = v === "" ? 0 : Number(v);
      if (isNaN(num) || num < 0) throw new Error("Harus angka ≥ 0");
      await upsertTK(id, num);
      setCurrentMap((m) => ({ ...m, [id]: num }));
      setStatusMap((s) => ({ ...s, [id]: "✅ Tersimpan" }));
      router.refresh();
      setTimeout(() => setStatusMap((s) => ({ ...s, [id]: "" })), 1200);
    } catch (e: any) {
      setStatusMap((s) => ({ ...s, [id]: `❌ ${e?.message ?? "Gagal"}` }));
    }
  };

  const saveAllChanged = async () => {
    const changedIds = filtered
      .map((p) => p.id)
      .filter((id) => Number(editMap[id] ?? 0) !== Number(currentMap[id] ?? 0));
    if (changedIds.length === 0) return;

    setSavingAll(true);
    try {
      for (const id of changedIds) {
        const num = Number((editMap[id] ?? "0") || 0);
        await upsertTK(id, isNaN(num) || num < 0 ? 0 : num);
        setCurrentMap((m) => ({ ...m, [id]: num }));
        setStatusMap((s) => ({ ...s, [id]: "✅ Tersimpan" }));
      }
      router.refresh();
      setTimeout(() => setStatusMap((s) => ({})), 1500);
    } finally {
      setSavingAll(false);
    }
  };

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-5">
      <h1 className="text-2xl font-bold">Tenaga Kerja per Porsi — Mass Edit</h1>

      <div className="flex flex-wrap gap-3">
        <input
          className="border rounded px-3 py-2 flex-1 min-w-[260px]"
          placeholder="Cari produk…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button onClick={copyFromFirst} className="border rounded px-3 py-2">
          Samakan dgn baris 1 (filtered)
        </button>
        <button
          onClick={saveAllChanged}
          disabled={savingAll}
          className="rounded bg-black text-white px-4 py-2 disabled:opacity-50"
        >
          {savingAll ? "Saving…" : "Save semua yang berubah"}
        </button>
      </div>

      <div className="text-xs text-neutral-500">
        Perubahan disimpan ke tabel <code>tenaga_kerja_produk</code> dan ikut dihitung di backend
        (mis. <code>v_hpp_final</code>).
      </div>

      <table className="w-full text-sm border">
        <thead>
          <tr className="bg-gray-50">
            <th className="border p-2 w-12">#</th>
            <th className="border p-2">Produk</th>
            <th className="border p-2 w-40">Nilai sekarang</th>
            <th className="border p-2 w-56">Edit</th>
            <th className="border p-2 w-28">Aksi</th>
            <th className="border p-2 w-40">Status</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((p, i) => {
            const cur = Number(currentMap[p.id] ?? 0);
            const editVal = editMap[p.id] ?? "";
            const changed = Number(editVal || 0) !== cur;
            return (
              <tr key={p.id}>
                <td className="border p-2 text-center">{i + 1}</td>
                <td className="border p-2">{p.nama_produk}</td>
                <td className="border p-2">Rp {cur.toLocaleString("id-ID")}</td>
                <td className="border p-2">
                  <input
                    className="border rounded w-full px-2 py-1"
                    inputMode="numeric"
                    value={editVal}
                    onChange={(e) =>
                      setEditMap((m) => ({ ...m, [p.id]: e.target.value }))
                    }
                  />
                </td>
                <td className="border p-2 text-center">
                  <button
                    onClick={() => saveOne(p.id)}
                    disabled={!changed}
                    className="border rounded px-3 py-1 disabled:opacity-40"
                  >
                    Save
                  </button>
                </td>
                <td className="border p-2 text-neutral-600">{statusMap[p.id] ?? "—"}</td>
              </tr>
            );
          })}
          {filtered.length === 0 && (
            <tr>
              <td className="border p-3 text-center text-neutral-500" colSpan={6}>
                Tidak ada data.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
