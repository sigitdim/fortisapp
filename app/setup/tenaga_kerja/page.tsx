// @ts-nocheck
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

type TKRow = {
  id: string;
  nama: string;
  gaji_bulanan?: number | null;
  jam_per_hari?: number | null;
  hari_per_minggu?: number | null;
  catatan?: string | null;
  created_at?: string;
};

function toNum(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (v == null || v === "") return 0;
  const s = String(v).replace(/[^0-9.,-]/g, "").replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}
function rupiah(n: number): string {
  try {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n || 0);
  } catch {
    return `Rp ${Math.round(n || 0).toLocaleString("id-ID")}`;
  }
}

export default function TenagaKerjaPage() {
  const [rows, setRows] = useState<TKRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const j = await api.getJson<any>("/api/setup/tenaga_kerja");
      const arr: TKRow[] = Array.isArray(j?.data) ? j.data : (Array.isArray(j) ? j : []);
      setRows(arr);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  async function createRow() {
    setSaving(true);
    try {
      const payload: Partial<TKRow> = { nama: "Karyawan Baru", gaji_bulanan: 0, jam_per_hari: 8, hari_per_minggu: 6 };
      await api.postJson("/api/setup/tenaga_kerja", payload);
      await loadData();
    } finally {
      setSaving(false);
    }
  }

  async function saveRow(row: TKRow) {
    setSaving(true);
    try {
      const body = {
        nama: row.nama,
        gaji_bulanan: toNum(row.gaji_bulanan ?? 0),
        jam_per_hari: toNum(row.jam_per_hari ?? 0),
        hari_per_minggu: toNum(row.hari_per_minggu ?? 0),
        catatan: row.catatan ?? null,
      };
      await api.putJson(`/api/setup/tenaga_kerja/${row.id}`, body);
      await loadData();
    } finally {
      setSaving(false);
    }
  }

  async function deleteRow(id: string) {
    setSaving(true);
    try {
      await api.delJson(`/api/setup/tenaga_kerja/${id}`);
      await loadData();
    } finally {
      setSaving(false);
    }
  }

  function onCellChange(id: string, key: keyof TKRow, value: string) {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [key]: key.includes("gaji") || key.includes("jam") || key.includes("hari") ? toNum(value) : value } as TKRow : r))
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={createRow} disabled={saving} className="px-4 py-2 rounded-xl bg-black text-white disabled:opacity-50">
          + Tambah Karyawan
        </button>
        {loading && <span className="text-sm text-gray-500">Memuat…</span>}
      </div>

      <div className="overflow-x-auto rounded-2xl border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">Nama</th>
              <th className="px-3 py-2 text-left">Gaji / bln</th>
              <th className="px-3 py-2 text-left">Jam / hari</th>
              <th className="px-3 py-2 text-left">Hari / mgg</th>
              <th className="px-3 py-2 text-left">Catatan</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2">
                  <input className="border rounded-md px-2 py-1 w-56" value={r.nama ?? ""} onChange={(e) => onCellChange(r.id, "nama", e.target.value)} />
                </td>
                <td className="px-3 py-2">
                  <input className="border rounded-md px-2 py-1 w-40" value={String(r.gaji_bulanan ?? 0)} onChange={(e) => onCellChange(r.id, "gaji_bulanan", e.target.value)} />
                  <div className="text-[11px] text-gray-500">{rupiah(toNum(r.gaji_bulanan ?? 0))}</div>
                </td>
                <td className="px-3 py-2">
                  <input className="border rounded-md px-2 py-1 w-28" value={String(r.jam_per_hari ?? 0)} onChange={(e) => onCellChange(r.id, "jam_per_hari", e.target.value)} />
                </td>
                <td className="px-3 py-2">
                  <input className="border rounded-md px-2 py-1 w-28" value={String(r.hari_per_minggu ?? 0)} onChange={(e) => onCellChange(r.id, "hari_per_minggu", e.target.value)} />
                </td>
                <td className="px-3 py-2">
                  <input className="border rounded-md px-2 py-1 w-64" value={r.catatan ?? ""} onChange={(e) => onCellChange(r.id, "catatan", e.target.value)} />
                </td>
                <td className="px-3 py-2 flex gap-2">
                  <button onClick={() => saveRow(r)} disabled={saving} className="px-3 py-1 rounded-lg bg-emerald-600 text-white disabled:opacity-50">
                    Simpan
                  </button>
                  <button onClick={() => deleteRow(r.id)} disabled={saving} className="px-3 py-1 rounded-lg bg-red-600 text-white disabled:opacity-50">
                    Hapus
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && !loading && (
              <tr>
                <td className="px-3 py-6 text-center text-gray-500" colSpan={6}>Belum ada data.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
