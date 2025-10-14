import { supabase } from "@/lib/supabaseClient";

export type Produk = { id: string; nama_produk: string };

export async function fetchProdukList(): Promise<Produk[]> {
  const { data, error } = await supabase
    .from("produk")
    .select("id,nama_produk")
    .order("nama_produk", { ascending: true });
  if (error) throw error;
  return data as Produk[];
}
