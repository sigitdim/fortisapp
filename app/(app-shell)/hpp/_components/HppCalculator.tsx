"use client";

import { useEffect, useMemo, useState } from "react";
import { rupiah } from "@/lib/format";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://api.fortislab.id";
const DEFAULT_OWNER_ID =
  process.env.NEXT_PUBLIC_OWNER_ID || "f6269e9a-bc6d-4f8b-aa45-08affc769e5a";

/** ====== TYPES ====== */
type Bahan = {
  id: string;
  nama_bahan: string;
  satuan?: string | null;
  harga?: number | null; // harga per satuan (server)
};

type Row = {
  id: string;
  bahan_id?: string | null;
  nama?: string;
  unit?: string;
  qty: number;
  hargaPerUnit?: number;
  harga?: number;
};

/** ====== CONST ====== */
const UNITS = ["gram", "ml", "pcs"] as const;
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

/** ====== OWNER HELPERS ====== */
function getOwnerId(): string {
  try {
    return (
      (typeof window !== "undefined" && (localStorage.getItem("owner_id") || sessionStorage.getItem("owner_id"))) ||
      DEFAULT_OWNER_ID ||
      ""
    );
  } catch {
    return DEFAULT_OWNER_ID || "";
  }
}

export default function HppCalculator() {
  /** ====== OWNER ====== */
  const [ownerId, setOwnerId] = useState<string>("");

  useEffect(() => {
    const id = getOwnerId();
    setOwnerId(id);
  }, []);

  useEffect(() => {
    if (!ownerId) return;
    try {
      localStorage.setItem("owner_id", ownerId);
    } catch {}
  }, [ownerId]);

  /** ====== STATE ====== */
  const [bahanList, setBahanList] = useState<Bahan[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ ok?: string; err?: string } | null>(null);

  const [namaMenu, setNamaMenu] = useState("");
  const [rows, setRows] = useState<Row[]>([{ id: uid(), nama: "", unit: "gram", qty: 0, harga: 0 }]);

  const [overhead, setOverhead] = useState<number>(4200);
  const [targetHarga, setTargetHarga] = useState<number>(18000);
  const [ppn, setPpn] = useState(false);
  const [fee, setFee] = useState(false);
  const [saving, setSaving] = useState(false);

  /** ====== FETCH /setup/bahan ====== */
  async function loadBahan() {
    setLoading(true);
    setMsg(null);
    try {
      const hdr = ownerId || DEFAULT_OWNER_ID;
      const res = await fetch(`${API_BASE}/setup/bahan`, {
        headers: { "x-owner-id": hdr, "Content-Type": "application/json" },
        cache: "no-store",
      });

      const text = await res.text();
      let json: any;
      try {
        json = JSON.parse(text);
      } catch {
        json = text;
      }

      const raw = Array.isArray(json) ? json : json?.data ?? [];
      const data: Bahan[] = (raw as any[]).map((x: any) => ({
        id: String(x.id ?? x.bahan_id ?? ""),
        nama_bahan: String(x.nama_bahan ?? x.nama ?? ""),
        satuan: String(x.satuan ?? x.unit ?? ""),
        // fallback harga: prioritaskan x.harga; jika tidak ada, coba harga_beli/price
        harga: Number(x.harga ?? x.harga_beli ?? x.price ?? 0),
      }));

      setBahanList(data);
      if (!data.length) setMsg({ err: "Data bahan kosong. Cek Owner ID / BE." });
    } catch (e: any) {
      setMsg({ err: e?.message || "Gagal memuat bahan." });
      setBahanList([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (ownerId) loadBahan();
  }, [ownerId]);

  /** ====== HITUNG ====== */
  const recalc = (r: Row): Row => {
    const harga = Math.max(0, Math.round((r.hargaPerUnit ?? 0) * (r.qty || 0)));
    return { ...r, harga };
  };

  const updateRow = (id: string, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? recalc({ ...r, ...patch }) : r)));

  const addRow = () =>
    setRows((prev) => [...prev, { id: uid(), nama: "", unit: "gram", qty: 0, harga: 0 }]);

  const delRow = (id: string) =>
    setRows((prev) => (prev.length === 1 ? prev : prev.filter((r) => r.id !== id)));

  const pickBahan = (rowId: string, bahanId: string) => {
    const b = bahanList.find((x) => x.id === bahanId);
    setRows((prev) =>
      prev.map((r) =>
        r.id === rowId
          ? recalc({
              ...r,
              bahan_id: b?.id,
              nama: b?.nama_bahan || "",
              unit: b?.satuan || "gram",
              hargaPerUnit: Number(b?.harga || 0),
            })
          : r
      )
    );
  };

  const totalBahan = useMemo(
    () => rows.reduce((s, r) => s + Number(r.harga || 0), 0),
    [rows]
  );

  const totalHpp = useMemo(() => Math.max(0, totalBahan + Number(overhead || 0)), [totalBahan, overhead]);

  // Rekomendasi tombol cepat
  const hargaKomp = useMemo(() => Math.max(0, Math.round(totalHpp * 1.6)), [totalHpp]);
  const hargaStd = useMemo(() => Math.max(0, Math.round(totalHpp * 1.8)), [totalHpp]);
  const hargaPrem = useMemo(() => Math.max(0, Math.round(totalHpp * 2.2)), [totalHpp]);

  const afterTax = useMemo(() => Math.round(targetHarga * (ppn ? 1.1 : 1)), [targetHarga, ppn]);
  const online = useMemo(() => Math.round(afterTax * (fee ? 1.2006 : 1)), [afterTax, fee]); // ±20.06%

  const profit = useMemo(() => Math.max(0, targetHarga - totalHpp), [targetHarga, totalHpp]);
  const marginPct = useMemo(
    () => (targetHarga > 0 ? Math.round((profit / targetHarga) * 100) : 0),
    [profit, targetHarga]
  );

  /** ====== SAVE (optional, tetap sesuai kontrak lama) ====== */
  async function handleSave() {
    setSaving(true);
    setMsg(null);
    try {
      const hdr = ownerId || DEFAULT_OWNER_ID;
      const items = rows
        .filter((r) => r.bahan_id && r.qty > 0 && r.unit)
        .map((r) => ({ bahan_id: r.bahan_id!, qty: r.qty, unit: r.unit! }));

      if (!items.length) throw new Error("Pilih bahan dan isi qty dulu.");

      const res = await fetch(`${API_BASE}/setup/bom`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-owner-id": hdr },
        body: JSON.stringify({ produk: (namaMenu || "Produk Tanpa Nama").trim(), items }),
      });

      if (!res.ok) throw new Error(`POST /setup/bom ${res.status}`);
      setMsg({ ok: "BOM tersimpan ✅" });
    } catch (e: any) {
      setMsg({ err: e?.message || "Gagal simpan BOM." });
    } finally {
      setSaving(false);
    }
  }

  /** ====== UI ====== */
  return (
    <div className="px-4 pt-4 md:px-6 md:pt-4 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl md:text-[28px] font-extrabold tracking-tight">Kalkulator HPP</h1>
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-neutral-500">Owner ID</span>
          <input
            value={ownerId}
            onChange={(e) => setOwnerId(e.target.value.trim())}
            placeholder="UUID owner"
            className="h-9 w-[260px] rounded-lg border px-2 outline-none"
          />
          <button
            onClick={loadBahan}
            className="inline-flex h-9 items-center gap-2 rounded-lg border px-3"
          >
            ⟳ Refresh Bahan
          </button>
        </div>
      </div>

      {msg?.err && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {msg.err}
        </div>
      )}
      {msg?.ok && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
          {msg.ok}
        </div>
      )}

      {/* Card utama */}
      <div className="rounded-2xl bg-white p-4 md:p-5 shadow-sm border">
        {/* Nama Menu */}
        <label className="block text-sm text-neutral-700 mb-2">Nama Menu</label>
        <input
          value={namaMenu}
          onChange={(e) => setNamaMenu(e.target.value)}
          className="w-full rounded-xl border px-3 py-2 mb-6 focus:outline-none focus:ring-2 focus:ring-gray-200"
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Komposisi */}
          <div className="lg:col-span-2">
            <div className="grid grid-cols-12 text-sm font-semibold text-neutral-700 px-2">
              <div className="col-span-5">Nama Resep</div>
              <div className="col-span-2 text-right">Qty.</div>
              <div className="col-span-2">Satuan</div>
              <div className="col-span-2 text-right">Harga</div>
              <div className="col-span-1" />
            </div>

            <div className="divide-y">
              {rows.map((r) => (
                <div key={r.id} className="grid grid-cols-12 items-center gap-2 py-3">
                  {/* pilih bahan */}
                  <div className="col-span-5">
                    <select
                      value={r.bahan_id ?? ""}
                      onChange={(e) => pickBahan(r.id, e.target.value)}
                      className="w-full rounded-xl border px-3 py-2 bg-white"
                    >
                      <option value="">{loading ? "Memuat bahan..." : "— pilih bahan —"}</option>
                      {bahanList.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.nama_bahan}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* qty */}
                  <div className="col-span-2">
                    <input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      value={r.qty}
                      onChange={(e) => updateRow(r.id, { qty: Number(e.target.value || 0) })}
                      className="w-full rounded-xl border px-3 py-2 text-right"
                    />
                  </div>

                  {/* unit */}
                  <div className="col-span-2">
                    <select
                      value={r.unit ?? ""}
                      onChange={(e) => updateRow(r.id, { unit: e.target.value })}
                      className="w-full rounded-xl border px-3 py-2 bg-white"
                    >
                      <option value={r.unit ?? ""}>{r.unit ?? "satuan"}</option>
                      {UNITS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                    <div className="mt-1 text-[11px] text-neutral-500">
                      {r.hargaPerUnit ? `@ ${rupiah(r.hargaPerUnit)} / ${r.unit}` : "—"}
                    </div>
                  </div>

                  {/* subtotal */}
                  <div className="col-span-2 text-right font-medium">{rupiah(r.harga)}</div>

                  {/* delete */}
                  <div className="col-span-1 text-right">
                    <button
                      onClick={() => delRow(r.id)}
                      className="px-3 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                      title="Hapus baris"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Tambah baris */}
            <div className="mt-4">
              <button
                onClick={addRow}
                className="px-4 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-sm font-semibold"
              >
                Tambah +
              </button>
            </div>
          </div>

          {/* Kartu total */}
          <aside className="lg:col-span-1">
            <div className="rounded-2xl border p-3 md:p-4">
              <ul className="space-y-2 text-[14px]">
                <li className="flex items-center justify-between">
                  <span className="text-neutral-600">Total Harga Bahan</span>
                  <span className="font-medium">{rupiah(totalBahan)}</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-neutral-600">Total Overhead</span>
                  <span className="font-semibold">{rupiah(overhead)}</span>
                </li>
                <li className="mt-1 border-t pt-2 text-[16px] font-semibold flex items-center justify-between">
                  <span>Total HPP</span>
                  <span className="font-extrabold">{rupiah(totalHpp)}</span>
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </div>

      {/* Target & Profit */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
        {/* Target Harga Jual */}
        <section className="rounded-2xl bg-white p-4 md:p-5 shadow-sm border">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-[16px] font-semibold">Target Harga Jual</div>
            <button className="rounded-md bg-rose-100 px-3 py-1 text-[12px] font-semibold text-rose-700">
              Bantuan AI ✨
            </button>
          </div>

          <input
            type="number"
            inputMode="numeric"
            value={targetHarga}
            onChange={(e) => setTargetHarga(Number(e.target.value || 0))}
            className="mb-3 h-11 w-full rounded-xl border px-4 text-[15px] outline-none"
          />

          <div className="grid grid-cols-3 gap-2 text-center">
            <button onClick={() => setTargetHarga(hargaKomp)} className="rounded-xl border px-3 py-2">
              {rupiah(hargaKomp)}
            </button>
            <button onClick={() => setTargetHarga(hargaStd)} className="rounded-xl bg-red-600 text-white px-3 py-2">
              {rupiah(hargaStd)}
            </button>
            <button onClick={() => setTargetHarga(hargaPrem)} className="rounded-xl border px-3 py-2">
              {rupiah(hargaPrem)}
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-4 text-[13px]">
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={ppn} onChange={(e) => setPpn(e.target.checked)} />
              Pajak 10% (PB1)
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={fee} onChange={(e) => setFee(e.target.checked)} />
              Fee Channel (Grab/GoFood/ShopeeFood)
            </label>
          </div>
        </section>

        {/* Estimasi Profit */}
        <aside className="rounded-2xl bg-white p-4 md:p-5 shadow-sm border">
          <div className="text-[16px] font-semibold mb-2">Estimasi Profit</div>
          <div className="text-[32px] font-extrabold leading-none">{rupiah(profit)}</div>
          <div className="mt-1 text-[13px]">
            <span className="font-semibold text-green-600">Profit Margin {marginPct}%</span>
          </div>

          <div className="mt-3 space-y-1 text-[13px]">
            <div><span className="font-semibold">After Tax:</span> {rupiah(afterTax)}</div>
            <div><span className="font-semibold">Online:</span> {rupiah(online)}</div>
          </div>

          <button
            disabled={saving}
            onClick={handleSave}
            className="mt-4 h-11 w-full rounded-xl bg-[#b0002f] text-[14px] font-semibold text-white disabled:opacity-60"
          >
            {saving ? "Menyimpan..." : "Simpan 💾"}
          </button>
        </aside>
      </div>
    </div>
  );
}
