"use client";
import { api } from "@/lib/api";

export type CogsResult = {
  produk_id?: string;
  nama_produk?: string;
  total_bahan?: number|null;
  total_tenaga_kerja?: number|null;
  total_overhead?: number|null;
  total_batch?: number|null;
  per_porsi?: number|null;
  yield?: number|null;
  hpp?: number|null; // alias per_porsi
  raw?: any;         // simpan respons asli buat debugging
};

function num(x:any){ const n=Number(x); return Number.isFinite(n)?n:null; }

/** Panggil kalkulasi HPP dari BE. Akan coba beberapa endpoint umum. */
export async function calcHPPFromBE(produk_id: string): Promise<CogsResult> {
  const paths = [
    { path: "/cogs/calc", method: "POST" as const, body: { produk_id } },
    { path: "/pricing/cogs", method: "POST" as const, body: { produk_id } },
    { path: `/pricing/final?produk_id=${encodeURIComponent(produk_id)}`, method: "GET" as const, body: undefined },
  ];

  let lastErr: any = null;
  for (const p of paths) {
    try {
      const j = await api(p.path, p.method === "POST" ? { method:"POST", body:p.body } : {});
      const d = j?.data ?? j;

      // Normalisasi berbagai kemungkinan nama field dari BE
      const perPorsi = num(
        d?.per_porsi ?? d?.hpp_per_porsi ?? d?.hpp ?? d?.hpp_total_per_porsi
      );
      const totalBatch = num(d?.total_batch ?? d?.total ?? d?.hpp_total_batch);
      const totalBahan = num(d?.total_bahan ?? d?.bahan_total ?? d?.sum_bahan);
      const totalTK    = num(d?.total_tenaga_kerja ?? d?.tenaga_kerja_total ?? d?.sum_tk);
      const totalOH    = num(d?.total_overhead ?? d?.overhead_total ?? d?.sum_oh);
      const yld        = num(d?.yield ?? d?.jumlah_porsi ?? d?.serving);

      return {
        produk_id: d?.produk_id ?? produk_id,
        nama_produk: d?.nama_produk ?? d?.produk_nama,
        total_bahan: totalBahan,
        total_tenaga_kerja: totalTK,
        total_overhead: totalOH,
        total_batch: totalBatch ?? (totalBahan ?? 0) + (totalTK ?? 0) + (totalOH ?? 0),
        per_porsi: perPorsi ?? (yld ? Math.ceil(((totalBatch ?? 0) / yld)) : null),
        yield: yld,
        hpp: perPorsi ?? null,
        raw: d
      };
    } catch (e:any) {
      lastErr = e;
      // lanjut coba path berikutnya
    }
  }
  throw new Error(`COGS API tidak tersedia: ${lastErr?.message || lastErr || "unknown"}`);
}
