"use client";
import { supabase } from "./supabaseClient";

export type Promo = {
  id: string;
  nama?: string | null;
  tipe: "percent" | "nominal";
  nilai: number;
  produk_ids: string[];
  aktif: boolean;
};

type CreatePromoBody = Omit<Promo, "id">;

export async function listPromos(): Promise<{ ok: boolean; data: Promo[] }> {
  const { data, error } = await supabase
    .from("promo")
    .select("id,nama,tipe,nilai,produk_ids,aktif")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return { ok: true, data: (data || []) as Promo[] };
}

export async function createPromo(b: CreatePromoBody) {
  const payload: any = {
    nama: b.nama ?? null,
    tipe: b.tipe,
    nilai: b.nilai,
    produk_ids: b.produk_ids ?? [],
    aktif: b.aktif ?? true,
  };
  const { data, error } = await supabase
    .from("promo")
    .insert(payload)
    .select("id,nama,tipe,nilai,produk_ids,aktif")
    .single();
  if (error) throw error;
  return { ok: true, data };
}
