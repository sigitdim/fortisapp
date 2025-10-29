/**
 * lib/products.ts — helper Produk (FE) dengan fallback ke Supabase
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

async function getOwnerId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  const uid = data?.user?.id;
  if (!uid) throw new Error("User not logged in");
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

/** coba beberapa path/list endpoint; kalau semua gagal → throw */
async function tryGet(paths: string[]): Promise<any> {
  const errors: any[] = [];
  for (const p of paths) {
    try {
      return await apiGet(p);
    } catch (e) {
      errors.push(e);
      // lanjut ke path berikutnya
    }
  }
  // gabung pesan error biar jelas
  const msg = errors.map((e: any) => String(e?.message || e)).join(" | ");
  throw new Error(msg);
}

/** List produk: API → fallback Supabase */
export async function listProduk(): Promise<{ ok: boolean; data: Produk[] }> {
  try {
    const json = await tryGet([
      "/setup/produk",        // prefer
      "/setup/produk/list",   // alt
      "/produk/list",         // legacy
      "/produk",              // legacy
    ]);

    const arr = json?.data || json || [];
    if (!Array.isArray(arr)) throw new Error("Format list produk tidak valid");

    const rows: Produk[] = arr.map((r: any) => ({
      id: r.id || r.produk_id || r.uuid || "",
      nama: r.nama || r.nama_produk || r.name || "",
      kategori: r.kategori ?? r.category ?? null,
      harga_jual_user: r.harga_jual_user ?? r.harga ?? r.price ?? null,
    }));

    return { ok: true, data: rows };
  } catch (apiErr) {
    console.warn("[products] API gagal, fallback ke Supabase:", apiErr);

    // Fallback langsung ke tabel Supabase (RLS owner-based)
    const { data, error } = await supabase
      .from("produk")
      .select("id, nama, kategori, harga_jual_user")
      .order("created_at", { ascending: false });

    if (error) throw new Error(`Supabase produk: ${error.message}`);

    const rows: Produk[] = (data || []).map((r: any) => ({
      id: r.id,
      nama: r.nama,
      kategori: r.kategori ?? null,
      harga_jual_user: r.harga_jual_user ?? null,
    }));

    return { ok: true, data: rows };
  }
}

/** Upsert produk via BE (tetap pakai API) */
export async function upsertProduk(
  body: ProdukUpsertBody
): Promise<{ ok: boolean; data?: Produk }> {
  const json = await apiPost("/setup/produk", body);
  const row = json?.data || {};
  const data: Produk = {
    id: row.id || body.id || "",
    nama: row.nama || body.nama,
    kategori: row.kategori ?? (body.kategori ?? null),
    harga_jual_user:
      row.harga_jual_user ??
      (typeof body.harga_jual_user === "number" ? body.harga_jual_user : null),
  };
  return { ok: Boolean(json?.ok ?? true), data };
}

/** Untuk dropdown */
export async function getProdukOptions(): Promise<{ value: string; label: string }[]> {
  const { data } = await listProduk();
  return data.map((p) => ({ value: p.id, label: p.nama }));
}
