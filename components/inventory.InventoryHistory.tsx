"use client";
import React, { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";

type AnyObj = any;

export default function InventoryHistory() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const r: AnyObj = await apiGet<any>("/inventory/history");
        const list: any[] = Array.isArray(r?.data) ? r.data : [];
        !cancelled && setData(list);
      } catch (e) {
        !cancelled && setErr(String(e));
      } finally {
        !cancelled && setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return <div className="hidden" data-count={data.length} data-loading={loading} data-error={!!err} />;
}
