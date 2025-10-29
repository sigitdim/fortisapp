// @ts-nocheck
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

type ColumnDef = { key: string; label: string; width?: string };

type Props =
  | { resource: string; title?: string; columns?: ColumnDef[]; path?: never }
  | { path: string; title?: string; columns?: ColumnDef[]; resource?: never };

/**
 * SetupTable fleksibel:
 * - Gunakan salah satu: `resource="bahan"` ATAU `path="bahan"`
 * - Optional: `title` untuk heading, `columns` untuk kolom custom.
 * - Kalau `columns` tidak diberikan, kolom diambil dari key object pertama.
 */
export default function SetupTable(props: Props) {
  const seg = (props as any).path ?? (props as any).resource ?? "";
  const title = props.title;

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const j = await api.getJson<any>(`/api/setup/${seg}`);
      const arr = Array.isArray(j?.data) ? j.data : (Array.isArray(j) ? j : []);
      setRows(arr);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (seg) load(); }, [seg]);

  const autoColumns: ColumnDef[] = useMemo(() => {
    if (props.columns && props.columns.length) return props.columns;
    const first = rows[0];
    if (!first) return [{ key: "id", label: "ID" }];
    const keys = Object.keys(first).slice(0, 6); // batasi default 6 kolom
    return keys.map((k) => ({ key: k, label: k.replace(/_/g, " ").replace(/\b\w/g, m => m.toUpperCase()) }));
  }, [rows, props]);

  return (
    <div className="space-y-3">
      {!!title && <div className="text-base font-semibold">{title}</div>}

      <div className="overflow-x-auto rounded-2xl border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {autoColumns.map((c) => (
                <th key={c.key} className="px-3 py-2 text-left" style={{ width: c.width }}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id ?? i} className="border-t">
                {autoColumns.map((c) => (
                  <td key={c.key} className="px-3 py-2">
                    {formatCell(r?.[c.key])}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && !loading && (
              <tr>
                <td className="px-3 py-6 text-center text-gray-500" colSpan={autoColumns.length}>
                  Belum ada data.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {loading && <div className="text-sm text-gray-500">Memuat…</div>}
    </div>
  );
}

function formatCell(v: any) {
  if (v == null) return "";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}
