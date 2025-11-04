"use client";

import React, { useEffect, useMemo, useState } from "react";
import api, { apiGet, apiPost } from "@/lib/api";
import { rupiah } from "@/lib/format";

type Bahan = {
  id: string;
  nama_bahan: string;
  satuan?: string | null;
  harga?: number | null;
  created_at?: string;
};

export default function BahanTab() {
  const [rows, setRows] = useState<Bahan[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // form state
  const [nama, setNama] = useState("");
  const [satuan, setSatuan] = useState("");
  const [harga, setHarga] = useState<string>("");

  async function refresh() {
    setLoading(true); setErr(null);
    try {
      const r = await apiGet<{ data?: Bahan[] }>("/setup/bahan");
      setRows(Array.isArray(r?.data) ? r.data : (Array.isArray(r) ? (r as any) : []));
    } catch (e:any) {
      setErr(e?.message || "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd() {
    if (!nama.trim()) return alert("Nama bahan wajib diisi");
    const payload = {
      nama_bahan: nama.trim(),
      satuan: satuan.trim() || null,
      harga: harga ? Number(harga) : null,
    };
    setLoading(true); setErr(null);
    try {
      await apiPost("/setup/bahan", payload);
      setNama(""); setSatuan(""); setHarga("");
      await refresh();
    } catch (e:any) {
      setErr(e?.message || "Gagal menambah bahan");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  const total = useMemo(() => rows.length, [rows]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">Setup Bahan</div>
        <button
          onClick={refresh}
          className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
          disabled={loading}
        >
          {loading ? "Memuat..." : "Refresh"}
        </button>
      </div>

      {err && <div className="rounded-lg border border-red-300 bg-red-50 text-red-700 px-3 py-2 text-sm">{err}</div>}

      {/* Form tambah */}
      <div className="flex flex-wrap gap-2">
        <input
          value={nama}
          onChange={e=>setNama(e.target.value)}
          placeholder="Nama bahan"
          className="flex-1 min-w-[160px] rounded-lg border px-3 py-2"
        />
        <input
          value={satuan}
          onChange={e=>setSatuan(e.target.value)}
          placeholder="Satuan (pcs, gr, ml)"
          className="w-[180px] rounded-lg border px-3 py-2"
        />
        <input
          value={harga}
          onChange={e=>setHarga(e.target.value.replace(/[^\d.]/g,""))}
          placeholder="Harga (opsional)"
          className="w-[180px] rounded-lg border px-3 py-2"
        />
        <button
          onClick={handleAdd}
          className="rounded-lg bg-black text-white px-4 py-2 text-sm"
          disabled={loading}
        >
          Tambah (POST)
        </button>
      </div>

      {/* Table */}
      <div className="rounded-2xl border overflow-x-auto">
        <table className="min-w-[640px] w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 px-2">Nama</th>
              <th className="py-2 px-2">Satuan</th>
              <th className="py-2 px-2">Harga</th>
              <th className="py-2 px-2 w-24">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {!rows.length && (
              <tr><td colSpan={4} className="py-3 px-2 text-gray-500">Belum ada data</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-b last:border-0">
                <td className="py-2 px-2">{r.nama_bahan}</td>
                <td className="py-2 px-2">{r.satuan || "-"}</td>
                <td className="py-2 px-2">{r.harga != null ? rupiah(Number(r.harga)) : "-"}</td>
                <td className="py-2 px-2">
                  {/* Delete disembunyikan jika BE belum siap */}
                  <button
                    onClick={() => alert("Hapus belum diaktifkan oleh BE")}
                    className="rounded-md border px-2 py-1 text-xs text-gray-600"
                  >
                    Hapus
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="py-2 px-2 text-gray-500" colSpan={4}>Total: {total}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
