"use client";

import React, { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { rupiah } from "@/lib/format";

type OverheadItem = {
  id: string;
  nama?: string;
  biaya_bulanan?: number | null;
  created_at?: string;
};

export default function OverheadTab() {
  const [rows, setRows] = useState<OverheadItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [nama, setNama] = useState("");
  const [biaya, setBiaya] = useState<string>("");

  async function refresh() {
    setLoading(true); setErr(null);
    try {
      const r = await apiGet<{ data?: OverheadItem[] }>("/setup/overhead");
      setRows(Array.isArray(r?.data) ? r.data : (Array.isArray(r) ? (r as any) : []));
    } catch (e:any) {
      setErr(e?.message || "Gagal memuat data overhead");
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd() {
    if (!nama.trim()) return alert("Nama biaya wajib diisi");
    const payload = { nama: nama.trim(), biaya_bulanan: biaya ? Number(biaya) : 0 };
    setLoading(true); setErr(null);
    try {
      await apiPost("/setup/overhead", payload);
      setNama(""); setBiaya("");
      await refresh();
    } catch (e:any) {
      setErr(e?.message || "Gagal menambah overhead");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);
  const total = useMemo(() => rows.reduce((a,c)=> a + (Number(c.biaya_bulanan||0)), 0), [rows]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">Overhead</div>
        <button onClick={refresh} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50" disabled={loading}>
          {loading ? "Memuat..." : "Refresh"}
        </button>
      </div>

      {err && <div className="rounded-lg border border-red-300 bg-red-50 text-red-700 px-3 py-2 text-sm">{err}</div>}

      <div className="flex flex-wrap gap-2">
        <input value={nama} onChange={e=>setNama(e.target.value)} placeholder="Nama biaya" className="flex-1 min-w-[200px] rounded-lg border px-3 py-2" />
        <input value={biaya} onChange={e=>setBiaya(e.target.value.replace(/[^\d.]/g,""))} placeholder="Biaya per bulan" className="w-[200px] rounded-lg border px-3 py-2" />
        <button onClick={handleAdd} className="rounded-lg bg-black text-white px-4 py-2 text-sm" disabled={loading}>
          Tambah (POST)
        </button>
      </div>

      <div className="rounded-2xl border overflow-x-auto">
        <table className="min-w-[640px] w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 px-2">Nama</th>
              <th className="py-2 px-2">Biaya Bulanan</th>
              <th className="py-2 px-2 w-24">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {!rows.length && (
              <tr><td colSpan={3} className="py-3 px-2 text-gray-500">Belum ada data</td></tr>
            )}
            {rows.map((r)=>(
              <tr key={r.id} className="border-b last:border-0">
                <td className="py-2 px-2">{r.nama || "-"}</td>
                <td className="py-2 px-2">{rupiah(Number(r.biaya_bulanan||0))}</td>
                <td className="py-2 px-2">
                  <button onClick={()=>alert("Hapus/Update menunggu BE")} className="rounded-md border px-2 py-1 text-xs text-gray-600">
                    Aksi
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr><td className="py-2 px-2 font-medium">Total</td><td className="py-2 px-2 font-medium">{rupiah(total)}</td><td/></tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
