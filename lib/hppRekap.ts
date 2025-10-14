import { supabase } from "@/lib/supabaseClient";

export type RekapRow = {
  produk_id: string;
  nama_produk: string;
  hpp_bahan_per_porsi: number | null;
  overhead_per_porsi: number | null;
  tenaga_kerja_per_porsi: number | null;
  hpp_total_per_porsi: number | null;
  harga_jual_user: number | null;
};

export async function fetchRekapHPP(): Promise<RekapRow[]> {
  // Ambil langsung dari view; biarkan RLS filter by owner
  const { data, error } = await supabase
    .from("v_hpp_final")
    .select(
      "produk_id,nama_produk,hpp_bahan_per_porsi,overhead_per_porsi,tenaga_kerja_per_porsi,hpp_total_per_porsi,harga_jual_user"
    );
  if (error) throw error;

  const rows = (data ?? []) as RekapRow[];
  rows.sort((a, b) => (a.nama_produk || "").localeCompare(b.nama_produk || ""));
  return rows;
}
