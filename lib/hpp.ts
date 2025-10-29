import { OWNER_ID, buildHeaders, putJson, postJson } from '@/lib/api';

/**
 * Update harga jual manual yang diedit user.
 * - Percobaan 1: PUT /api/produk/:id { harga_jual_user }
 * - Fallback: POST /api/pricing/apply { produk_id, harga_jual_user }
 */
export async function updateHargaJual(produkId: string, hargaBaru: number) {
  // Coba endpoint produk dulu
  try {
    return await putJson<any>(`/api/produk/${produkId}`, {
      harga_jual_user: hargaBaru,
    });
  } catch (err) {
    // Fallback ke pricing/apply jika endpoint produk tidak tersedia
    return await postJson<any>(`/api/pricing/apply`, {
      produk_id: produkId,
      harga_jual_user: hargaBaru,
    });
  }
}

/** Optional: helper fetcher kalau nanti dibutuhkan di komponen HPP lain */
export async function getHargaRekomendasi(produkId: string) {
  const res = await fetch(`/api/pricing/suggest?produk_id=${encodeURIComponent(produkId)}`, {
    method: 'GET',
    headers: buildHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${res.statusText}${t ? `: ${t}` : ''}`);
  }
  return (await res.json()) as unknown;
}

export default { updateHargaJual, getHargaRekomendasi };
