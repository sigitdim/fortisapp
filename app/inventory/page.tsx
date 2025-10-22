"use client";

import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

/**
 * =========================
 * CONFIG
 * =========================
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.fortislab.id";
const OWNER_ID =
  process.env.NEXT_PUBLIC_OWNER_ID ||
  "f6269e9a-bc6d-4f8b-aa45-08affc769e5a";

const LOGS_PATH_ENV = process.env.NEXT_PUBLIC_INVENTORY_LOGS_PATH || "";
const STOCK_PATH_ENV = process.env.NEXT_PUBLIC_INVENTORY_STOCK_PATH || "";
const LOW_STOCK_THRESHOLD = Number(
  process.env.NEXT_PUBLIC_LOW_STOCK_THRESHOLD || 10
);

const LOGS_PATHS = (LOGS_PATH_ENV ? [LOGS_PATH_ENV] : []).concat([
  "/inventory/logs",
  "/inventory/history",
  "/inventory/riwayat",
  "/inventory/mutations",
  "/inventory/mutation",
  "/inventory/transactions",
  "/inventory/transaction",
  "/inventory/activity",
  "/inventory/activities",
  "/inventory/entries",
  "/inventory/ledger",
]);

const STOCK_PATHS = (STOCK_PATH_ENV ? [STOCK_PATH_ENV] : []).concat([
  "/inventory/stock",
  "/inventory/summary",
  "/inventory/stocks",
]);

// Bahan (create) – FE coba urut sampai ada yang 200 JSON
const BAHAN_CREATE_PATHS = (process.env.NEXT_PUBLIC_BAHAN_CREATE_PATH
  ? [process.env.NEXT_PUBLIC_BAHAN_CREATE_PATH]
  : []
).concat(["/setup/bahan", "/inventory/bahan", "/materials", "/bahan"]);

/**
 * =========================
 * TYPES
 * =========================
 */
type Bahan = {
  id: string;
  nama?: string;
  nama_bahan?: string;
  satuan?: string;
};

type ApiResponse = { ok: boolean; message?: string; data?: any };

type StockRow = {
  bahan_id: string;
  saldo?: number;
  satuan?: string;
  nama?: string;
  [k: string]: any;
};

type LogItem = {
  id?: string;
  bahan_id?: string;
  bahan_nama?: string;
  tipe?: "in" | "out";
  qty?: number;
  satuan?: string;
  catatan?: string;
  created_at?: string;
  [k: string]: any;
};

type InOutPayload = { bahan_id: string; qty: number; catatan?: string };

/**
 * =========================
 * HELPERS
 * =========================
 */
function cn(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(" ");
}
function pickNama(b: Bahan) {
  return b.nama ?? b.nama_bahan ?? "(tanpa nama)";
}
function fmtDT(s?: string) {
  if (!s) return "-";
  try {
    return new Date(s).toLocaleString();
  } catch {
    return s;
  }
}
async function fetchSmart(url: string, init?: RequestInit) {
  const res = await fetch(url, {
    ...init,
    headers: {
      "x-owner-id": OWNER_ID,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  const ct = res.headers.get("content-type") || "";
  let isJSON = ct.includes("json");
  let body: any;
  try {
    body = isJSON ? await res.json() : await res.text();
  } catch {
    try {
      body = await res.text();
      isJSON = false;
    } catch {
      body = "";
      isJSON = false;
    }
  }
  return { ok: res.ok, status: res.status, body, isJSON, ct };
}
async function fetchJSON<T = any>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetchSmart(url, init);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.body as T;
}
function toCSV(rows: Record<string, any>[], headers?: string[]) {
  if (!rows?.length) return "";
  const cols =
    headers ||
    Array.from(
      rows.reduce((s, r) => {
        Object.keys(r).forEach((k) => s.add(k));
        return s;
      }, new Set<string>())
    );
  const esc = (v: any) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join(
    "\n"
  );
}

/**
 * =========================
 * TOAST (tanpa dependency)
 * =========================
 */
type ToastItem = { id: number; type: "success"|"error"|"info"; message: string; };
const ToastCtx = React.createContext<{ push:(t:Omit<ToastItem,"id">)=>void } | null>(null);

function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);
  const idRef = React.useRef(1);
  const push = React.useCallback((t: Omit<ToastItem,"id">) => {
    const id = idRef.current++;
    setItems((s)=>[...s, { id, ...t }]);
    setTimeout(()=> setItems((s)=> s.filter(x=>x.id!==id)), 3200);
  }, []);
  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="fixed z-[1000] top-4 right-4 space-y-2">
        {items.map((it)=>(
          <div key={it.id}
            className={[
              "rounded-xl shadow-lg px-4 py-3 text-sm text-white",
              it.type==="success" && "bg-emerald-600",
              it.type==="error" && "bg-rose-600",
              it.type==="info" && "bg-slate-700"
            ].filter(Boolean).join(" ")}
          >
            {it.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
function useToast(){ 
  const ctx = React.useContext(ToastCtx);
  if(!ctx) throw new Error("useToast must be used within ToastProvider");
  return {
    success: (m:string)=>ctx.push({type:"success", message:m}),
    error:   (m:string)=>ctx.push({type:"error", message:m}),
    info:    (m:string)=>ctx.push({type:"info", message:m}),
  };
}

/**
 * =========================
 * SKELETON (tanpa dependency)
 * =========================
 */
function Skeleton({ className="" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-slate-200 ${className}`} />;
}
function TableSkeletonRows({ rows=6, cols=4 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({length: rows}).map((_,i)=>(
        <tr key={i} className="border-b">
          {Array.from({length: cols}).map((__,j)=>(
            <td key={j} className="p-2"><Skeleton className="h-4 w-full" /></td>
          ))}
        </tr>
      ))}
    </>
  );
}

/**
 * =========================
 * UI ATOMS
 * =========================
 */
function Badge({
  children,
  variant = "neutral",
}: {
  children: React.ReactNode;
  variant?: "in" | "out" | "neutral";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full border text-xs",
        variant === "in" && "bg-green-50 border-green-200",
        variant === "out" && "bg-red-50 border-red-200",
        variant === "neutral" && "bg-gray-50 border-gray-200"
      )}
    >
      {children}
    </span>
  );
}
function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-gray-200/70 bg-white/70 backdrop-blur p-4 shadow-sm",
        className
      )}
    >
      {children}
    </div>
  );
}
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-semibold">{children}</h2>;
}
function KPI({
  label,
  value,
  note,
}: {
  label: string;
  value: React.ReactNode;
  note?: string;
}) {
  return (
    <Card>
      <div className="text-xs opacity-60">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
      {note && <div className="text-xs opacity-60 mt-1">{note}</div>}
    </Card>
  );
}

/**
 * =========================
 * MAIN PAGE
 * =========================
 */
function InventoryPageInner() {
  const toast = useToast();

  const [tab, setTab] = React.useState<"overview" | "in" | "out" | "logs">(
    "overview"
  );

  // Master data
  const [bahan, setBahan] = React.useState<Bahan[]>([]);
  const [bahanErr, setBahanErr] = React.useState<string | null>(null);
  const [bahanLoading, setBahanLoading] = React.useState(false);

  // Stock
  const [stockMap, setStockMap] = React.useState<Record<string, StockRow>>({});
  const [stockDebug, setStockDebug] = React.useState<{
    url?: string;
    status?: number;
    ctype?: string;
  } | null>(null);
  const [stockLoading, setStockLoading] = React.useState(false);

  // Forms
  const [inForm, setInForm] = React.useState<InOutPayload>({
    bahan_id: "",
    qty: 0,
    catatan: "",
  });
  const [outForm, setOutForm] = React.useState<InOutPayload>({
    bahan_id: "",
    qty: 0,
    catatan: "",
  });
  const [inLoading, setInLoading] = React.useState(false);
  const [outLoading, setOutLoading] = React.useState(false);
  const [inRes, setInRes] = React.useState<any>(null);
  const [outRes, setOutRes] = React.useState<any>(null);

  // Logs
  const [logs, setLogs] = React.useState<LogItem[]>([]);
  const [logsLoading, setLogsLoading] = React.useState(false);
  const [logsErr, setLogsErr] = React.useState<string | null>(null);
  const [logsDebug, setLogsDebug] = React.useState<{
    url: string;
    status: number;
    ctype: string;
    raw?: string;
    tried?: string[];
  } | null>(null);

  // Filters & pagination
  const [fBahan, setFBahan] = React.useState("");
  const [fType, setFType] = React.useState<"" | "in" | "out">("");
  const [limit, setLimit] = React.useState(50);
  const [since, setSince] = React.useState("");
  const [until, setUntil] = React.useState("");
  const [page, setPage] = React.useState(1);
  const pageSize = 15;

  // Search overview
  const [search, setSearch] = React.useState("");

  // Add Bahan
  const [showAddBahan, setShowAddBahan] = React.useState(false);
  const [addBahanLoading, setAddBahanLoading] = React.useState(false);
  const [addNama, setAddNama] = React.useState("");
  const [addSatuan, setAddSatuan] = React.useState("");
  const [addHarga, setAddHarga] = React.useState<number | "">("");

  /**
   * Load bahan
   */
  React.useEffect(() => {
    (async () => {
      try {
        setBahanLoading(true);
        const d = (await fetchJSON<ApiResponse>(`${API_URL}/setup/bahan`)) as ApiResponse;
        if (d?.ok && Array.isArray(d.data)) setBahan(d.data);
        else setBahanErr(d?.message || "Gagal memuat daftar bahan");
      } catch (e: any) {
        setBahanErr(e?.message || "Failed to fetch");
      } finally {
        setBahanLoading(false);
      }
    })();
  }, []);

  /**
   * Load stock (auto-detect)
   */
  async function loadStock(auto = true) {
    setStockLoading(true);
    try {
      const candidates = auto ? STOCK_PATHS : [STOCK_PATH_ENV];
      for (const path of candidates) {
        const url = `${API_URL}${path}`;
        try {
          const r = await fetchSmart(url);
          setStockDebug({ url, status: r.status, ctype: r.ct });
          if (!r.ok) continue;

          let rows: StockRow[] = [];
          if (Array.isArray(r.body)) rows = r.body;
          else if (r.body?.ok && Array.isArray(r.body.data)) rows = r.body.data;
          else continue;

          const map: Record<string, StockRow> = {};
          rows.forEach((row) => {
            const id = row.bahan_id || (row as any).id || (row as any).bahanId;
            if (!id) return;
            map[id] = {
              bahan_id: id,
              saldo: row.saldo ?? (row as any).stock ?? (row as any).qty ?? (row as any).balance,
              satuan: row.satuan,
              nama: (row as any).nama || (row as any).nama_bahan || (row as any).bahan_nama,
            };
          });
          setStockMap(map);
          return;
        } catch {
          // try next
        }
      }
    } finally {
      setStockLoading(false);
    }
  }
  React.useEffect(() => {
    loadStock(true);
  }, []);

  /**
   * IN / OUT submit
   */
  async function doSubmit(type: "in" | "out") {
    const form = type === "in" ? inForm : outForm;
    const setLoading = type === "in" ? setInLoading : setOutLoading;
    const setRes = type === "in" ? setInRes : setOutRes;

    if (!form.bahan_id || !form.qty || Number(form.qty) <= 0) {
      toast.error("Lengkapi bahan dan qty > 0");
      return;
    }

    setLoading(true);
    setRes(null);
    try {
      const d = await fetchSmart(`${API_URL}/inventory/${type}`, {
        method: "POST",
        body: JSON.stringify({
          bahan_id: form.bahan_id,
          qty: Number(form.qty),
          catatan: form.catatan?.trim() || undefined,
        }),
      });
      setRes(d.body);
      if (d.ok) {
        toast.success(type === "in" ? "Stok masuk tersimpan ✅" : "Stok keluar tersimpan ✅");
        await loadStock(false);
        await refreshLogs();
      } else {
        toast.error("Gagal simpan mutasi");
      }
    } catch (e: any) {
      toast.error("Network error saat simpan mutasi");
      setRes({ ok: false, message: e?.message || "Network/Unknown error" });
    } finally {
      setLoading(false);
    }
  }

  /**
   * LOGS: adaptive route & param variants
   */
  async function refreshLogs() {
    setLogsLoading(true);
    setLogsErr(null);
    setLogsDebug(null);
    setPage(1);

    // param variants
    const filters: Array<[string, string]> = [];
    if (limit) filters.push(["limit", String(limit)]);
    if (fBahan) filters.push(["bahan_id", fBahan]);
    if (fType) filters.push(["type", fType]);

    const variants: Array<Array<[string, string]>> = [];

    // a) since/until
    const v1 = [...filters];
    if (since) v1.push(["since", since]);
    if (until) v1.push(["until", until]);
    variants.push(v1);

    // b) from/to
    const v2 = [...filters];
    if (since) v2.push(["from", since]);
    if (until) v2.push(["to", until]);
    variants.push(v2);

    // c) start/end
    const v3 = [...filters];
    if (since) v3.push(["start", since]);
    if (until) v3.push(["end", until]);
    variants.push(v3);

    // d) date_from/date_to
    const v4 = [...filters];
    if (since) v4.push(["date_from", since]);
    if (until) v4.push(["date_to", until]);
    variants.push(v4);

    // e) no date params
    variants.push([...filters]);

    const tried: string[] = [];
    try {
      for (const path of LOGS_PATHS) {
        for (const pv of variants) {
          const usp = new URLSearchParams(pv);
          const url = `${API_URL}${path}?${usp.toString()}`;
          tried.push(url);

          const r = await fetchSmart(url);
          setLogsDebug({
            url,
            status: r.status,
            ctype: r.ct,
            raw: r.isJSON ? undefined : String(r.body).slice(0, 600),
            tried: tried.slice(0),
          });

          if (!r.ok) continue;
          let body = r.body;
          if (Array.isArray(body)) {
            setLogs(body as any);
            setLogsLoading(false);
            toast.success("Riwayat ter-update");
            return;
          } else if (body?.ok && Array.isArray(body.data)) {
            setLogs(body.data as any);
            setLogsLoading(false);
            toast.success("Riwayat ter-update");
            return;
          }
        }
      }
      setLogs([]);
      setLogsErr(
        "Tidak menemukan route riwayat yang valid. Set NEXT_PUBLIC_INVENTORY_LOGS_PATH agar langsung tepat."
      );
      toast.error("Tidak menemukan endpoint riwayat di BE");
    } catch (e: any) {
      setLogs([]);
      setLogsErr(e?.message || "Gagal memuat riwayat");
      toast.error("Gagal memuat riwayat");
    } finally {
      setLogsLoading(false);
    }
  }

  /**
   * Derived
   */
  const bahanOptions = React.useMemo(
    () =>
      bahan.map((b) => {
        const s = stockMap[b.id];
        const saldoStr =
          s?.saldo !== undefined
            ? ` • saldo: ${s.saldo}${s?.satuan ? " " + s.satuan : ""}`
            : "";
        return {
          id: b.id,
          label: `${pickNama(b)}${b.satuan ? " (" + b.satuan + ")" : ""}${saldoStr}`,
          satuan: b.satuan || s?.satuan,
        };
      }),
    [bahan, stockMap]
  );

  const lowStockRows = React.useMemo(
    () =>
      Object.values(stockMap).filter(
        (r) => typeof r.saldo === "number" && (r.saldo as number) <= LOW_STOCK_THRESHOLD
      ),
    [stockMap]
  );

  const overviewRows = React.useMemo(() => {
    const arr = Object.entries(stockMap).map(([bahan_id, s]) => {
      const b = bahan.find((x) => x.id === bahan_id);
      return {
        bahan_id,
        nama: s?.nama || b?.nama || b?.nama_bahan || bahan_id,
        saldo: typeof s?.saldo === "number" ? s.saldo : undefined,
        satuan: s?.satuan || b?.satuan || "",
      };
    });
    const filtered = arr.filter(
      (r) => !search || r.nama.toLowerCase().includes(search.toLowerCase())
    );
    return filtered.sort((a, b) => (a.nama || "").localeCompare(b.nama || ""));
  }, [stockMap, bahan, search]);

  const pagedLogs = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return logs.slice(start, start + pageSize);
  }, [logs, page]);

  // Chart (qty per entry, optional filter by bahan)
  const [chartBahan, setChartBahan] = React.useState("");
  const chartData = React.useMemo(() => {
    const arr = logs
      .filter((l) => !chartBahan || l.bahan_id === chartBahan)
      .sort(
        (a, b) =>
          new Date(a.created_at || 0).getTime() -
          new Date(b.created_at || 0).getTime()
      )
      .map((it, idx) => ({
        t: fmtDT(it.created_at),
        qty: it.qty || 0,
        tipe: it.tipe || "-",
        idx,
      }));
    return arr;
  }, [logs, chartBahan]);

  /**
   * Add Bahan
   */
  async function createBahan() {
    if (!addNama.trim()) {
      alert("Nama bahan wajib diisi");
      return;
    }
    setAddBahanLoading(true);
    try {
      const payload: any = { nama: addNama.trim() };
      if (addSatuan.trim()) payload.satuan = addSatuan.trim();
      if (addHarga !== "" && Number(addHarga) >= 0)
        payload.harga_per_satuan = Number(addHarga);

      for (const path of BAHAN_CREATE_PATHS) {
        const url = `${API_URL}${path}`;
        const r = await fetchSmart(url, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        if (!r.ok) continue;

        setShowAddBahan(false);
        setAddNama("");
        setAddSatuan("");
        setAddHarga("");

        try {
          const d = await fetchJSON<ApiResponse>(`${API_URL}/setup/bahan`);
          if (d?.ok && Array.isArray(d.data)) setBahan(d.data);
        } catch {}
        await loadStock(true);
        toast.success("Bahan berhasil ditambahkan ✅");
        return;
      }
      toast.error("Gagal menambahkan bahan (semua route ditolak)");
      alert(
        "Gagal menambahkan bahan. Minta BE aktifkan POST /setup/bahan (return JSON)."
      );
    } catch (e: any) {
      toast.error("Error saat menambahkan bahan");
      alert(`Error: ${e?.message || "unknown"}`);
    } finally {
      setAddBahanLoading(false);
    }
  }

  /**
   * Render
   */
  return (
    
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
        {/* Header */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.15),transparent_50%)]" />
          <header className="max-w-7xl mx-auto px-6 pt-8 pb-4 relative">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">
                  📦 Inventory Dashboard
                </h1>
                <div className="text-xs opacity-70 mt-1">
                  API: {API_URL.replace(/^https?:\/\//, "")} • owner:{" "}
                  {OWNER_ID.slice(0, 8)}…{OWNER_ID.slice(-6)}
                </div>
              </div>
              <nav className="flex gap-2">
                {(["overview", "in", "out", "logs"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={cn(
                      "px-4 py-2 rounded-full text-sm font-medium transition",
                      tab === t
                        ? "bg-black text-white shadow-sm"
                        : "bg-white/70 backdrop-blur border border-gray-200 hover:bg-white"
                    )}
                  >
                    {t === "overview"
                      ? "Overview"
                      : t === "in"
                      ? "Stok Masuk"
                      : t === "out"
                      ? "Stok Keluar"
                      : "Riwayat"}
                  </button>
                ))}
              </nav>
            </div>
          </header>
        </div>

        <main className="max-w-7xl mx-auto px-6 pb-10 space-y-6">
          {/* OVERVIEW */}
          {tab === "overview" && (
            <>
              <div className="grid md:grid-cols-4 gap-3">
                <KPI label="Total Bahan" value={bahan.length} />
                <KPI
                  label="Memiliki Saldo"
                  value={Object.keys(stockMap).length}
                />
                <KPI
                  label={`Low Stock (≤ ${LOW_STOCK_THRESHOLD})`}
                  value={lowStockRows.length}
                  note="Set di NEXT_PUBLIC_LOW_STOCK_THRESHOLD"
                />
                <KPI
                  label="Sumber Stock"
                  value={
                    stockDebug?.url
                      ? stockDebug.url.replace(API_URL, "")
                      : "auto-detect"
                  }
                  note={stockDebug?.status ? `HTTP ${stockDebug.status}` : ""}
                />
              </div>

              <Card>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <SectionTitle>Saldo Stok Saat Ini</SectionTitle>
                  <div className="ml-auto flex gap-2">
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Cari bahan…"
                      className="border rounded-xl px-3 py-2 text-sm outline-none w-64"
                    />
                    <button
                      onClick={() => setShowAddBahan(true)}
                      className="px-3 py-2 rounded-xl border hover:bg-gray-50 text-sm"
                    >
                      + Tambah Bahan
                    </button>
                    <button
                      onClick={() => loadStock(true)}
                      disabled={stockLoading}
                      className={`px-3 py-2 rounded-xl border text-sm ${
                        stockLoading
                          ? "opacity-60 cursor-not-allowed"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      {stockLoading ? "Refreshing..." : "Refresh"}
                    </button>
                  </div>
                </div>

                <div className="overflow-auto rounded-xl border">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b">
                        <th className="text-left p-2">Bahan</th>
                        <th className="text-left p-2">Saldo</th>
                        <th className="text-left p-2">Satuan</th>
                        <th className="text-left p-2">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(stockLoading ||
                      (bahanLoading && overviewRows.length === 0)) ? (
                        <TableSkeletonRows rows={6} cols={4} />
                      ) : (
                        overviewRows.map((r) => (
                          <tr
                            key={r.bahan_id}
                            className="border-b odd:bg-white even:bg-gray-50/50"
                          >
                            <td className="p-2">{r.nama}</td>
                            <td
                              className={cn(
                                "p-2",
                                typeof r.saldo === "number" &&
                                  (r.saldo as number) <= LOW_STOCK_THRESHOLD &&
                                  "text-red-600 font-medium"
                              )}
                            >
                              {r.saldo ?? "—"}
                            </td>
                            <td className="p-2">{r.satuan || "—"}</td>
                            <td className="p-2">
                              <div className="flex gap-2">
                                <button
                                  onClick={() =>
                                    setInForm({
                                      bahan_id: r.bahan_id,
                                      qty: 0,
                                      catatan: "",
                                    })
                                  }
                                  className="px-2 py-1 rounded-lg border hover:bg-gray-50"
                                >
                                  + IN
                                </button>
                                <button
                                  onClick={() =>
                                    setOutForm({
                                      bahan_id: r.bahan_id,
                                      qty: 0,
                                      catatan: "",
                                    })
                                  }
                                  className="px-2 py-1 rounded-lg border hover:bg-gray-50"
                                >
                                  − OUT
                                </button>
                                <button
                                  onClick={() => {
                                    setTab("logs");
                                    setFBahan(r.bahan_id);
                                    refreshLogs();
                                  }}
                                  className="px-2 py-1 rounded-lg border hover:bg-gray-50"
                                >
                                  Riwayat
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                      {!stockLoading &&
                        !bahanLoading &&
                        overviewRows.length === 0 && (
                          <tr>
                            <td
                              className="p-3 text-center opacity-60"
                              colSpan={4}
                            >
                              Tidak ada data saldo. Pastikan endpoint stock
                              tersedia.
                            </td>
                          </tr>
                        )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}

          {/* IN */}
          {tab === "in" && (
            <Card className="space-y-4">
              <SectionTitle>Tambah Stok Masuk (POST /inventory/in)</SectionTitle>
              {bahanErr && (
                <div className="text-sm text-red-600 flex items-center gap-3 flex-wrap">
                  <span>
                    Gagal memuat bahan: {bahanErr}. Input manual ID sementara.
                  </span>
                  <button
                    onClick={() => setShowAddBahan(true)}
                    className="px-3 py-1.5 rounded-lg border hover:bg-gray-50 text-xs"
                  >
                    + Tambah Bahan
                  </button>
                </div>
              )}
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm mb-1">Bahan</label>
                  {bahanOptions.length > 0 ? (
                    <select
                      value={inForm.bahan_id}
                      onChange={(e) =>
                        setInForm({ ...inForm, bahan_id: e.target.value })
                      }
                      className="w-full border rounded-xl px-3 py-2 outline-none"
                    >
                      <option value="">— pilih bahan —</option>
                      {bahanOptions.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={inForm.bahan_id}
                      onChange={(e) =>
                        setInForm({ ...inForm, bahan_id: e.target.value })
                      }
                      placeholder="UUID bahan"
                      className="w-full border rounded-xl px-3 py-2 outline-none"
                    />
                  )}
                  <div className="mt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddBahan(true)}
                      className="text-xs underline opacity-70 hover:opacity-100"
                    >
                      + Tambah bahan baru
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm mb-1">Qty</label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={inForm.qty}
                    onChange={(e) =>
                      setInForm({ ...inForm, qty: Number(e.target.value) })
                    }
                    className="w-full border rounded-xl px-3 py-2 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm mb-1">Catatan (opsional)</label>
                <input
                  value={inForm.catatan || ""}
                  onChange={(e) =>
                    setInForm({ ...inForm, catatan: e.target.value })
                  }
                  placeholder="stok masuk dari supplier"
                  className="w-full border rounded-xl px-3 py-2 outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => doSubmit("in")}
                  disabled={inLoading || !inForm.bahan_id || !inForm.qty}
                  className={cn(
                    "px-4 py-2 rounded-xl text-white",
                    inLoading || !inForm.bahan_id || !inForm.qty
                      ? "bg-gray-400"
                      : "bg-black hover:opacity-90"
                  )}
                >
                  {inLoading ? "Mengirim..." : "Simpan – Stok Masuk"}
                </button>
                <span className="text-xs opacity-60">
                  x-owner-id: {OWNER_ID.slice(0, 8)}…{OWNER_ID.slice(-6)}
                </span>
              </div>
              <div>
                <div className="text-sm font-medium mb-1">Hasil</div>
                {!inRes ? (
                  <div className="text-sm opacity-60">Belum ada request.</div>
                ) : (
                  <pre className="text-xs bg-gray-50 p-3 rounded-xl overflow-auto">
                    {JSON.stringify(inRes, null, 2)}
                  </pre>
                )}
              </div>
            </Card>
          )}

          {/* OUT */}
          {tab === "out" && (
            <Card className="space-y-4">
              <SectionTitle>Kurangi Stok (POST /inventory/out)</SectionTitle>
              {bahanErr && (
                <div className="text-sm text-red-600 flex items-center gap-3 flex-wrap">
                  <span>
                    Gagal memuat bahan: {bahanErr}. Input manual ID sementara.
                  </span>
                  <button
                    onClick={() => setShowAddBahan(true)}
                    className="px-3 py-1.5 rounded-lg border hover:bg-gray-50 text-xs"
                  >
                    + Tambah Bahan
                  </button>
                </div>
              )}
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm mb-1">Bahan</label>
                  {bahanOptions.length > 0 ? (
                    <select
                      value={outForm.bahan_id}
                      onChange={(e) =>
                        setOutForm({ ...outForm, bahan_id: e.target.value })
                      }
                      className="w-full border rounded-xl px-3 py-2 outline-none"
                    >
                      <option value="">— pilih bahan —</option>
                      {bahanOptions.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={outForm.bahan_id}
                      onChange={(e) =>
                        setOutForm({ ...outForm, bahan_id: e.target.value })
                      }
                      placeholder="UUID bahan"
                      className="w-full border rounded-xl px-3 py-2 outline-none"
                    />
                  )}
                  <div className="mt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddBahan(true)}
                      className="text-xs underline opacity-70 hover:opacity-100"
                    >
                      + Tambah bahan baru
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm mb-1">Qty</label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={outForm.qty}
                    onChange={(e) =>
                      setOutForm({ ...outForm, qty: Number(e.target.value) })
                    }
                    className="w-full border rounded-xl px-3 py-2 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm mb-1">Catatan (opsional)</label>
                <input
                  value={outForm.catatan || ""}
                  onChange={(e) =>
                    setOutForm({ ...outForm, catatan: e.target.value })
                  }
                  placeholder="dipakai produksi"
                  className="w-full border rounded-xl px-3 py-2 outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => doSubmit("out")}
                  disabled={outLoading || !outForm.bahan_id || !outForm.qty}
                  className={cn(
                    "px-4 py-2 rounded-xl text-white",
                    outLoading || !outForm.bahan_id || !outForm.qty
                      ? "bg-gray-400"
                      : "bg-black hover:opacity-90"
                  )}
                >
                  {outLoading ? "Mengirim..." : "Simpan – Stok Keluar"}
                </button>
                <span className="text-xs opacity-60">
                  x-owner-id: {OWNER_ID.slice(0, 8)}…{OWNER_ID.slice(-6)}
                </span>
              </div>
              <div>
                <div className="text-sm font-medium mb-1">Hasil</div>
                {!outRes ? (
                  <div className="text-sm opacity-60">Belum ada request.</div>
                ) : (
                  <pre className="text-xs bg-gray-50 p-3 rounded-xl overflow-auto">
                    {JSON.stringify(outRes, null, 2)}
                  </pre>
                )}
              </div>
            </Card>
          )}

          {/* LOGS */}
          {tab === "logs" && (
            <Card className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <SectionTitle>Riwayat Mutasi (auto-detect)</SectionTitle>
                <div className="ml-auto flex gap-2">
                  <button
                    onClick={refreshLogs}
                    disabled={logsLoading}
                    className={`px-3 py-2 rounded-xl border text-sm ${
                      logsLoading
                        ? "opacity-60 cursor-not-allowed"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    {logsLoading ? "Refreshing..." : "Refresh"}
                  </button>
                  <button
                    onClick={() => {
                      const rows = logs.map((it) => ({
                        id: it.id || "",
                        created_at: it.created_at || "",
                        tipe: it.tipe || "",
                        bahan_id: it.bahan_id || "",
                        bahan_nama:
                          it.bahan_nama ||
                          bahan.find((b) => b.id === it.bahan_id)?.nama ||
                          bahan.find((b) => b.id === it.bahan_id)?.nama_bahan ||
                          "",
                        qty: it.qty ?? "",
                        satuan:
                          it.satuan ||
                          bahan.find((b) => b.id === it.bahan_id)?.satuan ||
                          "",
                        catatan: it.catatan || "",
                      }));
                      const csv = toCSV(rows, [
                        "id",
                        "created_at",
                        "tipe",
                        "bahan_id",
                        "bahan_nama",
                        "qty",
                        "satuan",
                        "catatan",
                      ]);
                      const blob = new Blob([csv], {
                        type: "text/csv;charset=utf-8",
                      });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      const now = new Date()
                        .toISOString()
                        .slice(0, 19)
                        .replace(/[:T]/g, "-");
                      a.href = url;
                      a.download = `riwayat-inventory-${now}.csv`;
                      document.body.appendChild(a);
                      a.click();
                      URL.revokeObjectURL(url);
                      a.remove();
                    }}
                    disabled={!logs.length}
                    className={cn(
                      "px-3 py-2 rounded-xl text-sm",
                      logs.length
                        ? "border hover:bg-gray-50"
                        : "bg-gray-200 text-gray-500 cursor-not-allowed"
                    )}
                  >
                    Export CSV
                  </button>
                  <button
                    onClick={() => {
                      const blob = new Blob([JSON.stringify(logs, null, 2)], {
                        type: "application/json",
                      });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      const now = new Date()
                        .toISOString()
                        .slice(0, 19)
                        .replace(/[:T]/g, "-");
                      a.href = url;
                      a.download = `riwayat-inventory-${now}.json`;
                      document.body.appendChild(a);
                      a.click();
                      URL.revokeObjectURL(url);
                      a.remove();
                    }}
                    disabled={!logs.length}
                    className={cn(
                      "px-3 py-2 rounded-xl text-sm",
                      logs.length
                        ? "border hover:bg-gray-50"
                        : "bg-gray-200 text-gray-500 cursor-not-allowed"
                    )}
                  >
                    Download JSON
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="px-3 py-2 rounded-xl border hover:bg-gray-50 text-sm"
                  >
                    Print
                  </button>
                </div>
              </div>

              <div className="grid md:grid-cols-6 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-sm mb-1">Filter Bahan</label>
                  {bahanOptions.length > 0 ? (
                    <select
                      value={fBahan}
                      onChange={(e) => setFBahan(e.target.value)}
                      className="w-full border rounded-xl px-3 py-2 outline-none"
                    >
                      <option value="">— semua bahan —</option>
                      {bahanOptions.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={fBahan}
                      onChange={(e) => setFBahan(e.target.value)}
                      placeholder="UUID bahan (opsional)"
                      className="w-full border rounded-xl px-3 py-2 outline-none"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-sm mb-1">Tipe</label>
                  <select
                    value={fType}
                    onChange={(e) => setFType(e.target.value as any)}
                    className="w-full border rounded-xl px-3 py-2 outline-none"
                  >
                    <option value="">semua</option>
                    <option value="in">in</option>
                    <option value="out">out</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1">Limit</label>
                  <input
                    type="number"
                    min={1}
                    value={limit}
                    onChange={(e) => setLimit(Number(e.target.value))}
                    className="w-full border rounded-xl px-3 py-2 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Sejak</label>
                  <input
                    type="datetime-local"
                    value={since ? new Date(since).toISOString().slice(0, 16) : ""}
                    onChange={(e) =>
                      setSince(
                        e.target.value
                          ? new Date(e.target.value).toISOString()
                          : ""
                      )
                    }
                    className="w-full border rounded-xl px-3 py-2 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Sampai</label>
                  <input
                    type="datetime-local"
                    value={until ? new Date(until).toISOString().slice(0, 16) : ""}
                    onChange={(e) =>
                      setUntil(
                        e.target.value
                          ? new Date(e.target.value).toISOString()
                          : ""
                      )
                    }
                    className="w-full border rounded-xl px-3 py-2 outline-none"
                  />
                </div>
              </div>

              {/* Chart */}
              <Card>
                <div className="flex items-center gap-2 mb-3">
                  <div className="text-sm font-medium">Grafik Qty per Mutasi</div>
                  <select
                    value={chartBahan}
                    onChange={(e) => setChartBahan(e.target.value)}
                    className="ml-auto border rounded-xl px-3 py-2 text-sm"
                  >
                    <option value="">Semua bahan</option>
                    {bahanOptions.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ width: "100%", height: 320 }}>
                  <ResponsiveContainer>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="t" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="qty" name="Qty" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Table */}
              {logsLoading ? (
                <div className="overflow-auto rounded-xl border">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b">
                        <th className="p-2 text-left">Waktu</th>
                        <th className="p-2 text-left">Tipe</th>
                        <th className="p-2 text-left">Bahan</th>
                        <th className="p-2 text-left">Qty</th>
                        <th className="p-2 text-left">Catatan</th>
                        <th className="p-2 text-left">ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      <TableSkeletonRows rows={8} cols={6} />
                    </tbody>
                  </table>
                </div>
              ) : logsErr ? (
                <div className="text-sm text-red-600">{logsErr}</div>
              ) : (
                <>
                  <div className="overflow-auto rounded-xl border">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b">
                          <th className="p-2 text-left">Waktu</th>
                          <th className="p-2 text-left">Tipe</th>
                          <th className="p-2 text-left">Bahan</th>
                          <th className="p-2 text-left">Qty</th>
                          <th className="p-2 text-left">Catatan</th>
                          <th className="p-2 text-left">ID</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedLogs.map((it, idx) => {
                          const nama =
                            it.bahan_nama ||
                            bahan.find((b) => b.id === it.bahan_id)?.nama ||
                            bahan.find((b) => b.id === it.bahan_id)?.nama_bahan ||
                            it.bahan_id;
                          return (
                            <tr
                              key={idx}
                              className="border-b odd:bg-white even:bg-gray-50/50"
                            >
                              <td className="p-2 whitespace-nowrap">
                                {fmtDT(it.created_at)}
                              </td>
                              <td className="p-2">
                                <Badge
                                  variant={
                                    it.tipe === "in"
                                      ? "in"
                                      : it.tipe === "out"
                                      ? "out"
                                      : "neutral"
                                  }
                                >
                                  {it.tipe || "-"}
                                </Badge>
                              </td>
                              <td className="p-2">{nama}</td>
                              <td className="p-2">
                                {it.qty} {it.satuan || ""}
                              </td>
                              <td className="p-2">{it.catatan || "—"}</td>
                              <td className="p-2 text-xs font-mono break-all">
                                {it.id || "—"}
                              </td>
                            </tr>
                          );
                        })}
                        {pagedLogs.length === 0 && (
                          <tr>
                            <td
                              className="p-3 text-center opacity-60"
                              colSpan={6}
                            >
                              Belum ada data.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <div className="text-xs opacity-70">
                      Menampilkan {(page - 1) * pageSize + 1}–
                      {Math.min(page * pageSize, logs.length)} dari {logs.length}
                    </div>
                    <div className="flex gap-2">
                      <button
                        disabled={page === 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        className={cn(
                          "px-3 py-2 rounded-xl border",
                          page === 1
                            ? "opacity-40 cursor-not-allowed"
                            : "hover:bg-gray-50"
                        )}
                      >
                        Prev
                      </button>
                      <button
                        disabled={page * pageSize >= logs.length}
                        onClick={() => setPage((p) => p + 1)}
                        className={cn(
                          "px-3 py-2 rounded-xl border",
                          page * pageSize >= logs.length
                            ? "opacity-40 cursor-not-allowed"
                            : "hover:bg-gray-50"
                        )}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Debug */}
              {logsDebug && (
                <div className="rounded-xl border border-yellow-300 bg-yellow-50 p-3 text-xs space-y-1">
                  <div className="font-medium">Debug Riwayat</div>
                  <div>
                    <b>Terakhir URL:</b> {logsDebug.url}
                  </div>
                  <div>
                    <b>Status:</b> {logsDebug.status}
                  </div>
                  <div>
                    <b>Content-Type:</b> {logsDebug.ctype || "(kosong)"}
                  </div>
                  {logsDebug.tried?.length ? (
                    <details>
                      <summary>Semua URL yang dicoba</summary>
                      <ul className="list-disc ml-5">
                        {logsDebug.tried.map((u) => (
                          <li key={u}>{u}</li>
                        ))}
                      </ul>
                    </details>
                  ) : null}
                  {logsDebug.raw ? (
                    <details>
                      <summary>Preview non-JSON (600 chars)</summary>
                      <pre className="mt-1 whitespace-pre-wrap">
                        {logsDebug.raw}
                      </pre>
                    </details>
                  ) : null}
                  <div className="pt-2">
                    <div className="font-medium">cURL setara:</div>
                    <pre className="whitespace-pre-wrap">{`curl "${logsDebug.url}" -H "x-owner-id: ${OWNER_ID}"`}</pre>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Modal Tambah Bahan */}
          {showAddBahan && (
            <div className="fixed inset-0 z-[100] bg-black/30 flex items-center justify-center p-4">
              <div className="w-full max-w-md rounded-2xl bg-white shadow-lg border p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-lg font-semibold">Tambah Bahan</div>
                  <button
                    onClick={() => setShowAddBahan(false)}
                    className="text-sm opacity-60 hover:opacity-100"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm mb-1">Nama Bahan</label>
                    <input
                      value={addNama}
                      onChange={(e) => setAddNama(e.target.value)}
                      className="w-full border rounded-xl px-3 py-2 outline-none"
                      placeholder="Contoh: Tepung Terigu"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Satuan</label>
                    <input
                      value={addSatuan}
                      onChange={(e) => setAddSatuan(e.target.value)}
                      className="w-full border rounded-xl px-3 py-2 outline-none"
                      placeholder="kg / gr / pcs"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">
                      Harga per Satuan (opsional)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={addHarga}
                      onChange={(e) =>
                        setAddHarga(
                          e.target.value === "" ? "" : Number(e.target.value)
                        )
                      }
                      className="w-full border rounded-xl px-3 py-2 outline-none"
                      placeholder="mis. 12000"
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={createBahan}
                      disabled={addBahanLoading || !addNama.trim()}
                      className={`px-4 py-2 rounded-xl text-white ${
                        addBahanLoading || !addNama.trim()
                          ? "bg-gray-400"
                          : "bg-black hover:opacity-90"
                      }`}
                    >
                      {addBahanLoading ? "Menyimpan..." : "Simpan"}
                    </button>
                    <button
                      onClick={() => setShowAddBahan(false)}
                      className="px-4 py-2 rounded-xl border hover:bg-gray-50"
                    >
                      Batal
                    </button>
                  </div>

                  <div className="text-xs opacity-70 pt-1">
                    FE akan mencoba POST ke: <code>/setup/bahan</code>,{" "}
                    <code>/inventory/bahan</code>, <code>/materials</code>,{" "}
                    <code>/bahan</code> (urut). Disarankan BE finalize di{" "}
                    <code>POST /setup/bahan</code> dengan body:{" "}
                    {"{ nama, satuan?, harga_per_satuan? }"} dan mengembalikan{" "}
                    {"{ ok:true, data:{ id } }"}.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Dev Notes */}
          <Card>
            <h4 className="font-medium mb-1">Catatan Dev</h4>
            <ul className="list-disc ml-5 text-sm space-y-1">
              <li>
                Auto-detect path untuk <code>logs</code> &amp;{" "}
                <code>stock</code>. Set ENV kalau backend sudah final:
                <pre className="mt-1 text-xs bg-gray-50 p-2 rounded">
{`NEXT_PUBLIC_INVENTORY_LOGS_PATH=/inventory/history
NEXT_PUBLIC_INVENTORY_STOCK_PATH=/inventory/summary
NEXT_PUBLIC_BAHAN_CREATE_PATH=/setup/bahan`}
                </pre>
              </li>
              <li>
                Ambang stok rendah via{" "}
                <code>NEXT_PUBLIC_LOW_STOCK_THRESHOLD</code> (default 10).
              </li>
              <li>Recharts untuk grafik qty per mutasi.</li>
            </ul>
          </Card>
        </main>
      </div>
    
  );
}
export default function InventoryPage() {
  return (
    <ToastProvider>
      <InventoryPageInner />
    </ToastProvider>
  );
}
