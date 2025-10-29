/** Konversi bebas-aman ke number (tahan input "1.250.000", "1,5", null, dll) */
export function toNum(v: any): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    // buang simbol non-digit kecuali - , . lalu normalisasi koma → titik
    const s = v.replace(/[^\d\-\.,]/g, "").replace(/\./g, "").replace(",", ".");
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  }
  if (typeof v === "boolean") return v ? 1 : 0;
  try {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

/** Format Rupiah sederhana tanpa simbol mata uang opsional */
export function rupiah(n: number | string, withSymbol = true): string {
  const val = toNum(n);
  const s = val.toLocaleString("id-ID");
  return withSymbol ? `Rp ${s}` : s;
}
