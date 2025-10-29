export function rupiah(n: number | string = 0) {
  const v = typeof n === 'string' ? Number(n || 0) : (n ?? 0)
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v)
}
export const formatIDR = rupiah
export function percent(n: number | string = 0, digits = 0) {
  const v = typeof n === 'string' ? Number(n || 0) : (n ?? 0)
  return `${v.toFixed(digits)}%`
}
