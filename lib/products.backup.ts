/**
 * lib/products.ts — API helper untuk Produk (FE)
 * Kompatibel dengan:
 *  - components/setup/ProdukClient.tsx (listProduk, upsertProduk)
 *  - components/promo/PromoClient.tsx (butuh daftar produk untuk dropdown)
 */

import { supabase } from "@/lib/supabaseClient";

const API = process.env.NEXT_PUBLIC_API_URL || "https://api.fortislab.id";

export type Produk = {
  id: string;
  nama: string;
  kategori: string | null;
  harga_jual_user: number | null;
};

export type ProdukUpsertBody = {
  id?: string;
  nama: string;
  kategori?: string | null;
  harga_jual_user?: number | null;
};

/* ===================== Helpers ===================== */

async function getOwnerId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  const uid = data?.user?.id;
  if (!uid) throw new Error("User not found. Please login.");
  return uid;
}

async function apiGet<T = any>(path: string): Promise<T> {
  const owner = await getOwnerId();
  const res = await fetch(`${API}${path}`, {
    headers: { "x-owner-id": owner },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GET ${path} (${res.status}): ${text}`);
  }
  return res.json();
}

async function apiPost<T = any>(path: string, body: any): Promise<T> {
  const owner = await getOwnerId();
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: {
      "x-owner-id": owner,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST ${path} (${res.status}): ${text}`);
  }
  return res.json();
}

/**
 * Coba beberapa endpoint (untuk kompat kondisi BE lama/baru)
 * Stop di yang pertama sukses.
 */
async function tryGet(paths: string[]): Promise<any> {
  let lastErr: any;
  for (const p of paths) {
    try {
      return await apiGet(p);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

/* ===================== Public API dipakai FE ===================== */

/** List produk untuk tabel & dropdown */
export async function listProduk(): Promise<{ ok: boolean; data: Produk[] }> {
  const json = await tryGet([
    "/setup/produk",     // prefer terbaru
    "/produk/list",      // fallback
    "/produk",           // fallback lama
  ]);

  // Normalisasi bentuk data
  const rows: Produk[] = (json?.data || json || []).map((r: any) => ({
    id: r.id || r.produk_id || r.uuid || "",
    nama: r.nama || r.nama_produk || r.name || "",
    kategori: r.kategori ?? r.category ?? null,
    harga_jual_user:
      r.harga_jual_user ?? r.harga ?? r.price ?? null,
  }));

  return { ok: true, data: rows };
}

/** Insert/Update produk (upsert by id) */
export async function upsertProduk(
  body: ProdukUpsertBody
): Promise<{ ok: boolean; data?: Produk }> {
  // BE terbaru: POST /setup/produk
  const json = await apiPost("/setup/produk", body);

  const row: Produk = {
    id: json?.data?.id || body.id || "",
    nama: json?.data?.nama || body.nama,
    kategori: json?.data?.kategori ?? (body.kategori ?? null),
    harga_jual_user:
      json?.data?.harga_jual_user ??
      (typeof body.harga_jual_user === "number" ? body.harga_jual_user : null),
  };

  return { ok: !!json?.ok ?? true, data: row };
}

/** Alias untuk kebutuhan Promo dropdown (nama jelas) */
export async function getProdukOptions(): Promise<
  { value: string; label: string }[]
> {
  const { data } = await listProduk();
  return data.map((p) => ({ value: p.id, label: p.nama }));
}
