// app/hpp/page.tsx
"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

/* ---------- Types ---------- */
type Produk = {
  id: string;
  nama_produk: string;
  porsi: number;
  harga_jual: number;
  owner: string;
};
type Bahan = {
  id: string;
  nama_bahan: string;
  harga: number | null;
  satuan: string;
  owner?: string;
};
type Komposisi = {
  id: string;
  produk_id: string;
  bahan_id: string;
  qty: number;
  unit: string;
  owner: string;
};

/** Row resmi yg dipakai FE (hasil normalisasi dari v_hpp_final) */
type VHPPFinalRow = {
  produk_id: string;
  nama_produk: string;
  hpp_bahan_per_porsi: number | null;
  overhead_per_porsi: number | null;
  tenaga_kerja_per_porsi?: number | null;
  hpp_total_per_porsi: number | null;
  target_penjualan_final?: number | null;
};

/* ---------- Helpers ---------- */
const toIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);

function numberOrNull(v: any): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/* ===== OVERHEAD PRODUK (tabel) ===== */
type OverheadProdukRow = { produk_id: string; nilai: number | null };

async function getOverheadProduk(produkId: string): Promise<OverheadProdukRow | null> {
  const { data, error } = await supabase
    .from("overhead_produk")
    .select("produk_id, nilai")
    .eq("produk_id", produkId)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as OverheadProdukRow | null;
}

async function upsertOverheadProduk(produkId: string, nilai: number | null): Promise<void> {
  const payload = { produk_id: produkId, nilai };
  const { error } = await supabase.from("overhead_produk").upsert(payload, { onConflict: "produk_id" });
  if (error) throw error;
}

/* ---------- Loader resmi: HANYA v_hpp_final (select * + normalisasi kolom) ---------- */
async function fetchHPPFinal(pid: string): Promise<VHPPFinalRow | null> {
  const { data, error } = await supabase
    .from("v_hpp_final")
    .select("*")
    .eq("produk_id", pid)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const anyRow = data as any;

  const row: VHPPFinalRow = {
    produk_id: anyRow.produk_id ?? anyRow.id ?? pid,
    nama_produk: anyRow.nama_produk ?? anyRow.produk ?? "",

    hpp_bahan_per_porsi:
      numberOrNull(anyRow.hpp_bahan_per_porsi) ??
      numberOrNull(anyRow.hpp_per_porsi) ??
      numberOrNull(anyRow.hpp_bahan) ??
      0,

    overhead_per_porsi:
      numberOrNull(anyRow.overhead_per_porsi) ??
      numberOrNull(anyRow.overhead) ??
      0,

    tenaga_kerja_per_porsi:
      numberOrNull(anyRow.tenaga_kerja_per_porsi) ??
      numberOrNull(anyRow.tenaga_kerja) ??
      null,

    hpp_total_per_porsi:
      numberOrNull(anyRow.hpp_total_per_porsi) ??
      numberOrNull(anyRow.hpp_total) ??
      (
        (numberOrNull(anyRow.hpp_bahan_per_porsi) ??
          numberOrNull(anyRow.hpp_per_porsi) ??
          0) +
        (numberOrNull(anyRow.overhead_per_porsi) ??
          numberOrNull(anyRow.overhead) ??
          0) +
        (numberOrNull(anyRow.tenaga_kerja_per_porsi) ??
          numberOrNull(anyRow.tenaga_kerja) ??
          0)
      ),

    target_penjualan_final:
      numberOrNull(anyRow.target_penjualan_final) ??
      numberOrNull(anyRow.target_penjualan) ??
      0,
  };

  return row;
}

/* ---------- Komponen OverheadCard ---------- */
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
    setSaving(true); setErr(null); setMsg(null);
    try {
      const num = val.trim() === "" ? 0 : Number(val);
      if (isNaN(num) || num < 0) throw new Error("Overhead harus angka ≥ 0");
      await upsertOverheadProduk(produkId, num);
      setMsg("Overhead tersimpan (tabel backend).");
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
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [produkList, setProdukList] = useState<Array<Pick<Produk, "id" | "nama_produk">>>([]);
  const [selectedProdukId, setSelectedProdukId] = useState<string>("");

  // Hanya pakai v_hpp_final
  const [hppRow, setHppRow] = useState<VHPPFinalRow | null>(null);

  const [komposisi, setKomposisi] = useState<
    (Komposisi & { bahan?: Pick<Bahan, "id" | "nama_bahan" | "harga"> })[]
  >([]);
  const [bahanList, setBahanList] = useState<Array<Pick<Bahan, "id" | "nama_bahan" | "satuan">>>([]);

  // detail produk untuk ringkasan profit (harga_jual & porsi disimpan di tabel produk)
  const [produkDetail, setProdukDetail] = useState<
    Pick<Produk, "id" | "nama_produk" | "porsi" | "harga_jual"> | null
  >(null);

  // form: produk
  const [namaProduk, setNamaProduk] = useState("");
  const [porsi, setPorsi] = useState<number>(1);
  const [hargaJual, setHargaJual] = useState<number>(0);

  // form: komposisi
  const [kompBahanId, setKompBahanId] = useState("");
  const [kompQty, setKompQty] = useState<number>(1);
  const [kompUnit, setKompUnit] = useState("gr");

  // UX error kecil
  const [formError, setFormError] = useState<string | null>(null);

  // Inline edit harga jual & porsi
  const [editHargaJual, setEditHargaJual] = useState<number>(0);
  const [editPorsi, setEditPorsi] = useState<number>(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id ?? null;
      setUserId(uid);
      setLoading(false);
      if (uid) {
        await Promise.all([loadProduk(uid), loadBahan(uid)]);
      }
    })();
  }, []);

  const loadProduk = async (uid: string) => {
    const { data, error } = await supabase
      .from("produk")
      .select("id,nama_produk")
      .eq("owner", uid)
      .order("nama_produk", { ascending: true });
    if (!error) setProdukList(data ?? []);
  };

  const loadBahan = async (uid: string) => {
    const { data, error } = await supabase
      .from("bahan")
      .select("id,nama_bahan,satuan")
      .eq("owner", uid)
      .order("nama_bahan", { ascending: true });
    if (!error) setBahanList(data ?? []);
  };

  /** Loader detail utk 1 produk: komposisi + v_hpp_final + produk detail */
  const loadDetailProduk = async (pid: string, uid: string) => {
    // detail produk (harga_jual & porsi)
    const { data: pRow } = await supabase
      .from("produk")
      .select("id,nama_produk,porsi,harga_jual")
      .eq("id", pid)
      .maybeSingle();
    setProdukDetail(pRow ?? null);
    setEditHargaJual(pRow?.harga_jual ?? 0);
    setEditPorsi(pRow?.porsi ?? 1);

    // komposisi + join bahan (nama_bahan + harga) → tampilan & kontrol
    const { data: rows, error: errK } = await supabase
      .from("komposisi")
      .select("id,produk_id,bahan_id,qty,unit,owner,bahan:bahan_id(id,nama_bahan,harga)")
      .eq("produk_id", pid)
      .eq("owner", uid)
      .order("id", { ascending: true });

    if (!errK) setKomposisi(rows ?? []);
    else console.warn("WARN komposisi:", errK);

    // === HPP resmi dari backend ===
    try {
      const v = await fetchHPPFinal(pid);
      // console.log("RAW v_hpp_final row:", v);
      setHppRow(v);
    } catch (e) {
      console.warn("v_hpp_final error:", e);
      setHppRow(null);
    }
  };

  useEffect(() => {
    if (userId && selectedProdukId) {
      loadDetailProduk(selectedProdukId, userId);
    } else {
      setKomposisi([]);
      setHppRow(null);
      setProdukDetail(null);
    }
    // reset form & error saat ganti produk
    setFormError(null);
    setKompBahanId("");
    setKompQty(1);
    setKompUnit("gr");
  }, [selectedProdukId, userId]);

  const handleAddProduk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    const payload = { nama_produk: namaProduk, porsi, harga_jual: hargaJual, owner: userId };
    const { error } = await supabase.from("produk").insert([payload]);
    if (!error) {
      setNamaProduk("");
      setPorsi(1);
      setHargaJual(0);
      await loadProduk(userId);
    } else {
      alert(error.message);
    }
  };

  const handleAddKomposisi = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!userId || !selectedProdukId || !kompBahanId) return;

    // Cegah duplikat bahan di produk yang sama
    const used = new Set(komposisi.map((k) => k.bahan_id));
    if (used.has(kompBahanId)) {
      setFormError("Bahan ini sudah ada di komposisi produk.");
      return;
    }
    // Validasi qty
    if (kompQty <= 0) {
      setFormError("Qty harus lebih dari 0.");
      return;
    }

    const payload = {
      produk_id: selectedProdukId,
      bahan_id: kompBahanId,
      qty: kompQty,
      unit: kompUnit,
      owner: userId,
    };
    const { error } = await supabase.from("komposisi").insert([payload]);
    if (!error) {
      setKompBahanId("");
      setKompQty(1);
      setKompUnit("gr");
      await loadDetailProduk(selectedProdukId, userId); // refetch komposisi + v_hpp_final
    } else {
      setFormError(error.message);
    }
  };

  const handleDeleteKomposisi = async (id: string) => {
    if (!userId || !selectedProdukId) return;
    setFormError(null);
    const { error } = await supabase.from("komposisi").delete().eq("id", id).eq("owner", userId);
    if (!error) await loadDetailProduk(selectedProdukId, userId);
  };

  // Simpan harga jual & porsi (metadata produk)
  const saveProdukMeta = async () => {
    if (!produkDetail) return;
    setSaving(true);
    const { error } = await supabase
      .from("produk")
      .update({ harga_jual: editHargaJual, porsi: editPorsi })
      .eq("id", produkDetail.id);
    setSaving(false);
    if (!error && userId) await loadDetailProduk(produkDetail.id, userId);
  };

  // ---- Angka untuk ringkasan (SEMUA dari v_hpp_final) ----
  const hppBahan = hppRow?.hpp_bahan_per_porsi ?? null;
  const tenagaKerja = hppRow?.tenaga_kerja_per_porsi ?? null;
  const overhead = hppRow?.overhead_per_porsi ?? null;
  const hppTotal = hppRow?.hpp_total_per_porsi ?? null;

  // Ringkasan profit: pakai HPP total dari backend
  const basisHPP = hppTotal ?? null;
  const laba = useMemo(() => {
    if (basisHPP == null || !produkDetail) return null;
    return (produkDetail.harga_jual ?? 0) - basisHPP;
  }, [basisHPP, produkDetail]);
  const margin = useMemo(() => {
    if (laba == null || !produkDetail || (produkDetail.harga_jual ?? 0) <= 0) return null;
    return Math.round((laba / (produkDetail.harga_jual ?? 1)) * 100);
  }, [laba, produkDetail]);
  const marginClass = margin == null ? "" : margin < 0 ? "text-red-600" : "text-green-700";

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold">Kalkulator HPP (sinkron backend)</h1>

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
        <p className="text-xs text-gray-500">
          Catatan: Jika kosong, kemungkinan data lama <b>owner = NULL</b> (kena RLS). Coba tambah produk baru di bawah.
        </p>
      </section>

      {/* FORM TAMBAH PRODUK */}
      <section className="border rounded-xl p-4 space-y-3">
        <h2 className="font-semibold">Tambah Produk</h2>
        <form onSubmit={handleAddProduk} className="grid gap-3 max-w-lg">
          <input
            className="border rounded p-2"
            placeholder="Nama produk"
            value={namaProduk}
            onChange={(e) => setNamaProduk(e.target.value)}
            required
          />
          <input
            className="border rounded p-2"
            type="number"
            placeholder="Porsi"
            value={porsi}
            onChange={(e) => setPorsi(Number(e.target.value))}
            min={1}
            required
          />
          <input
            className="border rounded p-2"
            type="number"
            placeholder="Harga jual"
            value={hargaJual}
            onChange={(e) => setHargaJual(Number(e.target.value))}
            min={0}
            required
          />
          <button className="rounded-lg px-4 py-2 bg-black text-white w-fit">Simpan Produk</button>
        </form>
      </section>

      {/* RINGKASAN HPP */}
      <section className="border rounded-xl p-4">
        <h2 className="font-semibold mb-2">Ringkasan HPP per Porsi (v_hpp_final)</h2>
        {selectedProdukId ? (
          <div>
            {hppRow ? (
              <div className="text-lg space-y-2">
                <div>
                  <span className="text-gray-600">Produk:</span> {hppRow.nama_produk}
                </div>

                {/* Breakdown: bahan + tenaga kerja + overhead */}
                <div className="mt-1">
                  <div className="font-medium">Breakdown</div>
                  <div className="text-sm">
                    <div>HPP bahan: {hppBahan == null ? "—" : toIDR(hppBahan)}</div>
                    <div>+ Tenaga kerja: {tenagaKerja == null ? "—" : toIDR(tenagaKerja)}</div>
                    <div>+ Overhead: {overhead == null ? "—" : toIDR(overhead)}</div>
                    <div className="border-t mt-1 pt-1">
                      <span className="font-semibold">= HPP total/porsi:</span>{" "}
                      {hppTotal == null ? "—" : toIDR(hppTotal)}
                    </div>
                  </div>

                  {/* Target penjualan dari backend */}
                  {typeof hppRow.target_penjualan_final === "number" && (
                    <div className="mt-2 text-sm">
                      <span className="text-gray-600">Target penjualan (final):</span>{" "}
                      {toIDR(hppRow.target_penjualan_final)}
                    </div>
                  )}
                </div>

                {/* Ringkasan Profit + Edit Harga Jual & Porsi */}
                {produkDetail && (
                  <div className="mt-4 border-t pt-3 text-base">
                    <div className="font-semibold mb-1">Ringkasan Profit</div>

                    <div className="grid gap-2 md:grid-cols-2 md:max-w-xl">
                      <label className="flex items-center gap-2">
                        <span className="text-gray-600 w-28">Harga jual</span>
                        <input
                          type="number"
                          className="border rounded p-2 w-full"
                          min={0}
                          value={editHargaJual}
                          onChange={(e) => setEditHargaJual(Number(e.target.value))}
                        />
                      </label>
                      <label className="flex items-center gap-2">
                        <span className="text-gray-600 w-28">Porsi</span>
                        <input
                          type="number"
                          className="border rounded p-2 w-full"
                          min={1}
                          value={editPorsi}
                          onChange={(e) => setEditPorsi(Number(e.target.value))}
                        />
                      </label>
                    </div>

                    <button
                      onClick={saveProdukMeta}
                      disabled={saving}
                      className="mt-2 rounded-lg px-4 py-2 bg-black text-white disabled:opacity-50"
                    >
                      {saving ? "Menyimpan…" : "Simpan"}
                    </button>

                    <div className="mt-3">
                      <div>
                        <span className="text-gray-600">Basis HPP:</span>{" "}
                        {basisHPP == null ? "—" : toIDR(basisHPP)}
                      </div>
                      <div>
                        <span className="text-gray-600">Laba kotor/porsi:</span>{" "}
                        {laba == null ? "—" : toIDR(laba)}
                      </div>
                      <div>
                        <span className="text-gray-600">Margin:</span>{" "}
                        <span className={marginClass}>{margin == null ? "—" : `${margin}%`}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* ===== Overhead editor (update tabel → refetch view) ===== */}
                <div className="mt-4">
                  <OverheadCard
                    produkId={produkDetail?.id}
                    currentOverhead={overhead}
                    onSaved={() => {
                      if (userId && produkDetail) {
                        loadDetailProduk(produkDetail.id, userId); // refresh v_hpp_final
                      }
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-500">
                Belum ada data di <code>v_hpp_final</code> untuk produk ini. Pastikan backend view
                sudah include produk kamu & RLS sesuai.
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm text-gray-500">Pilih produk dulu.</div>
        )}
      </section>

      {/* KOMPOSISI */}
      <section className="border rounded-xl p-4 space-y-3">
        <h2 className="font-semibold">Komposisi</h2>
        {selectedProdukId ? (
          <>
            <table className="w-full text-sm border">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left p-2 border">Bahan</th>
                  <th className="text-left p-2 border">Qty</th>
                  <th className="text-left p-2 border">Unit</th>
                  <th className="text-left p-2 border">Subtotal (info)</th>
                  <th className="p-2 border">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {komposisi.map((k) => {
                  const hargaBahan = k.bahan?.harga ?? 0;
                  const subtotal = (hargaBahan || 0) * (k.qty || 0);

                  return (
                    <tr key={k.id}>
                      <td className="p-2 border">{k.bahan?.nama_bahan ?? k.bahan_id}</td>
                      <td className="p-2 border">{k.qty}</td>
                      <td className="p-2 border">{k.unit}</td>
                      <td className="p-2 border">{toIDR(Math.max(0, Math.round(subtotal)))}</td>
                      <td className="p-2 border text-center">
                        <button
                          className="text-red-600"
                          onClick={() => handleDeleteKomposisi(k.id)}
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {komposisi.length === 0 && (
                  <tr>
                    <td className="p-2 border text-sm text-gray-500" colSpan={5}>
                      Belum ada komposisi.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Form tambah komposisi */}
            <form onSubmit={handleAddKomposisi} className="grid gap-3 grid-cols-1 md:grid-cols-5 mt-3">
              <select
                className="border rounded p-2"
                value={kompBahanId}
                onChange={(e) => {
                  const id = e.target.value;
                  setKompBahanId(id);
                  const b = bahanList.find((x) => x.id === id);
                  if (b?.satuan) setKompUnit(b.satuan); // auto set unit dari bahan.satuan
                  setFormError(null);
                }}
                required
              >
                <option value="">— pilih bahan —</option>
                {bahanList.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nama_bahan} ({b.satuan})
                  </option>
                ))}
              </select>
              <input
                className="border rounded p-2"
                type="number"
                step="0.01"
                placeholder="Qty"
                value={kompQty}
                onChange={(e) => setKompQty(Number(e.target.value))}
                min={0.01}
                required
              />
              <input
                className="border rounded p-2"
                placeholder="Unit (auto dari bahan, boleh ubah)"
                value={kompUnit}
                onChange={(e) => setKompUnit(e.target.value)}
                required
              />
              <div className="self-center text-sm text-gray-500">
                Harga: ikut master bahan • Subtotal hanya informasi (HPP resmi dari backend).
              </div>
              <button
                className="rounded-lg px-4 py-2 bg-black text-white disabled:opacity-50"
                disabled={!kompBahanId || kompQty <= 0}
              >
                Tambah
              </button>
            </form>
            {formError && <p className="text-sm text-red-600 mt-2">{formError}</p>}
          </>
        ) : (
          <div className="text-sm text-gray-500">Pilih produk dulu.</div>
        )}
      </section>
    </div>
  );
}
