// app/(auth-guard)/hpp/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

/* ---------- Types ---------- */
type ProductMeta = {
  id: string;
  nama_produk: string;
  porsi: number | null;
  harga_jual: number | null;
};

type VHPPFinalRow = {
  produk_id: string;
  nama_produk: string;
  hpp_bahan_per_porsi: number | null;
  tenaga_kerja_per_porsi: number | null;
  overhead_per_porsi: number | null;
  hpp_total_per_porsi: number | null;
  target_penjualan_final: number | null;
};

/* ---------- Helpers ---------- */
const toIDR = (n: number | null | undefined) =>
  n == null
    ? "—"
    : new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }).format(Number(n));

const toNumOrNull = (v: any): number | null => {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/* ---------- Supabase: view + overhead ---------- */
async function fetchHPPFinal(pid: string): Promise<VHPPFinalRow | null> {
  const { data, error } = await supabase
    .from("v_hpp_final")
    .select("*")
    .eq("produk_id", pid)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const r: any = data;
  return {
    produk_id: r.produk_id ?? r.id ?? pid,
    nama_produk: r.nama_produk ?? r.produk ?? "",
    hpp_bahan_per_porsi: toNumOrNull(r.hpp_bahan_per_porsi ?? r.hpp_bahan ?? r.hpp_per_porsi),
    tenaga_kerja_per_porsi: toNumOrNull(r.tenaga_kerja_per_porsi ?? r.tenaga_kerja),
    overhead_per_porsi: toNumOrNull(r.overhead_per_porsi ?? r.overhead),
    hpp_total_per_porsi: toNumOrNull(r.hpp_total_per_porsi ?? r.hpp_total),
    target_penjualan_final: toNumOrNull(r.target_penjualan_final ?? r.target_penjualan),
  };
}

async function upsertOverheadProduk(produkId: string, nilai: number | null) {
  const payload = { produk_id: produkId, nilai };
  const { error } = await supabase
    .from("overhead_produk")
    .upsert(payload, { onConflict: "produk_id" });
  if (error) throw error;
}

/* ---------- Overhead editor ---------- */
function OverheadCard({
  produkId,
  currentOverhead,
  onSaved,
}: {
  produkId?: string | null;
  currentOverhead: number | null | undefined;
  onSaved?: () => void;
}) {
  const [val, setVal] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setVal(currentOverhead == null ? "" : String(currentOverhead));
  }, [currentOverhead]);

  const handleSave = async () => {
    if (!produkId) return;
    setSaving(true);
    setMsg(null);
    setErr(null);
    try {
      const n = val.trim() === "" ? 0 : Number(val);
      if (!Number.isFinite(n) || n < 0) throw new Error("Overhead harus angka ≥ 0");
      await upsertOverheadProduk(produkId, n);
      setMsg("Overhead tersimpan.");
      onSaved?.();
      setTimeout(() => setMsg(null), 1200);
    } catch (e: any) {
      setErr(e?.message ?? "Gagal menyimpan overhead.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Overhead per Porsi</h3>
        <button
          onClick={handleSave}
          disabled={!produkId || saving}
          className="px-3 py-1.5 rounded-lg bg-black text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
      <div className="grid gap-2 md:max-w-sm">
        <label className="text-sm text-gray-600">Nominal (Rp)</label>
        <input
          className="border rounded p-2"
          inputMode="numeric"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder="mis. 1500"
          disabled={!produkId || saving}
        />
      </div>
      {msg && <p className="text-green-700 text-sm">{msg}</p>}
      {err && <p className="text-red-600 text-sm">{err}</p>}
      <p className="text-xs text-gray-500">
        Disimpan ke tabel <code>overhead_produk</code>. View <code>v_hpp_final</code> akan ikut saat refresh.
      </p>
    </div>
  );
}

/* ================================================================== */
export default function HPPPage() {
  const [produkList, setProdukList] = useState<Array<Pick<ProductMeta, "id" | "nama_produk">>>([]);
  const [selectedProdukId, setSelectedProdukId] = useState<string>("");

  // meta & view
  const [produkDetail, setProdukDetail] = useState<ProductMeta | null>(null);
  const [hppRow, setHppRow] = useState<VHPPFinalRow | null>(null);

  // edit meta
  const [editHargaJual, setEditHargaJual] = useState<number>(0);
  const [editPorsi, setEditPorsi] = useState<number>(1);
  const [savingMeta, setSavingMeta] = useState(false);

  // ui
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // ==== API: /pricing/final (FE only) ====
  const [apiHpp, setApiHpp] = useState<{
    bahan_per_porsi?: number;
    overhead_per_porsi?: number;
    tenaga_kerja_per_porsi?: number;
    total_hpp?: number;
    log_id?: string;
    timestamp?: string;
  } | null>(null);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiErr, setApiErr] = useState<string | null>(null);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.fortislab.id";

  async function fetchPricingFinalFromBE(pid: string) {
    try {
      setApiLoading(true);
      setApiErr(null);
      setApiHpp(null);

      // owner id dari session Supabase
      const { data } = await supabase.auth.getUser();
      const ownerId = data.user?.id;
      if (!ownerId) throw new Error("Tidak ada session user (owner_id).");

      const res = await fetch(`${apiUrl}/pricing/final?produk_id=${encodeURIComponent(pid)}`, {
        method: "GET",
        headers: { "x-owner-id": ownerId },
      });
      const json = await res.json();
      if (!res.ok || json?.ok === false) throw new Error(json?.message || `HTTP ${res.status}`);

      const hpp = json?.hpp ?? {};
      setApiHpp({
        bahan_per_porsi: hpp.bahan_per_porsi ?? null,
        overhead_per_porsi: hpp.overhead_per_porsi ?? null,
        tenaga_kerja_per_porsi: hpp.tenaga_kerja_per_porsi ?? null,
        total_hpp: json.total_hpp ?? null, // siap jika backend tambah
        log_id: json.log_id,
        timestamp: json.timestamp,
      });
    } catch (e: any) {
      setApiErr(e?.message ?? "Gagal memanggil backend /pricing/final");
    } finally {
      setApiLoading(false);
    }
  }

  /* ---------- Init: list produk ---------- */
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("produk")
          .select("id,nama_produk")
          .order("nama_produk", { ascending: true });
        if (error) throw error;
        setProdukList(data ?? []);
      } catch (e: any) {
        setErr(e.message ?? "Gagal memuat produk.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ---------- Detail per-produk ---------- */
  useEffect(() => {
    (async () => {
      if (!selectedProdukId) {
        setProdukDetail(null);
        setHppRow(null);
        setApiHpp(null);
        setApiErr(null);
        return;
      }
      setErr(null);
      try {
        const { data: p } = await supabase
          .from("produk")
          .select("id,nama_produk,porsi,harga_jual")
          .eq("id", selectedProdukId)
          .maybeSingle();
        setProdukDetail((p as ProductMeta) ?? null);
        setEditHargaJual(p?.harga_jual ?? 0);
        setEditPorsi(p?.porsi ?? 1);

        const v = await fetchHPPFinal(selectedProdukId);
        setHppRow(v);
      } catch (e: any) {
        setErr(e.message ?? "Gagal memuat detail produk.");
      }
    })();
  }, [selectedProdukId]);

  /* ---------- Kalkulasi ringkas ---------- */
  const basisHPP = hppRow?.hpp_total_per_porsi ?? null;
  const laba = useMemo(() => {
    if (basisHPP == null || !produkDetail) return null;
    return (produkDetail.harga_jual ?? 0) - basisHPP;
  }, [basisHPP, produkDetail]);

  const margin = useMemo(() => {
    if (!produkDetail || (produkDetail.harga_jual ?? 0) <= 0 || basisHPP == null) return null;
    const m =
      ((produkDetail.harga_jual ?? 0) - basisHPP) /
      Math.max(1, Number(produkDetail.harga_jual ?? 1)) *
      100;
    return m;
  }, [basisHPP, produkDetail]);

  const marginClass =
    margin == null ? "" : margin < 0 ? "text-red-600 font-semibold" : "text-green-700";

  /* ---------- Save meta ---------- */
  const saveProdukMeta = async () => {
    if (!produkDetail) return;
    setSavingMeta(true);
    setErr(null);
    try {
      const { error } = await supabase
        .from("produk")
        .update({
          harga_jual: Math.max(0, Number(editHargaJual || 0)),
          porsi: Math.max(1, Number(editPorsi || 1)),
        })
        .eq("id", produkDetail.id);
      if (error) throw error;

      const { data: p } = await supabase
        .from("produk")
        .select("id,nama_produk,porsi,harga_jual")
        .eq("id", produkDetail.id)
        .maybeSingle();
      setProdukDetail((p as ProductMeta) ?? null);

      const v = await fetchHPPFinal(produkDetail.id);
      setHppRow(v);
    } catch (e: any) {
      setErr(e.message ?? "Gagal menyimpan metadata produk.");
    } finally {
      setSavingMeta(false);
    }
  };

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold">HPP (sinkron dari v_hpp_final)</h1>

      {err && <div className="rounded-md bg-red-100 text-red-800 p-3">{err}</div>}

      {/* PILIH PRODUK */}
      <section className="space-y-2">
        <label className="block text-sm font-semibold">Pilih Produk</label>
        <select
          className="border rounded p-2 w-full max-w-md"
          value={selectedProdukId}
          onChange={(e) => setSelectedProdukId(e.target.value)}
        >
          <option value="">— pilih —</option>
          {produkList.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nama_produk}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500">Data mengikuti RLS (produk milik user aktif).</p>
      </section>

      {/* RINGKASAN HPP (VIEW) */}
      <section className="border rounded-xl p-4">
        <h2 className="font-semibold mb-2">Ringkasan HPP per Porsi (v_hpp_final)</h2>

        {!selectedProdukId ? (
          <div className="text-sm text-gray-500">Pilih produk dulu.</div>
        ) : !hppRow ? (
          <div className="text-sm text-gray-500">
            Belum ada data di <code>v_hpp_final</code> untuk produk ini.
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <span className="text-gray-600">Produk:</span> {hppRow.nama_produk}
            </div>

            <div className="text-sm">
              <div>HPP bahan: {toIDR(hppRow.hpp_bahan_per_porsi)}</div>
              <div>+ Tenaga kerja: {toIDR(hppRow.tenaga_kerja_per_porsi)}</div>
              <div>+ Overhead: {toIDR(hppRow.overhead_per_porsi)}</div>
              <div className="border-t mt-1 pt-1">
                <span className="font-semibold">= HPP total/porsi:</span>{" "}
                {toIDR(hppRow.hpp_total_per_porsi)}
              </div>
              {typeof hppRow.target_penjualan_final === "number" && (
                <div className="mt-1">
                  <span className="text-gray-600">Target penjualan (final):</span>{" "}
                  {toIDR(hppRow.target_penjualan_final)}
                </div>
              )}
            </div>

            {/* Edit harga & porsi */}
            {produkDetail && (
              <div className="mt-3 border-t pt-3">
                <div className="font-semibold mb-2">Ringkasan Profit</div>
                <div className="grid gap-2 md:grid-cols-2 md:max-w-xl">
                  <label className="flex items-center gap-2">
                    <span className="text-gray-600 w-28">Harga jual</span>
                    <input
                      type="number"
                      className="border rounded p-2 w-full"
                      min={0}
                      value={editHargaJual}
                      onChange={(e) => setEditHargaJual(Math.max(0, Number(e.target.value || 0)))}
                    />
                  </label>
                  <label className="flex items-center gap-2">
                    <span className="text-gray-600 w-28">Porsi</span>
                    <input
                      type="number"
                      className="border rounded p-2 w-full"
                      min={1}
                      value={editPorsi}
                      onChange={(e) => setEditPorsi(Math.max(1, Number(e.target.value || 1)))}
                    />
                  </label>
                </div>

                <button
                  onClick={saveProdukMeta}
                  disabled={savingMeta}
                  className="mt-2 rounded-lg px-4 py-2 bg-black text-white disabled:opacity-50"
                >
                  {savingMeta ? "Menyimpan…" : "Simpan"}
                </button>

                <div className="mt-3">
                  <div>
                    <span className="text-gray-600">Basis HPP:</span> {toIDR(basisHPP)}
                  </div>
                  <div>
                    <span className="text-gray-600">Laba kotor/porsi:</span> {toIDR(laba)}
                  </div>
                  <div>
                    <span className="text-gray-600">Margin:</span>{" "}
                    <span className={marginClass}>
                      {margin == null ? "—" : `${margin.toFixed(1)}%`}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Overhead editor → update tabel, lalu refresh view */}
            <div className="mt-2">
              <OverheadCard
                produkId={produkDetail?.id}
                currentOverhead={hppRow.overhead_per_porsi}
                onSaved={async () => {
                  if (produkDetail?.id) {
                    const v = await fetchHPPFinal(produkDetail.id);
                    setHppRow(v);
                  }
                }}
              />
            </div>
          </div>
        )}
      </section>

      {/* === HPP dari Backend API (/pricing/final) === */}
      <section className="border rounded-xl p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">HPP dari Backend API (/pricing/final)</h2>
          <button
            onClick={() => selectedProdukId && fetchPricingFinalFromBE(selectedProdukId)}
            disabled={!selectedProdukId || apiLoading}
            className="rounded-lg border px-3 py-1 text-sm disabled:opacity-50"
          >
            {apiLoading ? "Memuat..." : "Hit API"}
          </button>
        </div>

        {!selectedProdukId ? (
          <p className="text-sm text-gray-500 mt-2">Pilih produk dulu.</p>
        ) : apiErr ? (
          <p className="text-sm text-red-600 mt-2">Error: {apiErr}</p>
        ) : apiHpp ? (
          <div className="mt-3 text-sm">
            <div>HPP bahan / porsi: <b>{toIDR(apiHpp.bahan_per_porsi ?? null)}</b></div>
            <div>HPP tenaga kerja / porsi: <b>{toIDR(apiHpp.tenaga_kerja_per_porsi ?? null)}</b></div>
            <div>HPP overhead / porsi: <b>{toIDR(apiHpp.overhead_per_porsi ?? null)}</b></div>
            <div className="mt-1 border-t pt-1">
              Total HPP (API): <b>{toIDR(apiHpp.total_hpp ?? null)}</b>
            </div>
            {(apiHpp.log_id || apiHpp.timestamp) && (
              <div className="mt-1 text-xs text-gray-500">
                {apiHpp.log_id && <>log_id: {apiHpp.log_id} • </>}
                {apiHpp.timestamp && <>ts: {apiHpp.timestamp}</>}
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500 mt-2">Belum ada data—klik “Hit API”.</p>
        )}
      </section>
    </div>
  );
}
