import { supabase } from "@/lib/supabaseClient";

export type RekapRow = {
  produk_id: string;
  nama_produk: string;
  hpp_bahan_per_porsi?: number | null;
  overhead_per_porsi?: number | null;
  tenaga_kerja_per_porsi?: number | null;
  hpp_total_per_porsi?: number | null;
  harga_jual_user?: number | null;
};

export async function fetchRekapHPP(): Promise<RekapRow[]> {
  // 1) v_hpp_final
  const { data: vrows, error: e1 } = await supabase
    .from("v_hpp_final")
    .select("produk_id,nama_produk,hpp_bahan_per_porsi,overhead_per_porsi,tenaga_kerja_per_porsi,hpp_total_per_porsi");
  if (e1) throw e1;

  const ids = (vrows ?? []).map(r => r.produk_id);
  if (!ids.length) return [];

  // 2) harga_jual dari produk
  const { data: prods, error: e2 } = await supabase
    .from("produk")
    .select("id,harga_jual_user")
    .in("id", ids);
  if (e2) throw e2;

  const hargaMap = new Map<string, number | null>((prods ?? []).map(p => [p.id as string, (p as any).harga_jual_user ?? null]));

  // 3) merge
  const merged: RekapRow[] = (vrows ?? []).map(r => ({
    ...r,
    harga_jual_user: hargaMap.get(r.produk_id) ?? null,
  }));

  // urutkan alfabet nama produk
  merged.sort((a, b) => (a.nama_produk || "").localeCompare(b.nama_produk || ""));
  return merged;
}
