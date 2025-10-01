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
/** HPP final dari backend (+fallback fields) */
type VHPP = {
  produk_id: string;
  produk: string;
  hpp_per_porsi: number | null;      // bahan per porsi
  tenaga_kerja?: number | null;      // (opsional, belum dipakai Backend)
  overhead?: number | null;          // overhead per porsi
  hpp_total?: number | null;         // total per porsi
  target_penjualan_final?: number | null; // NEW dari v_hpp_final
};

/* ---------- Helpers ---------- */
const toIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);

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

/* ---------- HPP resolver PRIORITAS v_hpp_final ---------- */
async function loadHppResolved(pid: string): Promise<VHPP | null> {
  // 1) PRIORITAS: v_hpp_final dari backend
  try {
    const { data: f, error: ef } = await supabase
      .from("v_hpp_final")
      .select(
        "produk_id, nama_produk, hpp_bahan_per_porsi, overhead_per_porsi, hpp_total_per_porsi, target_penjualan_final"
      )
      .eq("produk_id", pid)
      .maybeSingle();

    if (ef) throw ef;
    if (f) {
      return {
        produk_id: f.produk_id,
        produk: f.nama_produk,
        hpp_per_porsi: f.hpp_bahan_per_porsi ?? 0,
        overhead: f.overhead_per_porsi ?? 0,
        tenaga_kerja: null,
        hpp_total:
          f.hpp_total_per_porsi ??
          ((f.hpp_bahan_per_porsi ?? 0) + (f.overhead_per_porsi ?? 0)),
        target_penjualan_final: f.target_penjualan_final ?? null,
      };
    }
  } catch (e) {
    console.warn("v_hpp_final error:", e);
  }

  // 2) Fallback: v_hpp (lama) + overhead_produk
  try {
    const { data: vRows, error: errV } = await supabase
      .from("v_hpp")
      .select("*")
      .eq("produk_id", pid)
      .limit(1);
    if (errV) throw errV;

    const vhpp = (vRows?.[0] ?? null) as VHPP | null;
    if (!vhpp) return null;

    const oh = await getOverheadProduk(pid);
    const overheadVal = Number(oh?.nilai ?? 0);
    const hppBahan = Number(vhpp.hpp_per_porsi ?? 0);

    return {
      ...vhpp,
      overhead: overheadVal,
      hpp_total: typeof vhpp.hpp_total === "number" ? vhpp.hpp_total : hppBahan + overheadVal,
    } as VHPP;
  } catch (e) {
    console.warn("fallback v_hpp+overhead error:", e);
    return null;
  }
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
        Disimpan ke tabel <code>overhead_produk</code> dan dipakai backend (<code>v_hpp_final</code>).
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

  const [hpp, setHpp] = useState<VHPP | null>(null);
  const [komposisi, setKomposisi] = useState<
    (Komposisi & { bahan?: Pick<Bahan, "id" | "nama_bahan" | "harga"> })[]
  >([]);
  const [bahanList, setBahanList] = useState<Array<Pick<Bahan, "id" | "nama_bahan" | "satuan">>>([]);

  // detail produk untuk ringkasan profit
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

    // komposisi + join bahan (nama_bahan + harga)
    const { data: rows, error: errK } = await supabase
      .from("komposisi")
      .select("id,produk_id,bahan_id,qty,unit,owner,bahan:bahan_id(id,nama_bahan,harga)")
      .eq("produk_id", pid)
      .eq("owner", uid)
      .order("id", { ascending: true });

    if (!errK) setKomposisi(rows ?? []);
    else console.warn("WARN komposisi:", errK);

    // === RINGKASAN HPP: v_hpp_final -> fallback (view lama) ===
    const resolved = await loadHppResolved(pid);
    if (resolved) {
      setHpp(resolved);
      return;
    }

    // === Fallback ke-3: client-side hitung dari komposisi (kalau semua view tidak terbaca) ===
    const list = rows ?? [];
    const hppBahanLocal = list.reduce((sum, k) => {
      const harga = Number(k?.bahan?.harga ?? 0);
      const qty = Number(k?.qty ?? 0);
      return sum + harga * qty;
    }, 0);

    try {
      // coba prefill dari view overhead; kalau tidak ada, jatuh ke tabel
      let overheadVal = 0;
      try {
        const { data: ov } = await supabase
          .from("v_biaya_overhead_per_produk")
          .select("produk_id, overhead_per_porsi")
          .eq("produk_id", pid)
          .maybeSingle();
        overheadVal = Number(ov?.overhead_per_porsi ?? 0);
      } catch {
        const oh = await getOverheadProduk(pid);
        overheadVal = Number(oh?.nilai ?? 0);
      }

      setHpp({
        produk_id: pid,
        produk: pRow?.nama_produk ?? "",
        hpp_per_porsi: hppBahanLocal,
        tenaga_kerja: null,
        overhead: overheadVal,
        hpp_total: hppBahanLocal + overheadVal,
        target_penjualan_final: null,
      });
    } catch (e) {
      console.warn("client-side fallback error", e);
      setHpp({
        produk_id: pid,
        produk: pRow?.nama_produk ?? "",
        hpp_per_porsi: hppBahanLocal,
        tenaga_kerja: null,
        overhead: null,
        hpp_total: hppBahanLocal,
        target_penjualan_final: null,
      });
    }
  };

  useEffect(() => {
    if (userId && selectedProdukId) {
      loadDetailProduk(selectedProdukId, userId);
    } else {
      setKomposisi([]);
      setHpp(null);
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

  // bahan yang sudah dipakai pada produk terpilih
  const usedBahanIds = useMemo(() => new Set(komposisi.map((k) => k.bahan_id)), [komposisi]);

  const handleAddKomposisi = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!userId || !selectedProdukId || !kompBahanId) return;

    // Cegah duplikat bahan di produk yang sama
    if (usedBahanIds.has(kompBahanId)) {
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
      await loadDetailProduk(selectedProdukId, userId);
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

  // Simpan harga jual & porsi
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

  // ---- Angka untuk ringkasan ----
  const hppBahan = hpp?.hpp_per_porsi ?? null;
  const tenagaKerja = (hpp as VHPP | null)?.tenaga_kerja ?? null;
  const overhead = (hpp as VHPP | null)?.overhead ?? null;
  const hppTotal = useMemo(() => {
    const v = (hpp as VHPP | null)?.hpp_total ?? null;
    if (typeof v === "number") return v;
    if (
      typeof hppBahan === "number" &&
      (tenagaKerja == null || typeof tenagaKerja === "number") &&
      (overhead == null || typeof overhead === "number")
    ) {
      const t = (tenagaKerja ?? 0) + (overhead ?? 0);
      return hppBahan + t;
    }
    return null;
  }, [hpp, hppBahan, tenagaKerja, overhead]);

  // Ringkasan profit: pakai HPP total kalau ada, fallback HPP bahan
  const basisHPP = hppTotal ?? hppBahan ?? null;
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
      <h1 className="text-2xl font-bold">Kalkulator HPP</h1>

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
        <h2 className="font-semibold mb-2">Ringkasan HPP per Porsi</h2>
        {selectedProdukId ? (
          <div>
            {hpp ? (
              <div className="text-lg space-y-2">
                <div>
                  <span className="text-gray-600">Produk:</span> {hpp.produk}
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
                  {typeof hpp.target_penjualan_final === "number" && (
                    <div className="mt-2 text-sm">
                      <span className="text-gray-600">Target penjualan (final):</span>{" "}
                      {toIDR(hpp.target_penjualan_final)}
                    </div>
                  )}

                  {(tenagaKerja == null || overhead == null) && (
                    <div className="text-xs text-amber-600 mt-1">
                      Catatan: Kolom tenaga kerja/overhead bisa kosong jika sumber view belum menyediakan.
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

                {/* ===== Overhead editor ===== */}
                <div className="mt-4">
                  <OverheadCard
                    produkId={produkDetail?.id}
                    currentOverhead={overhead}
                    onSaved={() => {
                      if (userId && produkDetail) {
                        loadDetailProduk(produkDetail.id, userId); // refresh angka
                      }
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-500">
                Belum ada data HPP untuk produk ini (cek komposisi atau tanya backend apakah view perlu refresh).
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
                  <th className="text-left p-2 border">Subtotal</th>
                  <th className="text-left p-2 border">%</th>
                  <th className="p-2 border">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {komposisi.map((k) => {
                  const hargaBahan = k.bahan?.harga ?? 0;
                  const subtotal = (hargaBahan || 0) * (k.qty || 0);
                  const contrib =
                    basisHPP && basisHPP > 0
                      ? Math.round((subtotal / basisHPP) * 100)
                      : null;

                  return (
                    <tr key={k.id}>
                      <td className="p-2 border">{k.bahan?.nama_bahan ?? k.bahan_id}</td>
                      <td className="p-2 border">{k.qty}</td>
                      <td className="p-2 border">{k.unit}</td>
                      <td className="p-2 border">{toIDR(Math.max(0, Math.round(subtotal)))}</td>
                      <td className="p-2 border">{contrib == null ? "—" : `${contrib}%`}</td>
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
                    <td className="p-2 border text-sm text-gray-500" colSpan={6}>
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
                {bahanList.map((b) => {
                  const already = usedBahanIds.has(b.id);
                  return (
                    <option key={b.id} value={b.id} disabled={already}>
                      {b.nama_bahan} ({b.satuan}){already ? " — sudah dipakai" : ""}
                    </option>
                  );
                })}
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
                Harga: ikut master bahan • Unit otomatis
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
