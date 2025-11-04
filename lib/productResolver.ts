import { fetchProdukList, apiGet } from "./api";

type AnyObj = Record<string, any>;

export async function resolveProdukNames(ids: string[]): Promise<Record<string,string>> {
  if (!ids || !ids.length) return {};
  // coba endpoint resolver umum; fallback ke fetchProdukList dan map
  try {
    const res = await apiGet<{ ok?: boolean; data?: Array<{id:string; nama?:string; name?:string}> }>(
      "/products/by-ids",
      { method: "GET" }
    );
    const arr = (res as any)?.data || [];
    const map: Record<string,string> = {};
    for (const it of arr) map[it.id] = it.nama || it.name || it.id;
    return map;
  } catch {
    const list = (await fetchProdukList<any>())?.data || [];
    const map: Record<string,string> = {};
    for (const it of list) {
      if (it?.id) map[it.id] = it.nama || it.name || it.id;
    }
    return map;
  }
}

export async function fetchProdukByIds(ids: string[]): Promise<any[]> {
  if (!ids || !ids.length) return [];
  try {
    const res = await apiGet<{ data?: any[] }>(`/products/by-ids?ids=${encodeURIComponent(ids.join(","))}`);
    return (res as any)?.data || [];
  } catch {
    const names = await resolveProdukNames(ids);
    return ids.map(id => ({ id, nama: names[id] || id }));
  }
}

const _default = { resolveProdukNames, fetchProdukByIds };
export default _default;
