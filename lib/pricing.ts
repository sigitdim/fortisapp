// lib/pricing.ts
import { supabase } from "@/lib/supabaseClient";

const API = process.env.NEXT_PUBLIC_API_URL || "https://api.fortislab.id";

export type AISuggestionItem = {
  tipe: "Kompetitif" | "Standar" | "Premium" | string;
  harga_jual: number;
  margin_pct: number; // 0.6 = 60%
  strategi?: string;
  alasan?: string;
};

export type AISuggestionResp = {
  produk: string;
  kategori: string | null;
  hpp: number;
  rekomendasi: AISuggestionItem[];
  analisa_umum?: string;
};

async function ownerId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  const uid = data?.user?.id;
  if (!uid) throw new Error("User not found / not logged in");
  return uid;
}

export async function pricingSuggest(input: {
  produk_id: string;
  target_margin_pct?: number; // default 0.35
}): Promise<AISuggestionResp> {
  const uid = await ownerId();
  const res = await fetch(`${API}/pricing/suggest`, {
    method: "POST",
    headers: {
      "x-owner-id": uid,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      produk_id: input.produk_id,
      target_margin_pct: input.target_margin_pct ?? 0.35,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`suggest ${res.status}: ${text}`);
  }
  return res.json();
}

export async function pricingApply(input: {
  produk_id: string;
  recommended_price: number;
  inputs_hash?: string;
}): Promise<{ ok: boolean; message?: string; data?: any }> {
  const uid = await ownerId();
  const res = await fetch(`${API}/pricing/apply`, {
    method: "POST",
    headers: {
      "x-owner-id": uid,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      produk_id: input.produk_id,
      recommended_price: input.recommended_price,
      inputs_hash: input.inputs_hash ?? "ai-apply-ui",
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`apply ${res.status}: ${text}`);
  }
  return res.json();
}
