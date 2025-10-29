"use client";

import React, { useEffect, useMemo, useState } from "react";

/** Safe helper untuk ambil search params di client */
function getSearchParam(name: string): string {
  if (typeof window === "undefined") return "";
  try {
    const sp = new URLSearchParams(window.location.search);
    return sp.get(name) ?? "";
  } catch {
    return "";
  }
}

type Row = any;

export default function PriceHistory(props: { bahanId?: string }) {
  const bahanId = props.bahanId ?? getSearchParam("bahan_id") ?? "";
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!bahanId) return;
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch(`/api/bahan/${bahanId}/logs`, { cache: "no-store" });
        const j = await res.json().catch(() => ({}));
        const list: Row[] = Array.isArray(j?.data) ? j.data : [];
        if (!cancelled) setRows(list);
      } catch (e) {
        !cancelled && setErr(String(e));
      } finally {
        !cancelled && setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [bahanId]);

  const last = useMemo(() => rows?.[rows.length - 1] ?? null, [rows]);

  return (
    <div className="p-4 rounded-2xl border">
      <div className="font-semibold mb-2">Price History</div>
      {!bahanId && <div className="text-sm text-red-600">bahan_id kosong</div>}
      {loading && <div className="text-sm">Loading…</div>}
      {err && <div className="text-sm text-red-600">{err}</div>}
      {!loading && !err && (
        <div className="text-sm">
          <div>Total log: {rows.length}</div>
          {last && (
            <div className="mt-1 opacity-80">
              Terakhir: {String(last?.tanggal ?? last?.created_at ?? "")} —{" "}
              {String(last?.harga ?? last?.price ?? "")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
