export type OverheadRow = { id: string; nama: string; biaya: number };

function pick(obj: any, keys: string[]) {
  for (const k of keys) if (obj?.[k] !== undefined && obj?.[k] !== null) return obj[k];
  return null;
}

function toNum(v: any): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (!v) return 0;
  const s = String(v).replace(/[^\d.,-]/g, "");
  const clean = s.replace(/\./g, "").replace(/,/g, ".");
  const n = parseFloat(clean);
  return Number.isFinite(n) ? n : 0;
}

/** Tambahkan dukungan ke biaya_bulanan */
export function normalizeOverheadList(json: any): OverheadRow[] {
  const arr = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];
  return arr.map((r: any) => ({
    id: String(pick(r, ["id", "uuid", "overhead_id"]) ?? ""),
    nama: String(pick(r, ["nama", "name", "title", "nama_overhead"]) ?? ""),
    biaya: toNum(
      pick(r, [
        "biaya",
        "biaya_per_periode",
        "biaya_periode",
        "biaya_bulanan", // ✅ inilah field yang kamu pakai di BE
        "nilai",
        "nominal",
        "amount",
        "price",
        "cost",
      ])
    ),
  }));
}
