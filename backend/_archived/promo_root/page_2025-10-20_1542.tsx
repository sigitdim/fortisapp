"use client";

import { useEffect, useMemo, useState } from "react";
import PromoForm, { PromoInput } from "@/components/promo/PromoForm";
import { apiDelete, apiGet, apiPost, apiPut, resolveProdukNames } from "@/lib/api";

type Promo = {
  id: string;
  nama: string;
  tipe: string;
  nilai: number;
  produk_ids: unknown;
  aktif: boolean;
};
type RespList = { ok: boolean; data: unknown };
type RespOne = { ok: boolean; data: Promo };

function idr(n:number){ try { return new Intl.NumberFormat("id-ID",{maximumFractionDigits:0}).format(n);} catch { return String(n);} }
function safeNum(n:any){const x=Number(n); return Number.isFinite(x)?x:0;}

export default function PromoPage() {
  const [items, setItems] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string|null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all"|"aktif"|"nonaktif">("all");
  const [tipe, setTipe] = useState<"all"|"percent"|"nominal">("all");
  const [sort, setSort] = useState<"terbaru"|"nama_asc"|"aktif_desc">("terbaru");
  const [page, setPage] = useState(1);
  const [updatedAt, setUpdatedAt] = useState<string>("");
  const pageSize = 9;

  // Modal state
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string|null>(null);
  const [resolvingMap, setResolvingMap] = useState<Record<string,string>>({});

  async function load() {
    try {
      setLoading(true);
      setErr(null);
      const json = await apiGet<RespList>("/promo");
      if (!json || (json as any).ok !== true) throw new Error("Response not ok");
      const arr = Array.isArray((json as any).data) ? (json as any).data : [];
      const safe = arr.map((p: any) => ({
        id: String(p?.id ?? ""),
        nama: String(p?.nama ?? "-"),
        tipe: String(p?.tipe ?? ""),
        nilai: Number(p?.nilai ?? 0),
        produk_ids: p?.produk_ids ?? null,
        aktif: Boolean(p?.aktif),
      })) as Promo[];
      setItems(safe);
      setUpdatedAt(new Date().toLocaleString("id-ID"));
      // resolve product names
      const allIds = new Set<string>();
      safe.forEach(p => { if (Array.isArray(p.produk_ids)) p.produk_ids.forEach((x:any)=>allIds.add(String(x))) });
      if (allIds.size) setResolvingMap(await resolveProdukNames(Array.from(allIds)));
    } catch (e:any) {
      setErr(e?.message || "Gagal memuat promo");
    } finally {
      setLoading(false);
    }
  }

  useEffect(()=>{ load(); }, []);

  // filter + search + sort
  const filtered = useMemo(()=>{
    const ql = q.trim().toLowerCase();
    let list = items.filter(p=>{
      if (status!=="all" && (status==="aktif"? !p.aktif : p.aktif)) return false;
      if (tipe!=="all" && (p.tipe||"").toLowerCase()!==tipe) return false;
      if (ql && !(`${p.nama}`.toLowerCase().includes(ql) || `${p.tipe}`.toLowerCase().includes(ql))) return false;
      return true;
    });
    if (sort==="nama_asc") list = list.slice().sort((a,b)=>a.nama.localeCompare(b.nama));
    else if (sort==="aktif_desc") list = list.slice().sort((a,b)=> Number(b.aktif)-Number(a.aktif));
    else list = list.slice(); // terbaru: biarkan dari server (created_at desc)
    return list;
  },[items,q,status,tipe,sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageClamped = Math.min(page, totalPages);
  const sliced = filtered.slice((pageClamped-1)*pageSize, pageClamped*pageSize);
  useEffect(()=>{ setPage(1); }, [q,status,tipe,sort]);

  async function addPromo(payload: PromoInput) {
    const resp = await apiPost<RespOne>("/promo", payload);
    if (!resp?.ok) throw new Error("POST gagal");
    setShowAdd(false);
    await load();
  }
  async function updatePromo(id: string, payload: PromoInput) {
    const resp = await apiPut<RespOne>(`/promo/${id}`, payload);
    if (!resp?.ok) throw new Error("PUT gagal");
    setEditId(null);
    await load();
  }
  async function removePromo(id: string) {
    if (!confirm("Hapus promo ini?")) return;
    const resp = await apiDelete<{ ok: boolean }>(`/promo/${id}`);
    if (!resp?.ok) throw new Error("DELETE gagal");
    await load();
  }

  return (
    <main className="p-4 md:p-6 space-y-4">
      {/* Header & Controls */}
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Promo</h1>
          <p className="text-sm text-gray-500">
            {loading ? "Memuat…" : `${filtered.length} promo • diperbarui ${updatedAt || "-"}`}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Cari nama/tipe…"
                 className="h-9 rounded-xl border px-3 text-sm outline-none focus:ring-2 focus:ring-black/5" />
          <select value={status} onChange={(e)=>setStatus(e.target.value as any)} className="h-9 rounded-xl border px-3 text-sm">
            <option value="all">Semua Status</option>
            <option value="aktif">Aktif</option>
            <option value="nonaktif">Nonaktif</option>
          </select>
          <select value={tipe} onChange={(e)=>setTipe(e.target.value as any)} className="h-9 rounded-xl border px-3 text-sm">
            <option value="all">Semua Tipe</option>
            <option value="percent">Percent</option>
            <option value="nominal">Nominal</option>
          </select>
          <select value={sort} onChange={(e)=>setSort(e.target.value as any)} className="h-9 rounded-xl border px-3 text-sm" title="Sort">
            <option value="terbaru">Terbaru</option>
            <option value="nama_asc">Nama (A-Z)</option>
            <option value="aktif_desc">Aktif dulu</option>
          </select>
          <button onClick={()=>setShowAdd(true)} className="h-9 rounded-xl border px-3 text-sm">+ Add Promo</button>
          <button onClick={load} className="h-9 rounded-xl border px-3 text-sm">Refresh</button>
        </div>
      </header>

      {/* Error / Loading / Empty */}
      {err && <div className="border border-red-200 bg-red-50 text-red-800 p-3 rounded-xl text-sm">{err}</div>}
      {!err && loading && (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_,i)=><div key={i} className="h-32 rounded-2xl border animate-pulse bg-gray-50" />)}
        </div>
      )}
      {!err && !loading && sliced.length===0 && (
        <div className="border rounded-xl p-6 text-center text-gray-500">Tidak ada promo yang cocok.</div>
      )}

      {/* Cards */}
      {!err && !loading && sliced.length>0 && (
        <>
          <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {sliced.map((p)=>{
              const ids = Array.isArray(p.produk_ids) ? p.produk_ids.map(String) : [];
              const cnt = ids.length;
              const names = ids.map(id => resolvingMap[id] || id);
              const t = (p.tipe||"").toLowerCase();
              const label = t==="percent" ? `${safeNum(p.nilai)}%`
                           : t==="nominal" ? `Rp ${idr(safeNum(p.nilai))}`
                           : `${idr(safeNum(p.nilai))} (${p.tipe||"tipe?"})`;
              return (
                <li key={p.id} className="rounded-2xl border p-4 shadow-sm hover:shadow transition">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-medium">{p.nama}</h2>
                    <span className={`text-xs px-2 py-1 rounded-full border ${p.aktif ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-600 border-gray-200"}`}>
                      {p.aktif ? "AKTIF" : "NONAKTIF"}
                    </span>
                  </div>

                  <div className="mt-2 text-sm text-gray-600 space-y-1">
                    <div><span className="inline-block w-28 text-gray-500">Tipe</span><span className="font-medium">{t==="percent"?"Percent":t==="nominal"?"Nominal":p.tipe||"-"}</span></div>
                    <div><span className="inline-block w-28 text-gray-500">Nilai</span><span className="font-medium">{label}</span></div>
                    <div title={names.join(", ")}>
                      <span className="inline-block w-28 text-gray-500">Produk</span>
                      <span className="font-medium">{cnt} item</span>
                    </div>
                    <div className="text-[11px] text-gray-400 break-all">ID: {p.id}</div>
                  </div>

                  <div className="pt-3 flex gap-2">
                    <button onClick={()=>setEditId(p.id)} className="h-8 rounded-lg border px-3 text-xs">Edit</button>
                    <button onClick={()=>removePromo(p.id)} className="h-8 rounded-lg border px-3 text-xs">Delete</button>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Pagination */}
          <div className="flex items-center justify-center gap-2 pt-2">
            <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={pageClamped<=1} className="h-9 rounded-xl border px-3 text-sm disabled:opacity-50">Prev</button>
            <span className="text-sm text-gray-600">Page <strong>{pageClamped}</strong> / {totalPages}</span>
            <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={pageClamped>=totalPages} className="h-9 rounded-xl border px-3 text-sm disabled:opacity-50">Next</button>
          </div>
        </>
      )}

      {/* Modal Add */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-4 w-full max-w-md">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Add Promo</h3>
              <button onClick={()=>setShowAdd(false)} className="text-sm">✕</button>
            </div>
            <PromoForm onSubmit={addPromo} onCancel={()=>setShowAdd(false)} submitLabel="Tambah"/>
          </div>
        </div>
      )}

      {/* Modal Edit */}
      {editId && (() => {
        const curr = items.find(x=>x.id===editId);
        const init: PromoInput = {
          nama: curr?.nama || "",
          tipe: ((curr?.tipe||"percent").toLowerCase() as any) === "nominal" ? "nominal" : "percent",
          nilai: Number(curr?.nilai ?? 0),
          produk_ids: Array.isArray(curr?.produk_ids)? curr!.produk_ids.map(String): [],
          aktif: Boolean(curr?.aktif),
        };
        return (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-4 w-full max-w-md">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">Edit Promo</h3>
                <button onClick={()=>setEditId(null)} className="text-sm">✕</button>
              </div>
              <PromoForm
                initial={init}
                onSubmit={(val)=>updatePromo(editId, val)}
                onCancel={()=>setEditId(null)}
                submitLabel="Update"
              />
            </div>
          </div>
        );
      })()}
    </main>
  );
}
