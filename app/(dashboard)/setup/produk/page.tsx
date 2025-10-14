"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

/* =============== Types =============== */
type ProdukLite = {
  id: string;
  nama_produk: string;
  harga_jual_user: number | null;
  owner?: string;
};

type PricingView = {
  produk_id: string;
  // kolom-kolom di v_pricing_final (nama bisa disesuaikan kalau beda)
  hpp_total_per_porsi?: number | null;
  harga_rekomendasi?: number | null;
  harga_jual_user?: number | null;
  profit_user_per_porsi?: number | null;
  margin_user_persen?: number | null;
};

type Row = {
  id: string;
  nama: string;
  // angka dari view pricing
  hppTotal: number;
  hargaRekom: number;
  profitUser: number;
  marginUser: number;
  // editable
  hargaUserCurrent: number;
  hargaUserDraft: string;
  dirty: boolean;
  saving?: boolean;
  error?: string | null;
  savedAt?: number;
};

/* =============== Helpers =============== */
const toIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.round(n || 0)));

function nz(n: number | null | undefined) {
  return typeof n === "number" ? n : 0;
}

/* =============== Page =============== */
export default function ProdukPricingPage() {
  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [savingAll, setSavingAll] = useState(false);

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
    // 1) ambil list produk user
    let qProd = supabase
      .from("produk")
      .select("id,nama_produk,harga_jual_user")
      .order("nama_produk", { ascending: true });
    if (userId) qProd = qProd.eq("owner", userId);

    const { data: produk, error: eP } = (await qProd) as {
      data: ProdukLite[] | null;
      error: any;
    };
    if (eP) {
      console.error("ERR produk:", eP);
      setRows([]);
      return;
    }
    const p = produk ?? [];
    if (p.length === 0) {
      setRows([]);
      return;
    }

    // 2) ambil angka dari v_pricing_final by produk_id
    const ids = p.map((x) => x.id);
    let pricingMap = new Map<string, PricingView>();
    if (ids.length > 0) {
      const { data: vv, error: eV } = (await supabase
        .from("v_pricing_final")
        .select(
          "produk_id,hpp_total_per_porsi,harga_rekomendasi,harga_jual_user,profit_user_per_porsi,margin_user_persen"
        )
        .in("produk_id", ids)) as { data: PricingView[] | null; error: any };
      if (eV) console.warn("WARN v_pricing_final:", eV);
      (vv ?? []).forEach((r) => pricingMap.set(r.produk_id, r));
    }

    // 3) bentuk baris
    const rs: Row[] = p.map((prod) => {
      const pv = pricingMap.get(prod.id);
      const hargaUser = nz(prod.harga_jual_user);
      return {
        id: prod.id,
        nama: prod.nama_produk,
        hppTotal: nz(pv?.hpp_total_per_porsi),
        hargaRekom: nz(pv?.harga_rekomendasi),
        profitUser: nz(pv?.profit_user_per_porsi),
        marginUser: nz(pv?.margin_user_persen),
        hargaUserCurrent: hargaUser,
        hargaUserDraft: String(hargaUser || ""),
        dirty: false,
      };
    });
    setRows(rs);
  }

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => r.nama.toLowerCase().includes(s));
  }, [rows, q]);

  const setDraft = (id: string, v: string) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              hargaUserDraft: v,
              dirty: v !== String(r.hargaUserCurrent || ""),
              error: null,
            }
          : r
      )
    );
  };

  const saveOne = async (id: string) => {
    const r = rows.find((x) => x.id === id);
    if (!r) return;
    const val = r.hargaUserDraft.trim() === "" ? 0 : Number(r.hargaUserDraft);
    if (isNaN(val) || val < 0) {
      setRows((prev) =>
        prev.map((x) => (x.id === id ? { ...x, error: "Harus angka ≥ 0" } : x))
      );
      return;
    }

    // 1) update ke tabel produk.harga_jual_user
    setRows((prev) =>
      prev.map((x) => (x.id === id ? { ...x, saving: true, error: null } : x))
    );
    const { error } = await supabase
      .from("produk")
      .update({ harga_jual_user: val })
      .eq("id", id);

    if (error) {
      setRows((prev) =>
        prev.map((x) =>
          x.id === id
            ? { ...x, saving: false, error: error.message || "Gagal menyimpan" }
            : x
        )
      );
      return;
    }

    // 2) re-fetch baris pricing final utk id tsb (agar profit & margin update)
    const { data: vv } = (await supabase
      .from("v_pricing_final")
      .select(
        "produk_id,hpp_total_per_porsi,harga_rekomendasi,harga_jual_user,profit_user_per_porsi,margin_user_persen"
      )
      .eq("produk_id", id)
      .limit(1)) as { data: PricingView[] | null };

    const pv = vv?.[0];
    setRows((prev) =>
      prev.map((x) =>
        x.id === id
          ? {
              ...x,
              hppTotal: nz(pv?.hpp_total_per_porsi),
              hargaRekom: nz(pv?.harga_rekomendasi),
              profitUser: nz(pv?.profit_user_per_porsi),
              marginUser: nz(pv?.margin_user_persen),
              hargaUserCurrent: val,
              hargaUserDraft: String(val),
              dirty: false,
              saving: false,
              savedAt: Date.now(),
            }
          : x
      )
    );
  };

  const copyFromFirst = () => {
    const first = filtered[0];
    if (!first) return;
    const v = first.hargaUserDraft;
    setRows((prev) =>
      prev.map((r) =>
        filtered.find((f) => f.id === r.id)
          ? {
              ...r,
              hargaUserDraft: v,
              dirty: v !== String(r.hargaUserCurrent || ""),
            }
          : r
      )
    );
  };

  const saveAllChanged = async () => {
    const targets = filtered.filter((r) => r.dirty);
    if (targets.length === 0) return;
    setSavingAll(true);
    try {
      for (const r of targets) {
        // eslint-disable-next-line no-await-in-loop
        await saveOne(r.id);
      }
    } finally {
      setSavingAll(false);
    }
  };

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold">Produk — Pricing</h1>
        <div className="text-sm text-neutral-600">
          Total produk: <b>{rows.length}</b>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          className="border rounded px-3 py-2 flex-1 min-w-[260px]"
          placeholder="Cari produk…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button onClick={copyFromFirst} className="border rounded px-3 py-2">
          Samakan dgn baris 1 (filtered)
        </button>
        <button
          onClick={saveAllChanged}
          disabled={savingAll || filtered.every((r) => !r.dirty)}
          className="rounded bg-black text-white px-4 py-2 disabled:opacity-50"
        >
          {savingAll ? "Saving…" : "Save semua yang berubah"}
        </button>
      </div>

      <div className="text-xs text-neutral-500">
        Angka HPP & profit/margin sumbernya dari <code>v_pricing_final</code>. Setelah{" "}
        <b>harga jual user</b> diubah, view akan otomatis memantulkan update.
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border">
          <thead>
            <tr className="bg-gray-50">
              <th className="border p-2 w-10">#</th>
              <th className="border p-2 min-w-[220px]">Produk</th>
              <th className="border p-2 w-40">HPP Total/porsi</th>
              <th className="border p-2 w-40">Harga rekom.</th>
              <th className="border p-2 w-48">Harga jual (user)</th>
              <th className="border p-2 w-40">Profit/porsi</th>
              <th className="border p-2 w-28">Margin</th>
              <th className="border p-2 w-28">Aksi</th>
              <th className="border p-2 w-40">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => {
              const changed = r.dirty;
              const marginColor =
                r.marginUser > 0 ? "text-green-700" : r.marginUser < 0 ? "text-red-600" : "";
              return (
                <tr key={r.id} className={changed ? "bg-amber-50" : undefined}>
                  <td className="border p-2 text-center">{i + 1}</td>
                  <td className="border p-2">{r.nama}</td>
                  <td className="border p-2">{toIDR(r.hppTotal)}</td>
                  <td className="border p-2">{toIDR(r.hargaRekom)}</td>
                  <td className="border p-2">
                    <div className="flex items-center gap-2">
                      <input
                        className="border rounded w-full px-2 py-1"
                        inputMode="numeric"
                        value={r.hargaUserDraft}
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
                    </div>
                  </td>
                  <td className="border p-2">{toIDR(r.profitUser)}</td>
                  <td className={`border p-2 ${marginColor}`}>
                    {Number.isFinite(r.marginUser) ? `${Math.round(r.marginUser)}%` : "—"}
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
                <td className="border p-3 text-center text-neutral-500" colSpan={9}>
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
