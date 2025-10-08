import { supabase } from "@/lib/supabaseClient";
import type { UUID } from "@/types/db";

/** =========================
 * PRODUK
 * ========================= */
export type ProdukRow = {
  id: UUID;
  nama_produk: string;
  porsi: number | null;
  harga_jual: number | null;
  owner?: string | null;
  created_at?: string;
};

export async function getProdukList(): Promise<ProdukRow[]> {
  const { data, error } = await supabase
    .from("produk")
    .select("id, nama_produk, porsi, harga_jual")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getProdukById(id: UUID): Promise<ProdukRow | null> {
  const { data, error } = await supabase
    .from("produk")
    .select("id, nama_produk, porsi, harga_jual")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as ProdukRow | null;
}

export async function createProduk(payload: {
  nama: string;
  porsi: number;
  harga_jual: number | null;
}): Promise<ProdukRow> {
  const { data: auth, error: aerr } = await supabase.auth.getUser();
  if (aerr) throw aerr;
  const owner = auth.user?.id;
  if (!owner) throw new Error("User belum login.");

  const insertPayload = {
    nama_produk: payload.nama,
    porsi: payload.porsi,
    harga_jual: payload.harga_jual,
    owner,
  };

  const { data, error } = await supabase
    .from("produk")
    .insert([insertPayload])
    .select("id, nama_produk, porsi, harga_jual")
    .single();

  if (error) throw error;
  return data as ProdukRow;
}

export async function updateHargaJual(produkId: UUID, harga: number | null) {
  const { error } = await supabase
    .from("produk")
    .update({ harga_jual: harga })
    .eq("id", produkId);
  if (error) throw error;
}

/** =========================
 * KOMPOSISI
 * ========================= */
export type KomposisiRow = {
  id: UUID;
  produk_id: UUID;
  bahan_id: UUID;
  qty: number;
  unit: string;
  owner?: string | null;
};

export async function addKomposisi(input: {
  produk_id: UUID;
  bahan_id: UUID;
  qty: number;
  unit: string;
}): Promise<KomposisiRow> {
  const { data: auth, error: aerr } = await supabase.auth.getUser();
  if (aerr) throw aerr;
  const owner = auth.user?.id;
  if (!owner) throw new Error("User belum login.");

  const { data, error } = await supabase
    .from("komposisi")
    .insert([{ ...input, owner }])
    .select("*")
    .single();

  if (error) throw error;
  return data as KomposisiRow;
}

export async function deleteKomposisi(id: UUID): Promise<void> {
  const { error } = await supabase.from("komposisi").delete().eq("id", id);
  if (error) throw error;
}

/** Ambil komposisi + bahan untuk sebuah produk (buat tabel detail) */
export async function getProdukKomposisi(produkId: UUID): Promise<
  Array<
    KomposisiRow & {
      bahan: {
        id: UUID;
        name?: string;
        nama?: string;
        purchase_price?: number | null;
        purchase_qty?: number | null;
        purchase_unit?: string | null;
      };
    }
  >
> {
  const { data, error } = await supabase
    .from("komposisi")
    .select(
      `
      id, produk_id, bahan_id, qty, unit,
      bahan:bahan ( id, name, nama, purchase_price, purchase_qty, purchase_unit )
    `
    )
    .eq("produk_id", produkId)
    .order("id", { ascending: true });

  if (error) throw error;
  return (data ?? []) as any;
}

/** =========================
 * BAHAN (dropdown)
 * ========================= */
export type BahanLite = {
  id: string;
  name?: string;
  nama?: string;
  purchase_price?: number | null;
  purchase_qty?: number | null;
  purchase_unit?: string | null;
};

export async function getBahanList(): Promise<BahanLite[]> {
  const { data, error } = await supabase
    .from("bahan")
    .select("id, name, nama, purchase_price, purchase_qty, purchase_unit")
    .order("id", { ascending: true });

  if (error) throw error;
  return (data ?? []) as BahanLite[];
}

/** =========================
 * HPP (lama) via view v_hpp
 * ========================= */
export type VHPPRow = {
  produk_id: UUID;
  nama_produk: string;
  hpp_per_porsi: number;
};

export async function getHPPFromView(produkId: UUID): Promise<VHPPRow | null> {
  const { data, error } = await supabase
    .from("v_hpp")
    .select("produk_id, nama_produk, hpp_per_porsi")
    .eq("produk_id", produkId)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as VHPPRow | null;
}

/** =========================
 * OVERHEAD PER PORSI (tabel)
 * ========================= */
export type OverheadProdukRow = {
  produk_id: UUID;
  nilai: number | null; // Rp per porsi
};

export async function getOverheadProduk(produkId: UUID): Promise<OverheadProdukRow | null> {
  const { data, error } = await supabase
    .from("overhead_produk")
    .select("produk_id, nilai")
    .eq("produk_id", produkId)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as OverheadProdukRow | null;
}

export async function upsertOverheadProduk(produkId: UUID, nilai: number | null): Promise<void> {
  const payload = { produk_id: produkId, nilai };
  const { error } = await supabase
    .from("overhead_produk")
    .upsert(payload, { onConflict: "produk_id" });
  if (error) throw error;
}

/** =========================
 * HPP TOTAL (baru) via view v_hpp_total
 * ========================= */
export type VHppTotalRow = {
  produk_id: UUID;
  nama_produk: string;
  hpp_per_porsi?: number | null;      // opsional
  overhead_per_porsi?: number | null; // opsional
  hpp_total_per_porsi: number;        // wajib ada
};

export async function getHPPFromViewTotal(produkId: UUID): Promise<VHppTotalRow | null> {
  const { data, error } = await supabase
    .from("v_hpp_total")
    .select("produk_id, nama_produk, hpp_per_porsi, overhead_per_porsi, hpp_total_per_porsi")
    .eq("produk_id", produkId)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as VHppTotalRow | null;
}

/** =========================
 * Helper gabungan (prioritas server → fallback)
 * ========================= */
export type HppResolved = {
  produk_id: UUID;
  nama_produk: string;
  hpp_tanpa_overhead: number; // dari v_hpp_total.hpp_per_porsi atau v_hpp
  overhead_per_porsi: number; // dari v_hpp_total.overhead_per_porsi atau tabel overhead_produk
  hpp_total: number;          // dari v_hpp_total.hpp_total_per_porsi atau penjumlahan
  source: "server (v_hpp_total)" | "fallback (client merge)";
};

export async function getHPPWithOverhead(produkId: UUID): Promise<HppResolved | null> {
  // 1) Prioritas: v_hpp_total
  try {
    const total = await getHPPFromViewTotal(produkId);
    if (total) {
      const hppTanpa = Number(total.hpp_per_porsi ?? 0);
      const oh = Number(total.overhead_per_porsi ?? 0);
      const totalVal = Number(
        total.hpp_total_per_porsi ?? hppTanpa + oh
      );
      return {
        produk_id: total.produk_id,
        nama_produk: total.nama_produk,
        hpp_tanpa_overhead: hppTanpa,
        overhead_per_porsi: oh,
        hpp_total: totalVal,
        source: "server (v_hpp_total)",
      };
    }
  } catch {
    // biarkan fallback jalan
  }

  // 2) Fallback: v_hpp + overhead_produk
  const [vhpp, oh] = await Promise.all([
    getHPPFromView(produkId),
    getOverheadProduk(produkId),
  ]);

  if (!vhpp) return null;

  const hppTanpa = Number(vhpp.hpp_per_porsi ?? 0);
  const ohVal = Number(oh?.nilai ?? 0);
  return {
    produk_id: vhpp.produk_id,
    nama_produk: vhpp.nama_produk,
    hpp_tanpa_overhead: hppTanpa,
    overhead_per_porsi: ohVal,
    hpp_total: hppTanpa + ohVal,
    source: "fallback (client merge)",
  };
}
