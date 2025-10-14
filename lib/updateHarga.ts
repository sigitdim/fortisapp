import { supabase } from "@/lib/supabaseClient";

export async function updateHargaJualUser(produkId: string, harga: number) {
  const { error } = await supabase
    .from("produk")
    .update({ harga_jual_user: harga })
    .eq("id", produkId);
  if (error) throw error;
}
