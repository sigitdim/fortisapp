export function toRupiah(n: number | null | undefined) {
  const v = Number(n ?? 0) || 0;
  return v.toLocaleString("id-ID");
}

export function parseNumber(input: string) {
  // "50.000" -> 50000
  const s = (input || "").replace(/[^\d\-]/g, "");
  return Number(s || 0);
}
