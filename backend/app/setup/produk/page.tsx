"use client";

import { useEffect, useMemo, useState } from "react";

type RawProduk = Record<string, any>;

type Produk = {
  id: string;
  nama: string;
  kategori: string;
  harga: number;
  aktif: boolean;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") || "https://api.fortislab.id";

// NOTE: Owner ID priority: localStorage.owner_id → ENV → fallback known dev
const getOwnerId = (): string => {
  if (typeof window !== "undefined") {
    const ls = window.localStorage.getItem("owner_id");
    if (ls && ls.length > 0) return ls;
  }
  return (
    process.env.NEXT_PUBLIC_OWNER_ID ||
    "f6269e9a-bc6d-4f8b-aa45-08affc769e5a"
  );
};

// Normalizer tahan banting: dukung beberapa variasi nama field dari BE
const normalizeProduk = (raw: RawProduk): Produk => {
  const nama =
    raw?.nama ??
    raw?.name ??
    raw?.product_name ??
    raw?.title ??
    "-";

  const kategori =
    raw?.kategori ??
    raw?.category ??
    raw?.kategori_produk ??
    raw?.type ??
    "-";

  const hargaRaw =
    raw?.harga_jual_user ??
    raw?.harga ??
    raw?.price ??
    raw?.harga_jual ??
    0;

  const aktif =
    (typeof raw?.aktif === "boolean" ? raw?.aktif : undefined) ??
    (typeof raw?.is_active === "boolean" ? raw?.is_active : undefined) ??
    true;

  return {
    id: String(raw?.id ?? ""),
    nama: String(nama ?? "-"),
    kategori: String(kategori ?? "-"),
    harga: Number(hargaRaw ?? 0),
    aktif: Boolean(aktif),
  };
};

const rupiah = (v: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(
    isFinite(v) ? v : 0
  );

type SortKey = "nama" | "kategori" | "harga";
type SortDir = "asc" | "desc";

export default function SetupProdukPage() {
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState<Produk[]>([]);
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("nama");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Form state (Tambah/Edit)
  const emptyForm: Produk = { id: "", nama: "", kategori: "", harga: 0, aktif: true };
  const [form, setForm] = useState<Produk>(emptyForm);
  const [showForm, setShowForm] = useState<"none" | "create" | "edit">("none");

  const ownerId = getOwnerId();

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    "x-owner-id": ownerId,
  };

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/produk`, { headers, cache: "no-store" });
      if (!res.ok) throw new Error(`GET /produk failed ${res.status}`);
      const json = await res.json();
      const rawArr = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
      const mapped = rawArr.map(normalizeProduk).filter((it: Produk) => it.id);
      setList(mapped);
    } catch (e) {
      console.error(e);
      // Jika BE masih di /setup/produk, fallback otomatis:
      try {
        const res2 = await fetch(`${API_BASE}/setup/produk`, { headers, cache: "no-store" });
        if (!res2.ok) throw new Error(`GET /setup/produk failed ${res2.status}`);
        const json2 = await res2.json();
        const rawArr2 = Array.isArray(json2?.data) ? json2.data : Array.isArray(json2) ? json2 : [];
        const mapped2 = rawArr2.map(normalizeProduk).filter((it: Produk) => it.id);
        setList(mapped2);
      } catch (ee) {
        console.error(ee);
        setList([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    let out = [...list];
    if (s) {
      out = out.filter(
        (it) =>
          it.nama.toLowerCase().includes(s) ||
          it.kategori.toLowerCase().includes(s) ||
          String(it.harga).includes(s)
      );
    }
    out.sort((a, b) => {
      let va: string | number = a[sortKey];
      let vb: string | number = b[sortKey];
      if (typeof va === "string") va = va.toLowerCase();
      if (typeof vb === "string") vb = vb.toLowerCase();
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return out;
  }, [list, q, sortKey, sortDir]);

  const onCreate = () => {
    setForm({ ...emptyForm, aktif: true });
    setShowForm("create");
  };

  const onEdit = (row: Produk) => {
    setForm({ ...row });
    setShowForm("edit");
  };

  const onDelete = async (row: Produk) => {
    if (!confirm(`Hapus produk "${row.nama}"?`)) return;
    try {
      // Utama: DELETE /produk/:id
      const res = await fetch(`${API_BASE}/produk/${row.id}`, {
        method: "DELETE",
        headers,
      });
      if (!res.ok) {
        // Fallback 1: POST /produk/delete
        const res2 = await fetch(`${API_BASE}/produk/delete`, {
          method: "POST",
          headers,
          body: JSON.stringify({ id: row.id }),
        });
        if (!res2.ok) {
          // Fallback 2: POST /produk {id, _delete:true}
          const res3 = await fetch(`${API_BASE}/produk`, {
            method: "POST",
            headers,
            body: JSON.stringify({ id: row.id, _delete: true }),
          });
          if (!res3.ok) throw new Error("Delete gagal di semua fallback");
        }
      }
      await fetchList();
      alert("Produk terhapus.");
    } catch (e: any) {
      console.error(e);
      alert("Gagal menghapus produk. Cek console / BE logs.");
    }
  };

  const submitForm = async (mode: "create" | "edit") => {
    if (!form.nama.trim()) {
      alert("Nama produk wajib diisi.");
      return;
    }
    try {
      // BE kita sudah seragam: POST (upsert) dan PUT
      const payload = {
        id: form.id || undefined, // biarkan undefined saat create
        nama: form.nama,
        kategori: form.kategori,
        harga_jual_user: Number(form.harga || 0),
        aktif: Boolean(form.aktif),
      };

      const method = mode === "edit" ? "PUT" : "POST";
      const res = await fetch(`${API_BASE}/produk`, {
        method,
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        // Fallback: kalau BE hanya terima POST upsert
        if (method === "PUT") {
          const res2 = await fetch(`${API_BASE}/produk`, {
            method: "POST",
            headers,
            body: JSON.stringify(payload),
          });
          if (!res2.ok) {
            throw new Error(`Save gagal: ${res.status} & fallback ${res2.status}`);
          }
        } else {
          throw new Error(`Save gagal: ${res.status}`);
        }
      }

      setShowForm("none");
      await fetchList();
      alert("Produk tersimpan.");
    } catch (e: any) {
      console.error(e);
      alert("Gagal menyimpan. Cek console / BE logs.");
    }
  };

  const exportCsv = () => {
    const rows = [
      ["id", "nama", "kategori", "harga", "aktif"],
      ...list.map((r) => [
        r.id,
        r.nama,
        r.kategori,
        String(r.harga ?? 0),
        r.aktif ? "1" : "0",
      ]),
    ];
    const csv = rows.map((r) =>
      r.map((cell) => {
        const s = String(cell ?? "");
        if (s.includes(",") || s.includes('"') || s.includes("\n")) {
          return `"${s.replace(/"/g, '""')}"`;
        }
        return s;
      }).join(",")
    ).join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `produk-${new Date().toISOString().slice(0,19).replace(/[:T]/g,"")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetForm = () => {
    setForm(emptyForm);
    setShowForm("none");
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Setup · Produk</h1>
          <p className="text-sm text-gray-500">
            GET/POST/PUT/DELETE — sinkron BE (22 Okt). Endpoint utama: <code>/produk</code>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCsv}
            className="px-4 py-2 rounded-2xl bg-white border hover:bg-gray-50"
          >
            Export CSV
          </button>
          <button
            onClick={fetchList}
            className="px-4 py-2 rounded-2xl bg-white border hover:bg-gray-50"
          >
            Refresh
          </button>
          <button
            onClick={onCreate}
            className="px-4 py-2 rounded-2xl bg-black text-white"
          >
            + Tambah Produk
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex-1">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari nama/kategori/harga..."
            className="w-full px-4 py-3 rounded-2xl border outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500">Sort:</label>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="px-3 py-2 rounded-xl border bg-white"
            >
              <option value="nama">Nama</option>
              <option value="kategori">Kategori</option>
              <option value="harga">Harga</option>
            </select>
            <select
              value={sortDir}
              onChange={(e) => setSortDir(e.target.value as SortDir)}
              className="px-3 py-2 rounded-xl border bg-white"
            >
              <option value="asc">A → Z</option>
              <option value="desc">Z → A</option>
            </select>
          </div>
        </div>
      </div>

      {/* Info count */}
      <div className="text-xs text-gray-500 mb-2">{filtered.length} data</div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border bg-white">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50 text-left text-sm">
              <th className="px-4 py-3 border-b">Nama</th>
              <th className="px-4 py-3 border-b">Kategori</th>
              <th className="px-4 py-3 border-b">Harga</th>
              <th className="px-4 py-3 border-b">Status</th>
              <th className="px-4 py-3 border-b text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-6 text-center text-gray-500" colSpan={5}>
                  Memuat...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-gray-500" colSpan={5}>
                  Tidak ada data.
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr key={row.id} className="text-sm">
                  <td className="px-4 py-3 border-t">{row.nama || "-"}</td>
                  <td className="px-4 py-3 border-t">{row.kategori || "-"}</td>
                  <td className="px-4 py-3 border-t">{row.harga ? rupiah(row.harga) : "-"}</td>
                  <td className="px-4 py-3 border-t">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs ${
                        row.aktif
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {row.aktif ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                  <td className="px-4 py-3 border-t">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onEdit(row)}
                        className="px-3 py-1.5 rounded-xl border bg-white hover:bg-gray-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDelete(row)}
                        className="px-3 py-1.5 rounded-xl bg-red-600 text-white hover:opacity-90"
                      >
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Drawer / Modal sederhana */}
      {showForm !== "none" && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50">
          <div className="w-full sm:max-w-lg bg-white rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">
                {showForm === "create" ? "Tambah Produk" : "Edit Produk"}
              </h3>
              <button onClick={resetForm} className="text-gray-500 hover:text-black">
                ✕
              </button>
            </div>

            <div className="grid gap-3">
              <div className="grid gap-1">
                <label className="text-sm text-gray-600">Nama</label>
                <input
                  value={form.nama}
                  onChange={(e) => setForm((s) => ({ ...s, nama: e.target.value }))}
                  placeholder="Nama produk"
                  className="px-3 py-2 rounded-xl border outline-none"
                />
              </div>

              <div className="grid gap-1">
                <label className="text-sm text-gray-600">Kategori</label>
                <input
                  value={form.kategori}
                  onChange={(e) => setForm((s) => ({ ...s, kategori: e.target.value }))}
                  placeholder="Minuman / Makanan / dll"
                  className="px-3 py-2 rounded-xl border outline-none"
                />
              </div>

              <div className="grid gap-1">
                <label className="text-sm text-gray-600">Harga Jual</label>
                <input
                  type="number"
                  value={form.harga}
                  onChange={(e) => setForm((s) => ({ ...s, harga: Number(e.target.value || 0) }))}
                  placeholder="0"
                  className="px-3 py-2 rounded-xl border outline-none"
                />
              </div>

              <div className="flex items-center gap-2 mt-1">
                <input
                  id="aktif"
                  type="checkbox"
                  checked={form.aktif}
                  onChange={(e) => setForm((s) => ({ ...s, aktif: e.target.checked }))}
                />
                <label htmlFor="aktif" className="text-sm">Aktif</label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                onClick={resetForm}
                className="px-4 py-2 rounded-2xl border bg-white hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={() => submitForm(showForm)}
                className="px-4 py-2 rounded-2xl bg-black text-white"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
