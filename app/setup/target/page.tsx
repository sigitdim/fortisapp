// app/setup/target/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

/* ================= Types ================= */
type ProdukLite = { id: string; nama_produk: string };
type TargetRowFromView = { produk_id: string; target_penjualan_final: number | null };
type TargetRowFromTable = { produk_id: string; nilai: number | null };

type Row = {
  id: string;
  nama: string;
  current: number;  // nilai yang dipakai backend (dari v_hpp_final / fallback tabel)
  draft: string;    // isi input user
  dirty: boolean;   // beda dgn current?
  saving?: boolean;
  error?: string | null;
  savedAt?: number;
};

/* ================ Helpers ================ */
const toIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);

/** Upsert ke tabel target per produk.
 *  Kalau tabel kamu pakai kolom `owner` + RLS, aktifkan baris `owner: userId`.
 */
async function upsertTargetProduk(produkId: string, nilai: number, userId?: string | null) {
  const payload: Record<string, any> = {
    produk_id: produkId,
    nilai: nilai ?? 0,
    // owner: userId, // ← UNCOMMENT kalau tabel pakai kolom owner dan butuh diisi
  };

  const { error } = await supabase
    .from("target_penjualan_produk")
    .upsert(payload, { onConflict: "produk_id" });

  if (error) throw error;
}

/* ================ Page ================ */
export default function TargetPenjualanMassEditPage() {
  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [rows, setRows] = useState<Row[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id ?? null;
      setUid(userId);
      setLoading(false);
      if (userId) await loadData(userId);
    })();
  }, []);

  async function loadData(userId: string) {
    // --- 1) ambil produk milik user ---
    let q1 = supabase.from("produk").select("id,nama_produk").order("nama_produk", { ascending: true });
    if (userId) q1 = q1.eq("owner", userId);
    const { data: produk, error: eProduk } = (await q1) as { data: ProdukLite[] | null; error: any };

    if (eProduk) {
      console.error("ERR produk:", eProduk);
      setRows([]);
      return;
    }
    const plist = produk ?? [];
    if (plist.length === 0) {
      setRows([]);
      return;
    }

    const ids = plist.map((p) => p.id);

    // --- 2) ambil target yang dipakai backend dari v_hpp_final ---
    const currentMap = new Map<string, number>();
    if (ids.length > 0) {
      const { data: targetList, error: eView } = (await supabase
        .from("v_hpp_final")
        .select("produk_id,target_penjualan_final")
        .in("produk_id", ids)) as { data: TargetRowFromView[] | null; error: any };

      if (eView) console.warn("WARN v_hpp_final:", eView);
      (targetList ?? []).forEach((r) =>
        currentMap.set(r.produk_id, Number(r.target_penjualan_final ?? 0))
      );
    }

    // --- 3) Fallback: kalau masih 0/null, baca langsung dari tabel target_penjualan_produk ---
    const needFallbackIds = ids.filter((id) => (currentMap.get(id) ?? 0) === 0);
    if (needFallbackIds.length > 0) {
      const { data: fromTable, error: eTbl } = (await supabase
        .from("target_penjualan_produk")
        .select("produk_id,nilai")
        .in("produk_id", needFallbackIds)) as { data: TargetRowFromTable[] | null; error: any };

      if (eTbl) console.warn("WARN target_penjualan_produk:", eTbl);
      (fromTable ?? []).forEach((r) => {
        const tbl = Number(r.nilai ?? 0);
        if (tbl > 0) currentMap.set(r.produk_id, tbl);
      });
    }

    // --- 4) bentuk row untuk tabel ---
    const rs: Row[] = plist.map((p) => {
      const cur = currentMap.get(p.id) ?? 0;
      return {
        id: p.id,
        nama: p.nama_produk,
        current: cur,
        draft: String(cur || ""),
        dirty: false,
      };
    });
    setRows(rs);
  }

  // filter by search
  const filtered = useMemo(() => {
    const n = query.trim().toLowerCase();
    if (!n) return rows;
    return rows.filter((r) => r.nama.toLowerCase().includes(n));
  }, [rows, query]);

  // update draft value
  const setDraft = (id: string, draft: string) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, draft, dirty: draft !== String(r.current || "") } : r
      )
    );
  };

  // save satu baris
  const saveOne = async (id: string) => {
    const r = rows.find((x) => x.id === id);
    if (!r) return;
    const num = r.draft.trim() === "" ? 0 : Number(r.draft);
    if (isNaN(num) || num < 0) {
      setRows((prev) => prev.map((x) => (x.id === id ? { ...x, error: "Harus angka ≥ 0" } : x)));
      return;
    }
    setRows((prev) => prev.map((x) => (x.id === id ? { ...x, saving: true, error: null } : x)));
    try {
      await upsertTargetProduk(id, num, uid);
      setRows((prev) =>
        prev.map((x) =>
          x.id === id
            ? {
                ...x,
                current: num,
                draft: String(num),
                dirty: false,
                saving: false,
                savedAt: Date.now(),
              }
            : x
        )
      );
    } catch (e: any) {
      setRows((prev) =>
        prev.map((x) =>
          x.id === id ? { ...x, saving: false, error: e?.message ?? "Gagal menyimpan" } : x
        )
      );
    }
  };

  // copy dari baris pertama (yang lagi terfilter)
  const copyFromFirst = () => {
    const first = filtered[0];
    if (!first) return;
    const val = first.draft;
    setRows((prev) =>
      prev.map((r) =>
        filtered.find((f) => f.id === r.id)
          ? { ...r, draft: val, dirty: val !== String(r.current || "") }
          : r
      )
    );
  };

  // save semua yang berubah (di filter)
  const saveAllChanged = async () => {
    const targets = filtered.filter((r) => r.dirty);
    for (const r of targets) {
      // eslint-disable-next-line no-await-in-loop
      await saveOne(r.id);
    }
  };

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold">Target Penjualan per Porsi — Mass Edit</h1>
        <div className="text-sm text-neutral-600">Total produk: <b>{rows.length}</b></div>
      </div>

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
          disabled={filtered.every((r) => !r.dirty)}
          className="rounded bg-black text-white px-4 py-2 disabled:opacity-50"
        >
          Save semua yang berubah
        </button>
      </div>

      <div className="text-xs text-neutral-500">
        Perubahan disimpan ke tabel <code>target_penjualan_produk</code> dan otomatis ikut dihitung
        di backend (mis. <code>v_hpp_final</code>). Jika kolom tampak kosong, minta backend refresh view/ETL.
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border">
          <thead>
            <tr className="bg-gray-50">
              <th className="border p-2 w-12">#</th>
              <th className="border p-2">Produk</th>
              <th className="border p-2 w-48">Target sekarang</th>
              <th className="border p-2 w-56">Edit</th>
              <th className="border p-2 w-28">Aksi</th>
              <th className="border p-2 w-40">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => {
              const cur = Math.max(0, Math.round(r.current || 0));
              const changed = r.dirty;
              return (
                <tr key={r.id} className={changed ? "bg-amber-50" : undefined}>
                  <td className="border p-2 text-center">{i + 1}</td>
                  <td className="border p-2">{r.nama}</td>
                  <td className="border p-2">{toIDR(cur)}</td>
                  <td className="border p-2">
                    <input
                      className="border rounded w-full px-2 py-1"
                      inputMode="numeric"
                      value={r.draft}
                      onChange={(e) => setDraft(r.id, e.target.value)}
                      onBlur={() => {
                        if (r.error) {
                          setRows((prev) =>
                            prev.map((x) => (x.id === r.id ? { ...x, error: null } : x))
                          );
                        }
                      }}
                      placeholder="0"
                    />
                  </td>
                  <td className="border p-2 text-center">
                    <button
                      onClick={() => saveOne(r.id)}
                      disabled={!changed || r.saving}
                      className="border rounded px-3 py-1 disabled:opacity-40"
                    >
                      {r.saving ? "Saving…" : "Save"}
                    </button>
                  </td>
                  <td className="border p-2 text-neutral-600">
                    {r.error ? (
                      <span className="text-red-600">{r.error}</span>
                    ) : r.savedAt ? (
                      <span className="text-green-700">✅ Tersimpan</span>
                    ) : (
                      "—"
                    )}
                  </td>
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
    </div>
  );
}
