"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

/**
 * Ambil owner_id dari Supabase Auth.
 * Throw error kalau user belum login / owner_id ga ada.
 */
export async function getOwnerIdFromSupabase(): Promise<string> {
  const supabase = createClientComponentClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error("[ownerFetch] supabase.getUser error:", error.message);
    throw new Error("Gagal ambil user dari Supabase");
  }
  if (!user) {
    console.error("[ownerFetch] user tidak ada (belum login?)");
    throw new Error("User belum login");
  }

  const ownerId =
    (user as any).user_metadata?.owner_id ||
    (user as any).raw_user_meta_data?.owner_id;

  if (!ownerId) {
    console.error("[ownerFetch] owner_id tidak ditemukan di user_metadata:", {
      user_metadata: (user as any).user_metadata,
      raw_user_meta_data: (user as any).raw_user_meta_data,
    });
    throw new Error("owner_id tidak ditemukan di Supabase user_metadata");
  }

  return ownerId;
}

/**
 * Wrapper fetch yang OTOMATIS nambahin header "x-owner-id"
 * ke setiap request ke Backend Fortis.
 *
 * Contoh:
 *   await ownerFetch(`${API_BASE}/setup/bahan`);
 *   await ownerFetch(`${API_BASE}/promo`, { method: "POST", body: ... });
 */
export async function ownerFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  const ownerId = await getOwnerIdFromSupabase();

  const headers = new Headers(init.headers || {});
  headers.set("x-owner-id", ownerId);

  const finalInit: RequestInit = {
    ...init,
    headers,
  };

  return fetch(input, finalInit);
}
