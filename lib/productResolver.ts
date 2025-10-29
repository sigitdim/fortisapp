/* @ts-nocheck */
import api, { fetchProdukList } from "@/lib/api";

export type ProductLite = { id: string; nama: string };

/** Kembalikan peta {id: {id,nama}} untuk daftar ids yang diminta.
 *  Tahan format BE apapun: {id|produk_id|uuid, nama|name|product_name}
 */
export async function resolveProducts(ids: string[]): Promise<Record<string, ProductLite>> {
  const all = await fetchProdukList().catch(() => []) as any[];
  const map: Record<string, ProductLite> = {};
  for (const p of (all || [])) {
    const id = String(p?.id ?? p?.produk_id ?? p?.uuid ?? "");
    const nama = p?.nama ?? p?.product_name ?? p?.name ?? id;
    if (id) map[id] = { id, nama };
  }
  const out: Record<string, ProductLite> = {};
  for (const id of ids) out[id] = map[id] ?? { id, nama: id };
  return out;
}
