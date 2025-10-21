import { api } from "./api";

type ProdukLite = { id: string; nama?: string; name?: string };

const cache = new Map<string, string>(); // id -> nama produk

export async function resolveProductNames(
  ids: string[]
): Promise<Record<string, string>> {
  const unique = [...new Set(ids.filter(Boolean))];
  const missing = unique.filter((id) => !cache.has(id));

  if (missing.length === 0)
    return Object.fromEntries(unique.map((id) => [id, cache.get(id)!]));

  const tryPaths = [
    (ids: string[]) => `/produk/by-ids?ids=${encodeURIComponent(ids.join(","))}`,
    (ids: string[]) =>
      `/products/by-ids?ids=${encodeURIComponent(ids.join(","))}`,
    (ids: string[]) => `/product/by-ids?ids=${encodeURIComponent(ids.join(","))}`,
    (ids: string[]) => `/produk?ids=${encodeURIComponent(ids.join(","))}`,
  ];

  let list: ProdukLite[] = [];
  for (const build of tryPaths) {
    try {
      const resp = await api.get<{ ok?: boolean; data?: ProdukLite[] }>(
        build(missing)
      );
      const arr = resp?.data || [];
      if (Array.isArray(arr) && arr.length) {
        list = arr;
        break;
      }
    } catch (_) {}
  }

  for (const id of missing) {
    const found = list.find((x) => x.id === id);
    const nama = found?.nama || found?.name || id;
    cache.set(id, nama);
  }

  return Object.fromEntries(unique.map((id) => [id, cache.get(id)!]));
}

export function nameOf(id: string, map: Record<string, string>) {
  return map[id] || id;
}
