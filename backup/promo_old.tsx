// app/(auth-guard)/promo/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type HistoryItem = {
  nama_produk: string;
  type: "diskon" | "b1g1" | "tebus" | "bundling" | string;
  flag: "aman" | "tipis" | "bahaya" | string;
  notes?: string | null;
  created_at: string;
};

const toIDR = (n: number | null | undefined) =>
  n == null ? "—" : new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(n));

const badgeCls = (flag: string) =>
  flag === "aman"
    ? "bg-green-100 text-green-700 border-green-200"
    : flag === "tipis"
    ? "bg-yellow-100 text-yellow-700 border-yellow-200"
    : flag === "bahaya"
    ? "bg-red-100 text-red-700 border-red-200"
    : "bg-gray-100 text-gray-700 border-gray-200";

export default function PromoPage() {
  const [ownerId, setOwnerId] = useState("");
  const [produk, setProduk] = useState<{ id: string; nama_produk: string }[]>([]);
  const [selectedProdukId, setSelectedProdukId] = useState("");

  // HISTORY
  const [typeFilter, setTypeFilter] = useState("");
  const [range, setRange] = useState<[number, number]>([0, 49]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [hLoading, setHLoading] = useState(false);
  const [hErr, setHErr] = useState<string | null>(null);

  // CALCULATOR
  const [promoType, setPromoType] = useState<"diskon" | "b1g1" | "tebus" | "bundling">("diskon");
  // parameter fleksibel sesuai tipe
  const [percent, setPercent] = useState<string>("");   // diskon %
  const [nominal, setNominal] = useState<string>("");   // diskon nominal
  const [buyQty, setBuyQty] = useState<string>("1");    // b1g1
  const [getQty, setGetQty] = useState<string>("1");    // b1g1
  const [tebusPrice, setTebusPrice] = useState<string>(""); // tebus murah
  const [bundlePrice, setBundlePrice] = useState<string>(""); // bundling (1 produk versi simple)
  const [submitRes, setSubmitRes] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [calcErr, setCalcErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user?.id) setOwnerId(data.user.id);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("produk").select("id,nama_produk").order("nama_produk", { ascending: true });
      if (!error) setProduk(data ?? []);
    })();
  }, []);

  async function loadHistory() {
    if (!ownerId) return;
    setHLoading(true);
    setHErr(null);
    const qs = new URLSearchParams();
    if (typeFilter) qs.set("type", typeFilter);
    qs.set("from", String(range[0]));
    qs.set("to", String(range[1]));
    try {
      const r = await fetch(`/api/logs/promo?${qs.toString()}`, { headers: { "x-owner-id": ownerId } });
      const j = await r.json();
      if (!r.ok || j?.ok === false) throw new Error(j?.message || `HTTP ${r.status}`);
      setHistory(j.data ?? []);
    } catch (e: any) {
      setHErr(e?.message || "Gagal memuat riwayat promo");
    } finally {
      setHLoading(false);
    }
  }
  useEffect(() => { loadHistory(); /* eslint-disable-next-line */ }, [ownerId, typeFilter, range]);

  const hasMore = useMemo(() => history.length >= (range[1] - range[0] + 1), [history, range]);

  async function submitPromo() {
    setSubmitting(true);
    setCalcErr(null);
    setSubmitRes(null);
    try {
      if (!ownerId) throw new Error("Owner belum terautentikasi");
      if (!selectedProdukId) throw new Error("Pilih produk dulu");

      // payload fleksibel; BE sudah rapi & siap konsumsi
      const payload: any = { type: promoType, produk_id: selectedProdukId };

      if (promoType === "diskon") {
        if (percent) payload.percent = Number(percent);         // contoh: 15 → diskon 15%
        if (nominal) payload.nominal = Number(nominal);         // contoh: 3000 → diskon Rp3.000
      } else if (promoType === "b1g1") {
        payload.buy_qty = Math.max(1, Number(buyQty || "1"));
        payload.get_qty = Math.max(1, Number(getQty || "1"));
      } else if (promoType === "tebus") {
        payload.tebus_price = Number(tebusPrice);
      } else if (promoType === "bundling") {
        payload.bundle_price = Number(bundlePrice);
      }

      const r = await fetch(`/api/promo`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-owner-id": ownerId },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (!r.ok || j?.ok === false) throw new Error(j?.message || `HTTP ${r.status}`);
      setSubmitRes(j);
      // refresh history agar log terbaru muncul
      setRange([0, 49]);
      await loadHistory();
    } catch (e: any) {
      setCalcErr(e?.message || "Gagal menghitung promo");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">Promo</h1>

      {/* Kalkulator */}
      <section className="rounded-2xl border bg-white p-4 space-y-4">
        <div className="font-medium">Calculator Promo (otomatis log ke DB)</div>

        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-sm">
            <div className="text-gray-600 mb-1">Produk</div>
            <select className="border rounded-lg px-3 py-2 w-full" value={selectedProdukId} onChange={(e) => setSelectedProdukId(e.target.value)}>
              <option value="">— pilih —</option>
              {produk.map((p) => (
                <option key={p.id} value={p.id}>{p.nama_produk}</option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <div className="text-gray-600 mb-1">Tipe promo</div>
            <select className="border rounded-lg px-3 py-2 w-full" value={promoType} onChange={(e) => setPromoType(e.target.value as any)}>
              <option value="diskon">Diskon</option>
              <option value="b1g1">B1G1</option>
              <option value="tebus">Tebus Murah</option>
              <option value="bundling">Bundling</option>
            </select>
          </label>

          {/* parameter utama per tipe */}
          {promoType === "diskon" && (
            <div className="grid grid-cols-2 gap-3">
              <input className="border rounded-lg px-3 py-2" placeholder="% (opsional)" value={percent} onChange={(e) => setPercent(e.target.value)} />
              <input className="border rounded-lg px-3 py-2" placeholder="Rp nominal (opsional)" value={nominal} onChange={(e) => setNominal(e.target.value)} />
            </div>
          )}
          {promoType === "b1g1" && (
            <div className="grid grid-cols-2 gap-3">
              <input className="border rounded-lg px-3 py-2" placeholder="Buy qty" value={buyQty} onChange={(e) => setBuyQty(e.target.value)} />
              <input className="border rounded-lg px-3 py-2" placeholder="Get qty" value={getQty} onChange={(e) => setGetQty(e.target.value)} />
            </div>
          )}
          {promoType === "tebus" && (
            <input className="border rounded-lg px-3 py-2" placeholder="Harga tebus" value={tebusPrice} onChange={(e) => setTebusPrice(e.target.value)} />
          )}
          {promoType === "bundling" && (
            <input className="border rounded-lg px-3 py-2" placeholder="Harga bundling" value={bundlePrice} onChange={(e) => setBundlePrice(e.target.value)} />
          )}
        </div>

        <div className="flex gap-2">
          <button onClick={submitPromo} disabled={submitting || !selectedProdukId} className="rounded-lg bg-black text-white px-4 py-2 disabled:opacity-50">
            {submitting ? "Menghitung…" : "Hitung & Log"}
          </button>
          <button onClick={() => setSubmitRes(null)} className="rounded-lg border px-4 py-2">Clear</button>
        </div>

        {calcErr && <div className="text-sm text-red-600">{calcErr}</div>}
        {submitRes && (
          <div className="text-sm rounded-xl border p-3 bg-neutral-50 overflow-auto">
            <div className="mb-1">Hasil:</div>
            <pre className="text-xs">{JSON.stringify(submitRes, null, 2)}</pre>
          </div>
        )}
      </section>

      {/* Riwayat */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-medium">Riwayat Promo</div>
          <div className="flex items-center gap-2">
            <select className="border rounded-lg px-3 py-2 text-sm" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="">Semua tipe</option>
              <option value="diskon">Diskon</option>
              <option value="b1g1">B1G1</option>
              <option value="tebus">Tebus</option>
              <option value="bundling">Bundling</option>
            </select>
            <button onClick={() => setRange(([a,b]) => [Math.max(0, a-50), Math.max(49, b-50)])} className="border rounded-lg px-3 py-2 text-sm" disabled={range[0] === 0}>← Prev</button>
            <button onClick={() => setRange(([a,b]) => [a+50, b+50])} className="border rounded-lg px-3 py-2 text-sm" disabled={!hasMore}>Next →</button>
          </div>
        </div>

        {hErr && <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 p-3 text-sm">{hErr}</div>}
        {hLoading && <div className="text-sm text-gray-500">Loading…</div>}
        {!hLoading && history.length === 0 && <div className="text-sm text-gray-500">Belum ada log.</div>}

        <div className="rounded-2xl border overflow-hidden">
          <div className="grid grid-cols-12 px-4 py-2 text-xs text-gray-500 border-b bg-gray-50">
            <div className="col-span-4">Produk</div>
            <div className="col-span-2">Tipe</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-4">Waktu</div>
          </div>
          {history.map((it, i) => (
            <div key={i} className="grid grid-cols-12 px-4 py-3 border-b last:border-b-0">
              <div className="col-span-4">
                <div className="font-medium">{it.nama_produk}</div>
                {it.notes && <div className="text-xs text-gray-500">{it.notes}</div>}
              </div>
              <div className="col-span-2 capitalize">{it.type}</div>
              <div className="col-span-2">
                <span className={`text-xs px-2 py-1 rounded-full border ${badgeCls(it.flag)}`}>{it.flag}</span>
              </div>
              <div className="col-span-4">
                {new Date(it.created_at).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
