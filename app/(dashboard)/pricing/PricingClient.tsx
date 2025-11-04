// @ts-nocheck
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

/** ===== Helpers untuk fallback nama kolom ===== */
function num(v: any, d: number = 0) {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && !Number.isNaN(n) ? n : d;
}
function pick(obj: any, keys: string[], d: any = null) {
  for (const k of keys) {
    if (obj && obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return d;
}
// === CSV helper (standalone) ===
function exportToCsv(rows: Record<string, any>[], filename = "pricing.csv") {
  if (!rows || rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const esc = (v: any) =>
    v == null ? "" : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v);
  const csv =
    "\ufeff" +
    [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  a.download = filename.replace(/\.csv$/i, `-${ts}.csv`);
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// === Baca data langsung dari tabel yang sudah tampil ===
// Urutan kolom tabel: Produk | HPP | Harga Jual | Profit | Margin | Aksi
function scrapePricingTable(): Record<string, any>[] {
  const table = (document.getElementById("pricing-table") || document.querySelector("table")) as HTMLTableElement | null;
  if (!table) return [];
  const rows: any[] = [];
  const trs = table.querySelectorAll("tbody tr");
  const txt = (el: Element | null | undefined) => (el?.textContent || "").trim();

  trs.forEach((tr) => {
    const tds = tr.querySelectorAll("td");
    if (tds.length < 5) return;

    const produk = txt(tds[0]);
    const hpp = Number(txt(tds[1]).replace(/[^\d.-]/g, ""));
    const hargaInput = tds[2].querySelector("input") as HTMLInputElement | null;
    const hargaJual = Number((hargaInput?.value ?? txt(tds[2]).replace(/[^\d.-]/g, "")) || 0);
    const profit = Number(txt(tds[3]).replace(/[^\d.-]/g, "")) || Math.max(0, hargaJual - hpp);
    const marginPctTxt = txt(tds[4]).replace(/[^0-9.]/g, "");
    const margin_pct = marginPctTxt || (hargaJual ? ((profit / hargaJual) * 100).toFixed(2) : "0");

    rows.push({ produk, hpp, harga_jual: hargaJual, profit, margin_pct });
  });

  return rows;
}


type DisplayRow = {
  produk_id: string;
  nama_produk: string;
  hpp_total_per_porsi: number;
  harga_rekomendasi: number;
  harga_jual_user: number;
  profit_user_per_porsi: number;
  margin_user_persen: number;
};

export default function PricingClient() {
  const [raw, setRaw] = useState<any[]>([]);
  const [rows, setRows] = useState<DisplayRow[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");

  async function fetchData() {
    setLoading(true);
    setErr("");
    const { data, error } = await supabase
      .from("v_pricing_final")
      .select("*") // <— ambil semua biar aman kalau nama kolom beda
      .order("nama_produk", { ascending: true })
      .limit(1000);

    if (error) {
      console.error("Supabase error:", error);
      setErr(error.message);
      setLoading(false);
      return;
    }

    const list = (data ?? []) as any[];

    const mapped: DisplayRow[] = list.map((r) => {
      const produk_id = String(pick(r, ["produk_id", "id"], ""));
      const nama_produk = String(
        pick(r, ["nama_produk", "produk_nama", "name", "nama"], "")
      );

      const hpp_total_per_porsi = num(
        pick(r, [
          "hpp_total_per_porsi",
          "total_hpp",
          "hpp_total",
          "total_hpp_per_porsi",
          "hpp",
        ]),
        0
      );

      const harga_rekomendasi = num(
        pick(r, ["harga_rekomendasi", "harga_rek", "recommended_price"]),
        0
      );

      const harga_jual_user = num(
        pick(r, ["harga_jual_user", "harga_jual", "price", "harga"]),
        0
      );

      const profit_user_per_porsi = num(
        pick(r, ["profit_user_per_porsi", "profit", "profit_per_porsi"]),
        harga_jual_user - hpp_total_per_porsi
      );

      const margin_user_persen = num(
        pick(r, ["margin_user_persen", "margin", "margin_persen"]),
        harga_jual_user
          ? ((harga_jual_user - hpp_total_per_porsi) / harga_jual_user) * 100
          : 0
      );

      return {
        produk_id,
        nama_produk,
        hpp_total_per_porsi,
        harga_rekomendasi,
        harga_jual_user,
        profit_user_per_porsi,
        margin_user_persen,
      };
    });

    setRaw(list);
    setRows(mapped);
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => r.nama_produk.toLowerCase().includes(s));
  }, [q, rows]);

  const exportCSV = () => {
    const header = [
      "Nama Produk",
      "HPP",
      "Harga Rekomendasi",
      "Harga Jual",
      "Profit",
      "Margin %",
    ].join(",");
    const body = filtered
      .map((r) =>
        [
          `"${(r.nama_produk || "").replaceAll('"', '""')}"`,
          r.hpp_total_per_porsi,
          r.harga_rekomendasi,
          r.harga_jual_user,
          r.profit_user_per_porsi,
          r.margin_user_persen.toFixed(2),
        ].join(",")
      )
      .join("\n");
    const csv = [header, body].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "rekap_pricing.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xl font-semibold">Rekap Pricing</h2>
        <div className="flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari produk…"
            className="px-3 py-2 border rounded w-64"
          />
          <span className="text-sm text-gray-600">Total: {filtered.length}</span>
          <button onClick={exportCSV} className="px-3 py-2 border rounded">
            Export CSV
          </button>
          <button onClick={fetchData} className="px-3 py-2 border rounded">
            Refresh
          </button>
        </div>
      </div>

      {loading && <div className="p-3">Memuat data…</div>}
      {err && (
        <div className="p-3 text-sm text-red-600 border border-red-200 rounded">
          Error: {err}
        </div>
      )}

      {!loading && !err && (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="p-2 border">Produk</th>
              <th className="p-2 border">HPP</th>
              <th className="p-2 border">Harga Rekomendasi</th>
              <th className="p-2 border">Harga Jual</th>
              <th className="p-2 border">Profit</th>
              <th className="p-2 border">Margin %</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.produk_id}>
                <td className="p-2 border">{r.nama_produk}</td>
                <td className="p-2 border">{r.hpp_total_per_porsi}</td>
                <td className="p-2 border">{r.harga_rekomendasi}</td>
                <td className="p-2 border">{r.harga_jual_user}</td>
                <td className="p-2 border">{r.profit_user_per_porsi}</td>
                <td className="p-2 border">
                  {r.margin_user_persen.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Debug toggle sederhana (optional)
      <details className="border rounded p-3 text-xs">
        <summary>Raw (debug)</summary>
        <pre>{JSON.stringify(raw, null, 2)}</pre>
      </details>
      */}
    </div>
  );
}
/* ===== Export CSV (inject di sebelah tombol Reload) ===== */
(() => {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  // ---- helpers ----
  function exportToCsv(rows: Record<string, any>[], filename = "pricing.csv") {
    if (!rows || rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const esc = (v:any)=> v==null? "" : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g,'""')}"` : String(v);
    const csv = "\ufeff"+[headers.join(","), ...rows.map(r=>headers.map(h=>esc(r[h])).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    const ts = new Date().toISOString().slice(0,19).replace(/[:T]/g,"-");
    a.download = filename.replace(/\.csv$/i, `-${ts}.csv`);
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  // baca dari tabel (kolom: Produk | HPP | Harga Jual | Profit | Margin | Aksi)
  function scrapeTable(): Record<string, any>[] {
    const table = (document.getElementById("pricing-table") || document.querySelector("table")) as HTMLTableElement|null;
    if (!table) return [];
    const rows:any[] = [];
    const trs = table.querySelectorAll("tbody tr");
    const txt = (el:Element|null|undefined)=> (el?.textContent||"").trim();

    trs.forEach(tr=>{
      const tds = tr.querySelectorAll("td");
      if (tds.length < 5) return;
      const produk = txt(tds[0]);
      const hpp = Number(txt(tds[1]).replace(/[^\d.-]/g,""));
      const hargaInput = tds[2].querySelector("input") as HTMLInputElement|null;
      const hargaJual = Number((hargaInput?.value ?? txt(tds[2]).replace(/[^\d.-]/g,""))||0);
      const profit = Number(txt(tds[3]).replace(/[^\d.-]/g,"")) || Math.max(0, hargaJual - hpp);
      const marginPctTxt = txt(tds[4]).replace(/[^0-9.]/g,"");
      const margin_pct = marginPctTxt || (hargaJual ? ((profit/hargaJual)*100).toFixed(2) : "0");
      rows.push({ produk, hpp, harga_jual: hargaJual, profit, margin_pct });
    });
    return rows;
  }

  // cari toolbar & tombol Reload
  function findToolbar(): HTMLElement|null {
    const btns = Array.from(document.querySelectorAll("button")) as HTMLButtonElement[];
    const reloadBtn = btns.find(b => (b.textContent||"").trim().toLowerCase() === "reload");
    return reloadBtn?.parentElement || null;
  }

  function ensureButton() {
    const toolbar = findToolbar();
    if (!toolbar) return;
    if (toolbar.querySelector("#__export_csv_btn")) return; // no duplicate

    const btn = document.createElement("button");
    btn.id = "__export_csv_btn";
    btn.type = "button";
    btn.textContent = "Export CSV";
    btn.className = "border rounded-xl px-3 py-2 hover:bg-gray-100";
    btn.addEventListener("click", ()=>{
      const rows = scrapeTable();
      if (!rows.length) { alert("Tidak ada data untuk diekspor."); return; }
      exportToCsv(rows, "pricing.csv");
    });

    toolbar.appendChild(btn); // taruh tepat di sebelah Reload
  }

  function ready(fn:()=>void){
    if (document.readyState === "complete" || document.readyState === "interactive") setTimeout(fn,0);
    else document.addEventListener("DOMContentLoaded", fn, { once:true });
  }

  ready(ensureButton);
  const obs = new MutationObserver(()=>ensureButton());
  obs.observe(document.documentElement, { childList:true, subtree:true });
  window.addEventListener("beforeunload", ()=>obs.disconnect(), { once:true });
})();
/* ===== END Export CSV ===== */
/* === PRICING CSV ADDON (1 tombol di sebelah "Reload") === */
(() => {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  // --- helper export csv ---
  function exportToCsv(rows: Record<string, any>[], filename = "pricing.csv") {
    if (!rows || rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const esc = (v:any) => v==null ? "" : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g,'""')}"` : String(v);
    const csv = "\ufeff" + [headers.join(","), ...rows.map(r => headers.map(h => esc(r[h])).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    const ts = new Date().toISOString().slice(0,19).replace(/[:T]/g,"-");
    a.download = filename.replace(/\.csv$/i, `-${ts}.csv`);
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  // baca data dari tabel (kolom: Produk | HPP | Harga Jual | Profit | Margin | Aksi)
  function scrapeTable(): Record<string, any>[] {
    const table = (document.getElementById("pricing-table") || document.querySelector("table")) as HTMLTableElement | null;
    if (!table) return [];
    const txt = (el: Element | null | undefined) => (el?.textContent || "").trim();
    const rows:any[] = [];
    table.querySelectorAll("tbody tr").forEach(tr => {
      const tds = tr.querySelectorAll("td");
      if (tds.length < 5) return;
      const produk = txt(tds[0]);
      const hpp = Number(txt(tds[1]).replace(/[^\d.-]/g,""));
      const hargaInput = tds[2].querySelector("input") as HTMLInputElement | null;
      const hargaJual = Number((hargaInput?.value ?? txt(tds[2]).replace(/[^\d.-]/g,"")) || 0);
      const profit = Number(txt(tds[3]).replace(/[^\d.-]/g,"")) || Math.max(0, hargaJual - hpp);
      const marginPctTxt = txt(tds[4]).replace(/[^0-9.]/g,"");
      const margin_pct = marginPctTxt || (hargaJual ? ((profit/hargaJual)*100).toFixed(2) : "0");
      rows.push({ produk, hpp, harga_jual: hargaJual, profit, margin_pct });
    });
    return rows;
  }

  // cari toolbar yang berisi input "Cari nama produk..." + tombol "Reload"
  function findToolbar(): HTMLElement | null {
    const reloadBtn = Array.from(document.querySelectorAll("button"))
      .find(b => (b.textContent || "").trim().toLowerCase() === "reload");
    return (reloadBtn && reloadBtn.parentElement) ? (reloadBtn.parentElement as HTMLElement) : null;
  }

  // pastikan hanya 1 tombol export, letakkan di kanan "Reload"
  function ensureExportBtn() {
    const toolbar = findToolbar();
    if (!toolbar) return;

    // hapus export yang nongol di tempat lain
    Array.from(document.querySelectorAll("button")).forEach(b => {
      const t = (b.textContent || "").trim().toLowerCase();
      if (t === "export csv" && !toolbar.contains(b)) b.remove();
    });

    // kalau sudah ada di toolbar, jangan duplikat
    const exists = Array.from(toolbar.querySelectorAll("button"))
      .some(b => (b.textContent || "").trim().toLowerCase() === "export csv");
    if (exists) return;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "Export CSV";
    btn.className = "border rounded-xl px-3 py-2 hover:bg-gray-100";
    btn.onclick = () => {
      const data = scrapeTable();
      if (!data.length) { alert("Tidak ada data untuk diekspor."); return; }
      exportToCsv(data, "pricing.csv");
    };

    toolbar.appendChild(btn);
  }

  function ready(fn: () => void) {
    if (document.readyState === "complete" || document.readyState === "interactive") setTimeout(fn,0);
    else document.addEventListener("DOMContentLoaded", fn, { once: true });
  }

  ready(ensureExportBtn);
  const mo = new MutationObserver(() => ensureExportBtn());
  mo.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("beforeunload", () => mo.disconnect(), { once: true });
})();
/* === END PRICING CSV ADDON === */
