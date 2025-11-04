// @ts-nocheck
// app/pricing/page.tsx

"use client";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "default-no-store";

import { Suspense } from "react";
import PricingClient from "./PricingClient";

export default function PricingPage() {
  return (
    <Suspense fallback={<div className="p-4">Loading pricing…</div>}>
      <PricingClient />
    </Suspense>
  );
}


/* ========= Types ========= */
type PricingRow = {
  produk_id: string;
  nama_produk: string;
  hpp_total_per_porsi: number | null;

  // rekomendasi dari backend (tanpa eko)
  harga_rek_standar?: number | null;
  harga_rek_premium?: number | null;

  // kolom tampilan (default = standar; untuk kompatibilitas lama)
  harga_rekomendasi: number | null;

  harga_jual_user: number | null;
  profit_user_per_porsi: number | null;
  margin_user_persen: number | null;
};

// Data HPP final (NORMALIZED - sudah di-flatten dari response API apapun)
export type HppFinal = {
  ok: boolean;
  owner_id?: string;
  produk_id?: string;
  hpp?: {
    bahan_per_porsi?: number | null;
    overhead_per_porsi?: number | null;
    tenaga_kerja_per_porsi?: number | null;
  };
  note?: string;
  total_hpp?: number | null;
  nama_produk?: string | null;
};

/* ========= Config ========= */
const MARGIN_MIN = 20; // target minimal margin (%)
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL.trim() !== ""
    ? process.env.NEXT_PUBLIC_API_URL
    : "https://api.fortislab.id";

/* ========= Helpers ========= */
const fmt = (n: number | null | undefined) =>
  n == null ? "-" : new Intl.NumberFormat("id-ID").format(n);

const rupiah = (n: number | null | undefined) =>
  n == null
    ? "-"
    : new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }).format(n || 0);

const num = (v: any) => {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const equalish = (a?: number | null, b?: number | null, tol = 1) => {
  if (a == null || b == null) return false;
  return Math.abs(a - b) <= tol;
};

/* ========= Data loader ========= */
async function fetchPricingView(): Promise<PricingRow[]> {
  const { data, error } = await supabase.from("v_pricing_final").select("*");
  if (error) throw error;

  const rows = (data ?? []).map((r: any) => ({
    produk_id: r.produk_id ?? r.id,
    nama_produk: r.nama_produk ?? r.produk ?? "",
    hpp_total_per_porsi: num(r.hpp_total_per_porsi),

    harga_rek_standar: num(r.harga_rek_standar),
    harga_rek_premium: num(r.harga_rek_premium),

    // fallback ke kolom lama bila ada
    harga_rekomendasi: num(r.harga_rek_standar ?? r.harga_rekomendasi),

    harga_jual_user: num(r.harga_jual_user ?? r.harga_jual),
    profit_user_per_porsi: num(r.profit_user_per_porsi ?? r.profit),
    margin_user_persen: num(r.margin_user_persen ?? r.margin),
  })) as PricingRow[];

  rows.sort((a, b) => a.nama_produk.localeCompare(b.nama_produk, "id"));
  return rows;
}

// ——— Normalizer untuk API /pricing/final (menangani bentuk: {ok, data:{...}} atau {ok, ...})
function normalizeHpp(raw: any): HppFinal {
  const container = raw ?? {};
  const d = container.data ?? container; // fleksibel: data di level atas atau di .data

  const bahan = num(d?.bahan_per_porsi ?? d?.hpp?.bahan_per_porsi);
  const overhead = num(d?.overhead_per_porsi ?? d?.hpp?.overhead_per_porsi);
  const tenaga = num(d?.tenaga_kerja_per_porsi ?? d?.hpp?.tenaga_kerja_per_porsi);
  const total = num(d?.total_hpp ?? d?.hpp_total_per_porsi);

  const hpp = {
    bahan_per_porsi: bahan,
    overhead_per_porsi: overhead,
    tenaga_kerja_per_porsi: tenaga,
  };

  const out: HppFinal = {
    ok: Boolean(container?.ok ?? true),
    owner_id: d?.owner_id ?? container?.owner_id ?? undefined,
    produk_id: d?.produk_id ?? container?.produk_id ?? undefined,
    hpp,
    note: d?.note ?? container?.note ?? undefined,
    total_hpp: total,
    nama_produk: d?.nama_produk ?? null,
  };
  return out;
}

async function fetchPricingFinal(
  produkId: string,
  ownerId?: string | null
): Promise<HppFinal> {
  const url = `${API_BASE}/pricing/final?produk_id=${encodeURIComponent(produkId)}`;
  const headers: HeadersInit = {};
  if (ownerId) headers["x-owner-id"] = ownerId;

  const res = await fetch(url, { headers, cache: "no-store" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    // tetap kembalikan bentuk normalized agar UI tidak meledak
    const norm = normalizeHpp(json);
    throw new Error(`HTTP ${res.status} – ${JSON.stringify(json)}`);
  }
  return normalizeHpp(json);
}

/* ========= Page ========= */
export default function PricingPage() {
  const router = useRouter();
  const params = useSearchParams();
  const panelRef = useRef<HTMLDivElement | null>(null);

  const [rows, setRows] = useState<PricingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // --- Search & Sort ---
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<keyof PricingRow>("nama_produk");
  const [sortAsc, setSortAsc] = useState(true);

  // --- Tier (hanya 2) & bulk change tracking ---
  type Tier = "standar" | "premium";
  const [tier, setTier] = useState<Tier>("standar");
  const [dirty, setDirty] = useState<Record<string, number>>({});

  // --- HPP Final detail panel state ---
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [hppData, setHppData] = useState<HppFinal | null>(null);
  const [hppLoading, setHppLoading] = useState(false);
  const [hppErr, setHppErr] = useState<string | null>(null);

  // QA: map total_hpp API per produk (buat kolom & badge)
  const [debug, setDebug] = useState(false);
  const [apiHpp, setApiHpp] = useState<Record<string, number | null>>({});

  // get owner from Supabase session (owner-aware header READY)
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setOwnerId(data.user?.id ?? null);
    });
  }, []);

  const refetch = async () => {
    setLoading(true);
    setErr(null);
    try {
      const d = await fetchPricingView();
      setRows(d);
      setDirty({});
    } catch (e: any) {
      setErr(e?.message ?? "Gagal memuat data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refetch();
  }, []);

  // Deep-link: auto-load panel kanan dari ?produk_id dan scroll ke panel
  useEffect(() => {
    if (!rows.length) return;
    const pid = params.get("produk_id");
    if (pid) {
      setSelectedId(pid);
      setTimeout(
        () => panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
        0
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows.length]); // sekali setelah rows terisi

  // Fetch HPP Final saat pilih baris (panel kanan)
  useEffect(() => {
    let aborted = false;
    (async () => {
      if (!selectedId || !ownerId) return;
      try {
        setHppLoading(true);
        setHppErr(null);
        const data = await fetchPricingFinal(selectedId, ownerId);
        if (!aborted) setHppData(data);
      } catch (e: any) {
        if (!aborted) setHppErr(e?.message ?? "Gagal ambil HPP Final");
      } finally {
        if (!aborted) setHppLoading(false);
      }
    })();
    return () => {
      aborted = true;
    };
  }, [selectedId, ownerId]);

  // Debug mode: prefetch HPP(API) utk baris yang sedang tampil (batasi 50 & concurrency 4)
  useEffect(() => {
    if (!debug || !ownerId) return;
    let cancelled = false;

    const visibleIds = view
      .map((r) => r.produk_id)
      .filter((id) => apiHpp[id] === undefined)
      .slice(0, 50);

    const CONC = 4;
    async function worker(q: string[]) {
      while (q.length && !cancelled) {
        const id = q.shift()!;
        try {
          const d = await fetchPricingFinal(id, ownerId);
          if (!cancelled) setApiHpp((m) => ({ ...m, [id]: num(d.total_hpp) }));
        } catch {
          if (!cancelled) setApiHpp((m) => ({ ...m, [id]: null }));
        }
      }
    }

    const queue = [...visibleIds];
    const workers = Array.from({ length: Math.min(CONC, queue.length) }, () =>
      worker(queue)
    );
    Promise.all(workers).catch(() => void 0);

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debug, q, sortKey, sortAsc, rows, ownerId]);

  /* --- Ambil rekomendasi sesuai tier (2 pilihan) --- */
  function getRekomByTier(r: PricingRow, t: "standar" | "premium") {
    if (t === "premium") return r.harga_rek_premium ?? r.harga_rekomendasi ?? null;
    return r.harga_rek_standar ?? r.harga_rekomendasi ?? null;
  }

  // --- View derivatif: filter + sort (rekomendasi ikut tier) ---
  const view = useMemo(() => {
    const filtered = rows.filter((r) =>
      r.nama_produk.toLowerCase().includes(q.toLowerCase())
    );
    const sorted = filtered.slice().sort((a, b) => {
      if (sortKey === "harga_rekomendasi") {
        const A = Number(getRekomByTier(a, tier) ?? 0);
        const B = Number(getRekomByTier(b, tier) ?? 0);
        return sortAsc ? A - B : B - A;
      }
      const A: any = (a as any)[sortKey] ?? "";
      const B: any = (b as any)[sortKey] ?? "";
      if (typeof A === "string" && typeof B === "string") {
        return sortAsc ? A.localeCompare(B, "id") : B.localeCompare(A, "id");
      }
      const an = Number(A ?? 0),
        bn = Number(B ?? 0);
      return sortAsc ? an - bn : bn - an;
    });
    return sorted;
  }, [rows, q, sortKey, sortAsc, tier]);

  /* ---------- KPI (berdasarkan filtered view) ---------- */
  const kpi = useMemo(() => {
    const n = view.length;
    const margins = view
      .map((r) => r.margin_user_persen)
      .filter((v): v is number => typeof v === "number");

    const avgMargin =
      margins.length > 0
        ? Math.round((margins.reduce((a, b) => a + b, 0) / margins.length) * 10) / 10
        : null;

    const minMargin = margins.length > 0 ? Math.min(...margins) : null;
    const lowCount = margins.filter((m) => m < MARGIN_MIN).length;

    return {
      filteredCount: n,
      totalCount: rows.length,
      avgMargin,
      minMargin,
      lowCount,
    };
  }, [view, rows]);

  const saveHarga = async (row: PricingRow, val: number) => {
    // Guard margin di bawah target
    const hpp = row.hpp_total_per_porsi ?? 0;
    const predProfit = (val ?? 0) - hpp;
    const predMargin = (val ?? 0) > 0 ? (predProfit / (val ?? 1)) * 100 : 0;
    if (predMargin < MARGIN_MIN) {
      const ok = confirm(
        `Margin diperkirakan ${predMargin.toFixed(1)}% (< ${MARGIN_MIN}%). Lanjut simpan?`
      );
      if (!ok) return;
    }

    setSavingId(row.produk_id);
    setMsg(null);

    // Optimistic UI
    const prev = rows.slice();
    setRows(
      rows.map((r) =>
        r.produk_id === row.produk_id ? { ...r, harga_jual_user: val } : r
      )
    );
    setDirty((d) => ({ ...d, [row.produk_id]: val }));

    const { error } = await supabase
      .from("produk")
      .update({ harga_jual_user: val })
      .eq("id", row.produk_id);

    if (error) {
      setRows(prev);
      const { [row.produk_id]: _, ...rest } = dirty;
      setDirty(rest);
      setMsg("Gagal simpan: " + error.message);
    } else {
      await refetch(); // sinkron angka lain dari backend
      setMsg("Harga tersimpan & disinkronkan dari backend ✅");
    }
    setSavingId(null);
  };

  function applyRecommendationToFiltered() {
    // set harga_jual_user = rekomendasi tier terpilih, hanya utk baris yg terlihat (filtered)
    const next = rows.map((r) => {
      const inView = view.find((v) => v.produk_id === r.produk_id);
      if (!inView) return r;

      const rekom = getRekomByTier(r, tier);
      if (rekom == null) return r;
      return { ...r, harga_jual_user: rekom };
    });
    setRows(next);

    const d: Record<string, number> = {};
    next.forEach((r) => {
      const ori = rows.find((x) => x.produk_id === r.produk_id);
      if (
        ori &&
        r.harga_jual_user !== ori.harga_jual_user &&
        r.harga_jual_user != null
      ) {
        d[r.produk_id] = r.harga_jual_user!;
      }
    });
    setDirty(d);
  }

  async function saveAllChanged() {
    const entries = Object.entries(dirty);
    if (entries.length === 0) return;

    for (const [id, val] of entries) {
      const { error } = await supabase
        .from("produk")
        .update({ harga_jual_user: val })
        .eq("id", id);
      if (error) {
        setMsg("Gagal simpan sebagian: " + error.message);
        return;
      }
    }
    await refetch();
    setMsg("Semua perubahan harga tersimpan & disinkronkan dari backend ✅");
  }

  const exportCSV = () => {
    const header = [
      "produk_id",
      "nama_produk",
      "hpp_total_per_porsi",
      `harga_rekomendasi_${tier}`,
      "harga_jual_user",
      "profit_user_per_porsi",
      "margin_user_persen",
    ];
    const lines = rows.map((r) =>
      [
        r.produk_id,
        csvSafe(r.nama_produk),
        safeNum(r.hpp_total_per_porsi),
        safeNum(getRekomByTier(r, tier)),
        safeNum(r.harga_jual_user),
        safeNum(r.profit_user_per_porsi),
        safeNum(r.margin_user_persen),
      ].join(",")
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pricing.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // handler klik row: update URL + scroll panel
  function onClickRow(pid: string) {
    setSelectedId(pid);
    router.replace(`/pricing?produk_id=${encodeURIComponent(pid)}`);
    setTimeout(
      () => panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
      0
    );
  }

  function setSort(key: keyof PricingRow) {
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  if (loading) return <div className="p-6">Loading…</div>;
  if (err) return <div className="p-6 text-red-600">Error: {err}</div>;

  return (
    <div className="p-6 space-y-4">
      {/* Header + controls */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-bold">Produk / Pricing (v_pricing_final)</h1>
        <div className="flex flex-wrap gap-2 items-center">
          <input
            placeholder="Cari produk…"
            className="border rounded px-2 py-1"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />

          <select
            className="border rounded px-2 py-1"
            value={tier}
            onChange={(e) => setTier(e.target.value as "standar" | "premium")}
            title="Pilih tier rekomendasi"
          >
            <option value="standar">Standar</option>
            <option value="premium">Premium</option>
          </select>

          {/* Toggle QA Debug Mode */}
          <label className="flex items-center gap-2 text-sm border rounded px-2 py-1">
            <input
              type="checkbox"
              checked={debug}
              onChange={(e) => setDebug(e.target.checked)}
            />
            Debug Mode
          </label>

          <button
            className="rounded-md bg-gray-100 px-3 py-1"
            onClick={applyRecommendationToFiltered}
          >
            Samakan dgn {tier} (filtered)
          </button>

          <button
            className="rounded-md bg-gray-800 text-white px-3 py-1 disabled:opacity-50"
            disabled={Object.keys(dirty).length === 0}
            onClick={saveAllChanged}
          >
            Save semua yang berubah
          </button>

          <button className="rounded-md bg-gray-100 px-3 py-1" onClick={refetch}>
            Refresh
          </button>
          <button
            className="rounded-md bg-gray-900 text-white px-3 py-1"
            onClick={exportCSV}
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* KPI Badges */}
      <div className="flex flex-wrap gap-2">
        <Badge>
          📦 Produk: {kpi.filteredCount}
          {rows.length !== kpi.filteredCount && (
            <span className="text-gray-500"> / {rows.length}</span>
          )}
        </Badge>
        <Badge>
          📈 Avg Margin:{" "}
          {kpi.avgMargin == null ? "-" : `${kpi.avgMargin.toFixed(1)}%`}
        </Badge>
        <Badge
          className={
            kpi.minMargin != null && kpi.minMargin < MARGIN_MIN
              ? "bg-red-100 text-red-700"
              : ""
          }
        >
          🔻 Min Margin:{" "}
          {kpi.minMargin == null ? "-" : `${kpi.minMargin.toFixed(1)}%`}
        </Badge>
        {kpi.lowCount > 0 && (
          <Badge className="bg-amber-100 text-amber-800">
            ⚠️ {kpi.lowCount} produk {"<"} {MARGIN_MIN}%
          </Badge>
        )}
      </div>

      {/* Flash message */}
      {msg && <div className="rounded-md bg-green-100 p-2 text-green-800">{msg}</div>}

      {/* Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <Th onClick={() => setSort("nama_produk")}>Produk</Th>
                <Th right onClick={() => setSort("hpp_total_per_porsi")}>
                  {debug ? "HPP (View)" : "HPP / porsi"}
                </Th>
                {debug && <Th right>HPP (API)</Th>}
                <Th
                  right
                  onClick={() => setSort("harga_rekomendasi")}
                  title="Ganti tier di dropdown; hover sel utk lihat kedua tier"
                >
                  Harga rekom. ({tier})
                </Th>
                <Th right onClick={() => setSort("harga_jual_user")}>
                  Harga jual (user)
                </Th>
                <Th right onClick={() => setSort("profit_user_per_porsi")}>
                  Profit / porsi
                </Th>
                <Th right onClick={() => setSort("margin_user_persen")}>
                  Margin %
                </Th>
                <th className="p-2 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {view.map((r) => {
                const api = apiHpp[r.produk_id];
                const mismatch =
                  debug &&
                  api !== undefined &&
                  api !== null &&
                  r.hpp_total_per_porsi != null &&
                  !equalish(api, r.hpp_total_per_porsi);
                return (
                  <tr key={r.produk_id} className="border-b">
                    <td className="p-2">
                      <button
                        className={`text-left underline-offset-2 hover:underline ${
                          selectedId === r.produk_id ? "font-semibold" : ""
                        }`}
                        onClick={() => onClickRow(r.produk_id)}
                        title="Lihat HPP Final (API)"
                      >
                        {r.nama_produk}
                      </button>
                      {mismatch && (
                        <span
                          className="ml-2 inline-flex items-center bg-yellow-100 text-yellow-700 border border-yellow-300 rounded-md text-xs px-1"
                          title="Beda sumber (view vs API)"
                        >
                          ⚠
                        </span>
                      )}
                    </td>
                    <td className="p-2 text-right">{fmt(r.hpp_total_per_porsi)}</td>
                    {debug && (
                      <td className="p-2 text-right">
                        {api === undefined ? <span className="opacity-60">…</span> : fmt(api)}
                      </td>
                    )}
                    <td
                      className="p-2 text-right"
                      title={`Standar: ${fmt(r.harga_rek_standar)} • Premium: ${fmt(
                        r.harga_rek_premium
                      )}`}
                    >
                      {fmt(getRekomByTier(r, tier))}
                    </td>
                    <td className="p-2 text-right">
                      <InlineNum
                        value={r.harga_jual_user ?? 0}
                        disabled={savingId === r.produk_id}
                        onSave={(v) => saveHarga(r, v)}
                      />
                    </td>
                    <td className="p-2 text-right">{fmt(r.profit_user_per_porsi)}</td>
                    <td className="p-2 text-right">
                      <MarginBadge v={r.margin_user_persen} />
                    </td>
                    <td className="p-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          className="px-3 py-1 rounded-md bg-white border hover:bg-gray-50"
                          onClick={() => onClickRow(r.produk_id)}
                          title="Tampilkan panel HPP Final"
                        >
                          HPP Final
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {view.length === 0 && (
                <tr>
                  <td className="p-2 text-center text-gray-500" colSpan={debug ? 8 : 7}>
                    Tidak ada data yang cocok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Side Panel HPP Final */}
        <div className="lg:col-span-1" ref={panelRef}>
          <div className="rounded-2xl border p-4 shadow-sm sticky top-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-lg font-semibold">HPP Final (API)</h3>
              {hppLoading && <span className="text-sm opacity-70">Loading…</span>}
            </div>

            {!selectedId && (
              <div className="text-sm opacity-70">
                Pilih produk di tabel untuk melihat HPP Final dari API.
              </div>
            )}

            {hppErr && (
              <div className="mb-3 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
                {hppErr}
              </div>
            )}

            {hppData && (
              <div className="space-y-1 text-sm">
                <div className="text-base">
                  <b>Total HPP:</b> {rupiah(hppData.total_hpp)}
                </div>
                <div>Bahan: {rupiah(hppData.hpp?.bahan_per_porsi ?? null)}</div>
                <div>
                  Overhead: {rupiah(hppData.hpp?.overhead_per_porsi ?? null)}
                </div>
                <div>
                  Tenaga Kerja: {rupiah(hppData.hpp?.tenaga_kerja_per_porsi ?? null)}
                </div>

                {hppData.note && (
                  <div className="pt-2 text-xs opacity-80">Catatan: {hppData.note}</div>
                )}

                <div className="pt-3">
                  <button
                    className="rounded-md bg-gray-900 text-white px-3 py-1"
                    onClick={() => selectedId && setSelectedId(selectedId)}
                    title="Refetch"
                  >
                    Refresh
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========= Small components ========= */
function InlineNum({
  value,
  onSave,
  disabled,
}: {
  value: number;
  onSave: (val: number) => void;
  disabled?: boolean;
}) {
  const [v, setV] = useState(String(value));
  return (
    <div className="flex items-center gap-2 justify-end">
      <input
        type="number"
        className="w-28 rounded-md border px-2 py-1"
        value={v}
        disabled={disabled}
        onChange={(e) => setV(e.target.value)}
      />
      <button
        className="px-2 py-1 rounded-md bg-black text-white disabled:opacity-40"
        disabled={disabled}
        onClick={() => onSave(Number(v || 0))}
      >
        Save
      </button>
    </div>
  );
}

function MarginBadge({ v }: { v: number | null | undefined }) {
  if (v == null) return <span>-</span>;
  const low = v < MARGIN_MIN;
  const cls = low ? "text-red-600 font-semibold" : "text-green-700";
  return <span className={cls}>{v.toFixed(1)}%</span>;
}

function Th({
  children,
  right,
  onClick,
}: {
  children: any;
  right?: boolean;
  onClick?: () => void;
}) {
  return (
    <th
      className={`p-2 ${right ? "text-right" : "text-left"} cursor-pointer select-none`}
      onClick={onClick}
      title="Klik untuk sort"
    >
      {children}
    </th>
  );
}

function Badge({
  children,
  className = "",
}: {
  children: any;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-sm ${className}`}
    >
      {children}
    </span>
  );
}

/* ========= CSV helpers ========= */
function csvSafe(text: string) {
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}
function safeNum(n: number | null | undefined) {
  return n == null ? "" : String(n);
}
