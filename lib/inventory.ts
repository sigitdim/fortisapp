type Bahan = { id:string; nama:string; satuan:string };
let bahanCache: Bahan[] | null = null;

export async function getBahanList(fetcher:(url:string)=>Promise<any>, path:string) {
  if (bahanCache) return bahanCache;
  const res = await fetcher(path);
  // BE: { ok:true, data:[{id,nama,satuan,...}] }
  const items = (res?.data || []).map((d:any)=>({ id:d.id, nama:d.nama ?? d.nama_bahan ?? "", satuan:d.satuan ?? d.unit ?? "" }));
  bahanCache = items;
  return items;
}
export function findBahanName(id:string) {
  return (bahanCache||[]).find(b=>b.id===id)?.nama || "";
}
