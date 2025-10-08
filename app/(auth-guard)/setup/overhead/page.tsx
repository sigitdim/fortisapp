// app/setup/overhead/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

/** ---------- Types ---------- */
type ProdukLite = { id: string; nama_produk: string };
type OverheadRow = { produk_id: string; overhead_per_porsi: number | null };
type Row = {
  id: string;
  nama: string;
  current: number;     // dari backend (v_hpp_final / view overhead)
  draft: string;       // string di input
  dirty: boolean;      // ada perubahan?
  saving?: boolean;
  error?: string | null;
  savedAt?: number;
};

/** ---------- Helpers ---------- */
const toIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

async function upsertOverheadProduk(produkId: string, nilai: number | null) {
  const { error } = await supabase
    .from("overhead_produk")
    .upsert({ produk_id: produkId, nilai: nilai ?? 0 }, { onConflict: "produk_id" });
  if (error) throw error;
}

export default function OverheadSetupPage() {
  const router = useRouter();

  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id ?? null;
      setUid(userId);
      setLoading(false);
      if (userId) await loadData(userId);
    })();
  }, []);

  const loadData = async (userId: string) => {
    // 1) ambil produk milik user
    const { data: produk, error: e1 } = await supabase
      .from("produk")
      .select("id, nama_produk")
      .eq("owner", userId)
      .order("nama_produk", { ascending: true }) as { data: ProdukLite[] | null; error: any };

    if (e1) {
      console.error(e1);
      setRows([]);
      return;
    }
    const list = produk ?? [];
    if (list.length === 0) {
      setRows([]);
      return;
    }

    // 2) ambil overhead per produk dari view backend (pakai v_hpp_final agar konsisten)
    const ids = list.map((p) => p.id);
    const { data: ohList } = await supabase
      .from("v_hpp_final")
      .select("produk_id, overhead_per_porsi")
      .in("produk_id", ids) as { data: OverheadRow[] | null };

    const overheadMap = new Map(
      (ohList ?? []).map((r) => [r.produk_id, Number(r.overhead_per_porsi ?? 0)])
    );

    // 3) bentuk baris tabel
    const rs: Row[] = list.map((p) => {
      const cur = overheadMap.get(p.id) ?? 0;
      return {
        id: p.id,
        nama: p.nama_produk,
        current: cur,
        draft: String(cur || ""),
        dirty: false,
      };
    });
    setRows(rs);
  };

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) => r.nama.toLowerCase().includes(needle));
  }, [rows, q]);

  const setDraft = (id: string, draft: string) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, draft, dirty: draft !== String(r.current || "") }
          : r
      )
    );
  };

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
      await upsertOverheadProduk(id, num);
      // refresh value current di baris terkait (optimistic)
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
      router.refresh(); // >>> biar HPP/Rekap ikut update
    } catch (e: any) {
      setRows((prev) =>
        prev.map((x) =>
          x.id === id ? { ...x, saving: false, error: e?.message ?? "Gagal menyimpan" } : x
        )
      );
    }
  };

  const bulkApply = () => {
    const first = filtered[0];
    if (!first) return;
    const val = first.draft;
    setRows((prev) =>
      prev.map((r) =>
        filtered.some((f) => f.id === r.id)
          ? { ...r, draft: val, dirty: val !== String(r.current || "") }
          : r
      )
    );
  };

  const bulkSave = async () => {
    const targets = filtered.filter((r) => r.dirty);
    for (const r of targets) {
      // eslint-disable-next-line no-await-in-loop
      await saveOne(r.id);
    }
    router.refresh(); // >>> sekali lagi setelah mass save selesai
  };

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold">Overhead per Porsi — Mass Edit</h1>
        <div className="text-sm text-gray-500">
          Total produk: <b>{rows.length}</b>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <input
          className="border rounded p-2 w-full max-w-sm"
          placeholder="Cari produk…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button
          onClick={bulkApply}
          disabled={filtered.length === 0}
          className="px-3 py-2 rounded-lg bg-gray-100 border"
          title="Set semua (yang tersaring) ke nilai baris pertama"
        >
          Samakan dgn baris 1 (filtered)
        </button>
        <button
          onClick={bulkSave}
          disabled={filtered.every((r) => !r.dirty)}
          className="px-3 py-2 rounded-lg bg-black text-white disabled:opacity-50"
        >
          Save semua yang berubah
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left p-2 border w-[48px]">#</th>
              <th className="text-left p-2 border">Produk</th>
              <th className="text-left p-2 border">Overhead sekarang</th>
              <th className="text-left p-2 border">Edit</th>
              <th className="text-left p-2 border w-[140px]">Aksi</th>
              <th className="text-left p-2 border">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={r.id} className={r.dirty ? "bg-amber-50" : undefined}>
                <td className="p-2 border">{i + 1}</td>
                <td className="p-2 border">{r.nama}</td>
                <td className="p-2 border">{toIDR(Math.max(0, Math.round(r.current || 0)))}</td>
                <td className="p-2 border">
                  <input
                    className="border rounded p-2 w-40"
                    inputMode="numeric"
                    value={r.draft}
                    onChange={(e) => setDraft(r.id, e.target.value)}
                    onBlur={() => {
                      // bersihkan error ketika user revisi
                      if (r.error) setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, error: null } : x)));
                    }}
                    placeholder="0"
                  />
                </td>
                <td className="p-2 border">
                  <button
                    className="px-3 py-1.5 rounded-lg bg-black text-white disabled:opacity-50"
                    onClick={() => saveOne(r.id)}
                    disabled={!r.dirty || r.saving}
                  >
                    {r.saving ? "Saving…" : "Save"}
                  </button>
                </td>
                <td className="p-2 border">
                  {r.error && <span className="text-red-600">{r.error}</span>}
                  {!r.error && r.savedAt && <span className="text-green-700">Saved</span>}
                  {!r.error && !r.savedAt && !r.dirty && <span className="text-gray-500">—</span>}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td className="p-2 border text-sm text-gray-500" colSpan={6}>
                  Tidak ada produk yang cocok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-500">
        Perubahan disimpan ke tabel <code>overhead_produk</code> dan otomatis ikut dihitung di view
        backend (<code>v_hpp_final</code>).
      </p>
    </div>
  );
}
