// app/setup/bahan/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import clsx from "clsx";

/** =========================
 *  Types
 *  ========================= */
export type Bahan = {
  id: string;
  nama_bahan: string;
  satuan: string | null;
  harga: number | null;
  created_at: string;
};

type FetchState = "idle" | "loading" | "success" | "error";

/** =========================
 *  Helpers
 *  ========================= */
function formatIDR(n: number | null | undefined) {
  if (n == null) return "-";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

function cn(...args: any[]) {
  return clsx(args);
}

/** =========================
 *  Toast (simple, no deps)
 *  ========================= */
function useToast() {
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  return {
    msg,
    err,
    show: (m: string) => {
      setMsg(m);
      setTimeout(() => setMsg(null), 2500);
    },
    showErr: (m: string) => {
      setErr(m);
      setTimeout(() => setErr(null), 3500);
    },
    Toast: () => (
      <div className="fixed z-50 bottom-4 left-1/2 -translate-x-1/2 space-y-2">
        {msg && (
          <div className="bg-emerald-600 text-white px-4 py-2 rounded-xl shadow-lg">
            {msg}
          </div>
        )}
        {err && (
          <div className="bg-rose-600 text-white px-4 py-2 rounded-xl shadow-lg max-w-[80vw]">
            {err}
          </div>
        )}
      </div>
    ),
  };
}

/** =========================
 *  Pagination
 *  ========================= */
// NOTE: page size now controlled via state inside component

/** =========================
 *  Page Component
 *  ========================= */
export default function BahanPage() {
  const [items, setItems] = useState<Bahan[]>([]);
  const [count, setCount] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [q, setQ] = useState("");
  const [state, setState] = useState<FetchState>("idle");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState<number>(10);

  const { msg, err, show, showErr, Toast } = useToast();

  const totalPages = useMemo(() => Math.max(1, Math.ceil(count / pageSize)), [count, pageSize]);
  const rangeStart = useMemo(() => (page - 1) * pageSize, [page, pageSize]);
  const rangeEnd = useMemo(() => rangeStart + pageSize - 1, [rangeStart]);

  async function fetchData() {
    setState("loading");
    try {
      let query = supabase
        .from("bahan")
        .select("id,nama_bahan,satuan,harga,created_at", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(rangeStart, rangeEnd);

      if (q.trim()) {
        // simple ilike filter on nama_bahan
        query = query.ilike("nama_bahan", `%${q.trim()}%`);
      }

      const { data, count: total, error } = await query;
      if (error) throw error;
      setItems((data as Bahan[]) || []);
      setCount(total || 0);
      setState("success");
    } catch (e: any) {
      console.error(e);
      setState("error");
      showErr(e?.message || "Gagal ambil data");
    }
  }

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, q]);

  function resetAndRefetch() {
    // keep current page if still valid, else reset
    const newTotalPages = Math.max(1, Math.ceil((count || 1) / pageSize));
    if (page > newTotalPages) setPage(1);
    fetchData();
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <header className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Bahan</h1>
          <p className="text-sm text-muted-foreground">CRUD lengkap dengan pagination & RLS Supabase</p>
        </div>
        <div className="flex gap-2 items-center">
          <input
            className="border rounded-xl px-3 py-2 w-64 outline-none focus:ring-2 focus:ring-black/10"
            placeholder="Cari nama bahan..."
            value={q}
            onChange={(e) => { setPage(1); setQ(e.target.value); }}
          />
          <select
            className="border rounded-xl px-2 py-2 text-sm"
            value={pageSize}
            onChange={(e) => { setPage(1); setPageSize(Number(e.target.value)); }}
          >
            {[5,10,20,50].map(n => (
              <option key={n} value={n}>{n}/page</option>
            ))}
          </select>
        </div>
      </header>

      <section className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 order-2 md:order-1">
          <BahanTable
            items={items}
            loading={state === "loading" && items.length === 0}
            editingId={editingId}
            onStartEdit={(id) => setEditingId(id)}
            onCancelEdit={() => setEditingId(null)}
            onSaved={() => { setEditingId(null); show("Tersimpan"); resetAndRefetch(); }}
            onDeleted={() => { show("Terhapus"); resetAndRefetch(); }}
          />

          <Pagination
            page={page}
            totalPages={totalPages}
            onPrev={() => setPage((p) => Math.max(1, p - 1))}
            onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
            onJump={(p) => setPage(p)}
          />
        </div>

        <div className="order-1 md:order-2">
          <Card>
            <h3 className="font-semibold text-lg">Tambah Bahan</h3>
            <BahanForm
              onSuccess={() => {
                show("Bahan ditambahkan");
                // balik ke page 1 agar terlihat entri baru di urutan terbaru
                setPage(1);
                resetAndRefetch();
              }}
              onError={(m) => showErr(m)}
            />
          </Card>
        </div>
      </section>

      <Toast />
    </div>
  );
}

/** =========================
 *  Components
 *  ========================= */
function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border shadow-sm p-4 bg-white">
      {children}
    </div>
  );
}

function Button(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }
) {
  const { className, variant = "primary", ...rest } = props;
  return (
    <button
      className={cn(
        "px-3 py-2 rounded-xl text-sm font-medium transition",
        variant === "primary" && "bg-black text-white hover:bg-black/85",
        variant === "ghost" && "bg-transparent hover:bg-black/5",
        variant === "danger" && "bg-rose-600 text-white hover:bg-rose-700",
        className
      )}
      {...rest}
    />
  );
}

function SmallLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-xs text-neutral-500">{children}</span>;
}

/**
 * Create Form
 */
function BahanForm({ onSuccess, onError }: { onSuccess: () => void; onError: (msg: string) => void }) {
  const [nama, setNama] = useState("");
  const [satuan, setSatuan] = useState("pcs");
  const [harga, setHarga] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nama.trim()) return onError("Nama bahan wajib diisi");
    const hargaNum = harga ? Number(harga) : null;
    if (harga && Number.isNaN(hargaNum)) return onError("Harga harus angka");

    setLoading(true);
    try {
      const { error } = await supabase.from("bahan").insert({
        nama_bahan: nama.trim(),
        satuan: satuan || null,
        harga: hargaNum,
      });
      if (error) throw error;
      setNama(""); setSatuan("pcs"); setHarga("");
      onSuccess();
    } catch (e: any) {
      console.error(e);
      onError(e?.message || "Gagal menambah bahan");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <SmallLabel>Nama bahan</SmallLabel>
        <input className="w-full border rounded-xl px-3 py-2" value={nama} onChange={(e) => setNama(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <SmallLabel>Satuan</SmallLabel>
          <input className="w-full border rounded-xl px-3 py-2" value={satuan} onChange={(e) => setSatuan(e.target.value)} />
        </div>
        <div>
          <SmallLabel>Harga (IDR)</SmallLabel>
          <input className="w-full border rounded-xl px-3 py-2" value={harga} onChange={(e) => setHarga(e.target.value)} placeholder="contoh: 32000" />
        </div>
      </div>
      <div className="pt-1">
        <Button disabled={loading}>
          {loading ? "Menyimpan..." : "Simpan"}
        </Button>
      </div>
    </form>
  );
}

/**
 * Table + Inline Edit
 */
function BahanTable({
  items,
  loading,
  editingId,
  onStartEdit,
  onCancelEdit,
  onSaved,
  onDeleted,
}: {
  items: Bahan[];
  loading: boolean;
  editingId: string | null;
  onStartEdit: (id: string) => void;
  onCancelEdit: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  if (loading) return <div className="border rounded-2xl p-6 animate-pulse">Memuat data…</div>;
  if (items.length === 0) return <div className="border rounded-2xl p-6">Belum ada data.</div>;

  return (
    <div className="overflow-x-auto border rounded-2xl">
      <table className="min-w-full text-sm">
        <thead className="bg-neutral-50">
          <tr>
            <th className="text-left px-4 py-3">Nama</th>
            <th className="text-left px-4 py-3">Satuan</th>
            <th className="text-right px-4 py-3">Harga</th>
            <th className="px-4 py-3 w-40">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id} className="border-t">
              <td className="px-4 py-2 align-middle">
                {editingId === it.id ? (
                  <InlineEditText id={it.id} field="nama_bahan" initial={it.nama_bahan || ""} onSaved={() => onSaved()} />
                ) : (
                  <span className="font-medium">{it.nama_bahan}</span>
                )}
              </td>
              <td className="px-4 py-2 align-middle">
                {editingId === it.id ? (
                  <InlineEditText id={it.id} field="satuan" initial={it.satuan || ""} onSaved={() => onSaved()} />
                ) : (
                  <span>{it.satuan || "-"}</span>
                )}
              </td>
              <td className="px-4 py-2 align-middle text-right">
                {editingId === it.id ? (
                  <InlineEditNumber id={it.id} field="harga" initial={it.harga ?? undefined} onSaved={() => onSaved()} />
                ) : (
                  <span>{formatIDR(it.harga)}</span>
                )}
              </td>
              <td className="px-4 py-2 align-middle">
                {editingId === it.id ? (
                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={onCancelEdit}>Batal</Button>
                    <SmallLabel>Auto save saat blur/Enter</SmallLabel>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => onStartEdit(it.id)}>Edit</Button>
                    <DeleteButton id={it.id} onDeleted={onDeleted} />
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InlineEditText({ id, field, initial, onSaved }: { id: string; field: "nama_bahan" | "satuan"; initial: string; onSaved: () => void }) {
  const [val, setVal] = useState(initial);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (val === initial) return; // no-op
    setSaving(true);
    try {
      const { error } = await supabase.from("bahan").update({ [field]: val || null }).eq("id", id);
      if (error) throw error;
      onSaved();
    } catch (e) {
      console.error(e);
      alert("Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <input
      className={cn("border rounded-xl px-2 py-1 w-full", saving && "opacity-60")}
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => { if (e.key === "Enter") { (e.target as HTMLInputElement).blur(); } }}
      autoFocus
    />
  );
}

function InlineEditNumber({ id, field, initial, onSaved }: { id: string; field: "harga"; initial?: number; onSaved: () => void }) {
  const [val, setVal] = useState<string>(initial != null ? String(initial) : "");
  const [saving, setSaving] = useState(false);

  async function save() {
    const num = val === "" ? null : Number(val);
    if (val !== "" && Number.isNaN(num)) { alert("Harga harus angka"); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from("bahan").update({ [field]: num }).eq("id", id);
      if (error) throw error;
      onSaved();
    } catch (e) {
      console.error(e);
      alert("Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <input
      className={cn("border rounded-xl px-2 py-1 w-40 text-right", saving && "opacity-60")}
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => { if (e.key === "Enter") { (e.target as HTMLInputElement).blur(); } }}
      placeholder="32000"
      inputMode="numeric"
    />
  );
}

function DeleteButton({ id, onDeleted }: { id: string; onDeleted: () => void }) {
  const [loading, setLoading] = useState(false);

  async function del() {
    if (!confirm("Hapus bahan ini?\nSemua komposisi yang memakai bahan ini akan ikut dihapus.")) return;
    setLoading(true);
    try {
      // Hapus komposisi yang refer ke bahan ini terlebih dahulu (aman jika FK belum ON DELETE CASCADE)
      const { error: e1 } = await supabase.from("komposisi").delete().eq("bahan_id", id);
      if (e1) throw e1;

      // Lalu hapus bahan
      const { error: e2 } = await supabase.from("bahan").delete().eq("id", id);
      if (e2) throw e2;

      onDeleted();
    } catch (e) {
      console.error(e);
      alert("Gagal menghapus");
    } finally {
      setLoading(false);
    }
  }
  return (
    <Button variant="danger" onClick={del} disabled={loading}>{loading ? "Menghapus…" : "Hapus"}</Button>
  );
}

function Pagination({ page, totalPages, onPrev, onNext, onJump }: { page: number; totalPages: number; onPrev: () => void; onNext: () => void; onJump: (p: number) => void }) {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 7); // simple cap
  return (
    <div className="flex items-center justify-between mt-4">
      <SmallLabel>
        Halaman {page} dari {totalPages}
      </SmallLabel>
      <div className="flex gap-2">
        <Button variant="ghost" onClick={onPrev} disabled={page <= 1}>Prev</Button>
        {pages.map((p) => (
          <button key={p} onClick={() => onJump(p)} className={cn("px-3 py-2 rounded-xl text-sm border", p === page ? "bg-black text-white border-black" : "hover:bg-black/5")}>{p}</button>
        ))}
        <Button variant="ghost" onClick={onNext} disabled={page >= totalPages}>Next</Button>
      </div>
    </div>
  );
}
