// lib/format.ts

export type RupiahOptions = {
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
};

/** Format angka ke Rupiah: rupiah(25000) -> "Rp25.000" */
export function rupiah(
  n?: number | null,
  opts: RupiahOptions = {}
): string {
  const { minimumFractionDigits = 0, maximumFractionDigits = 0 } = opts;
  const num = typeof n === "number" && isFinite(n) ? n : 0;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(num);
}

/** Optional helpers kalau nanti butuh */
export const asNumber = (v: any, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

// Default export agar import default juga jalan
const format = { rupiah, asNumber };
export default format;

