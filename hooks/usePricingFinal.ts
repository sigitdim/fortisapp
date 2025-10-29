'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildHeaders } from '@/lib/api';

export type PricingFinal = {
  produk_id: string;
  nama_produk?: string | null;
  harga_jual_user?: number | null;
  harga_rekomendasi?: number | null;
  hpp_total_per_porsi?: number | null;
  margin_user_persen?: number | null;
  [key: string]: unknown;
};

type State = {
  data: PricingFinal | null;
  loading: boolean;
  error: string | null;
};

async function fetchPricingFinal(produkId: string): Promise<PricingFinal | null> {
  // 1) Coba endpoint pricing/final (jika tersedia)
  {
    const res = await fetch(`/api/pricing/final?produk_id=${encodeURIComponent(produkId)}`, {
      method: 'GET',
      headers: buildHeaders(),
      cache: 'no-store',
    });
    if (res.ok) {
      const json = await res.json().catch(() => null);
      // Bisa berupa array atau objek tunggal — normalize ke objek
      if (Array.isArray(json)) return (json[0] ?? null) as PricingFinal | null;
      return (json as PricingFinal) ?? null;
    }
    // kalau 404, lanjut ke fallback; kalau error lain, biar ditangkap caller
    if (res.status !== 404) {
      const t = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status} ${res.statusText}${t ? `: ${t}` : ''}`);
    }
  }

  // 2) Fallback ke report/hpp (ambil baris produk terkait jika array)
  {
    const res = await fetch(`/api/report/hpp?produk_id=${encodeURIComponent(produkId)}`, {
      method: 'GET',
      headers: buildHeaders(),
      cache: 'no-store',
    });
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status} ${res.statusText}${t ? `: ${t}` : ''}`);
    }
    const json = await res.json().catch(() => null);
    if (!json) return null;
    if (Array.isArray(json)) {
      const row = json.find((r: any) => r?.produk_id === produkId) ?? json[0] ?? null;
      return row as PricingFinal | null;
    }
    return json as PricingFinal | null;
  }
}

/** Hook untuk mengambil ringkasan pricing final sebuah produk */
export function usePricingFinal(produkId?: string | null) {
  const [state, setState] = useState<State>({ data: null, loading: !!produkId, error: null });
  const pid = produkId ?? '';
  const lastId = useRef<string>('');

  const run = useCallback(async () => {
    if (!pid) {
      setState({ data: null, loading: false, error: null });
      return;
    }
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fetchPricingFinal(pid);
      setState({ data, loading: false, error: null });
    } catch (e: any) {
      setState({ data: null, loading: false, error: e?.message ?? 'Gagal memuat pricing' });
    }
  }, [pid]);

  useEffect(() => {
    if (pid && lastId.current !== pid) {
      lastId.current = pid;
      run();
    }
  }, [pid, run]);

  const refresh = useCallback(() => run(), [run]);

  // helper turunan
  const marginText = useMemo(() => {
    const v = state.data?.margin_user_persen;
    if (v === null || v === undefined) return '-';
    const pct = Number(v) * 100;
    return `${Number.isFinite(pct) ? pct.toFixed(1) : '-'}%`;
  }, [state.data]);

  return {
    ...state,          // {data, loading, error}
    refresh,           // fn
    marginText,        // string '12.3%'
  } as const;
}

export default usePricingFinal;
