export const rupiah = (
n?: number | null,
opts: { minimumFractionDigits?: number; maximumFractionDigits?: number } = {}
) => {
const { minimumFractionDigits = 0, maximumFractionDigits = 0 } = opts;
const num = typeof n === "number" && isFinite(n) ? n : 0;
return new Intl.NumberFormat("id-ID", {
style: "currency",
currency: "IDR",
minimumFractionDigits,
maximumFractionDigits,
}).format(num);
};


/**
* Format angka lokal Indonesia tanpa simbol "Rp ".
* Contoh: formatIDR(12345) => "12.345"
*/
export const formatIDR = (n?: number | null) => {
const num = typeof n === "number" && isFinite(n) ? n : 0;
return num.toLocaleString("id-ID");
};


/**
* Versi yang mengembalikan "-" jika null/undefined (berguna buat tabel/kosong).
*/
export const fmt = (n: number | null | undefined) =>
n == null ? "-" : new Intl.NumberFormat("id-ID").format(n);


/** Any → Number|null (aman untuk input text/number) */
export const toNumber = (v: any) => {
if (v == null || v === "") return null;
const n = Number(v);
return Number.isFinite(n) ? n : null;
};


/** Persen → "12,3%" atau "-" */
export const percent = (p: number | null | undefined, digits = 1) =>
p == null ? "-" : `${p.toFixed(digits)}%`;


// Default export untuk kompatibilitas import default
export default { rupiah, formatIDR, fmt, toNumber, percent };