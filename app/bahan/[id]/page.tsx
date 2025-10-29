'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

/* ========================= TYPES ========================= */
type LogItem = {
  id: string;
  created_at: string;
  tipe: 'in' | 'out' | 'void' | 'adjust';
  qty: number;
  catatan?: string | null;
  bahan_id: string;
  bahan_nama?: string | null;
  satuan?: string | null;
};

type LogsResponse = {
  bahan?: {
    id: string;
    nama_bahan?: string | null;
    satuan?: string | null;
    harga?: number | null;
  } | null;
  logs: LogItem[];
};

/* ========================= HELPERS ========================= */
function safeParamId(params: ReturnType<typeof useParams>): string {
  const raw: any = (params as any)?.id;
  if (Array.isArray(raw)) return raw[0] ?? '';
  return raw ?? '';
}

const OWNER_ID = process.env.NEXT_PUBLIC_OWNER_ID ?? '';

/* ========================= PAGE ========================= */
export default function BahanLogsPage() {
  const params = useParams();
  const router = useRouter();
  const id = safeParamId(params);

  const [data, setData] = useState<LogsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setErr('Missing route param: id');
      setLoading(false);
      return;
    }
    let alive = true;

    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch(`/api/bahan/${id}/logs`, {
          headers: {
            'Content-Type': 'application/json',
            'x-owner-id': OWNER_ID,
          },
          cache: 'no-store',
        });
        if (!res.ok) {
          const t = await res.text().catch(() => '');
          throw new Error(`HTTP ${res.status} ${res.statusText}${t ? `: ${t}` : ''}`);
        }
        const json = (await res.json()) as LogsResponse;
        if (alive) setData(json);
      } catch (e: any) {
        if (alive) setErr(e?.message ?? 'Unknown error');
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [id]);

  const title = useMemo(() => {
    const nama =
      data?.bahan?.nama_bahan?.trim() ||
      data?.bahan?.id?.slice(0, 8) ||
      '(bahan)';
    return `Logs Bahan — ${nama}`;
  }, [data]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="text-sm text-gray-500">
            ID: <code>{id || '(unknown)'}</code>
          </p>
          {data?.bahan?.satuan && (
            <p className="text-sm text-gray-500">Satuan: {data.bahan.satuan}</p>
          )}
        </div>
        <button
          onClick={() => router.refresh()}
          className="rounded-xl px-3 py-2 border hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      {loading && <div className="rounded-xl border p-4">Memuat data…</div>}

      {err && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-red-700">
          Gagal memuat: {err}
        </div>
      )}

      {!loading && !err && (
        <>
          <div className="rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3">Waktu</th>
                  <th className="text-left p-3">Tipe</th>
                  <th className="text-right p-3">Qty</th>
                  <th className="text-left p-3">Satuan</th>
                  <th className="text-left p-3">Catatan</th>
                </tr>
              </thead>
              <tbody>
                {(data?.logs ?? []).map((it) => (
                  <tr key={it.id} className="border-t">
                    <td className="p-3">
                      {new Date(it.created_at).toLocaleString()}
                    </td>
                    <td className="p-3 uppercase">{it.tipe}</td>
                    <td className="p-3 text-right">{it.qty}</td>
                    <td className="p-3">{it.satuan ?? data?.bahan?.satuan ?? '-'}</td>
                    <td className="p-3">{it.catatan ?? '-'}</td>
                  </tr>
                ))}
                {(!data || data.logs.length === 0) && (
                  <tr>
                    <td className="p-3 text-center text-gray-500" colSpan={5}>
                      Belum ada log.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <details className="rounded-xl border p-4">
            <summary className="cursor-pointer font-medium">Raw JSON (debug)</summary>
            <pre className="mt-3 overflow-auto text-xs">
{JSON.stringify(data, null, 2)}
            </pre>
          </details>
        </>
      )}
    </div>
  );
}
