export function toRupiah(n: number | null | undefined) {
  const v = Number(n ?? 0) || 0;
  return v.toLocaleString("id-ID");
}
