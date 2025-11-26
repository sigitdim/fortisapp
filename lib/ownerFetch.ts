"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

// base URL backend (multi-tenant)
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "https://api.fortislab.id";

/**
 * Helper untuk memastikan URL selalu mengarah ke API:
 * - Kalau input sudah "http://"/"https://" → pakai apa adanya (kompatibel dengan logic lama)
 * - Kalau cuma path → otomatis diprefix dengan API_BASE
 */
function buildUrl(input: string): string {
  if (input.startsWith("http://") || input.startsWith("https://")) {
    // jalur lama: sudah full URL → jangan diapa-apakan
    return input;
  }

  const path = input.startsWith("/") ? input : `/${input}`;
  return `${API_BASE}${path}`;
}

export async function ownerFetch(url: string, options: any = {}) {
  const supabase = createClientComponentClient();

  const { data: session } = await supabase.auth.getSession();
  if (!session?.session) {
    console.error("[ownerFetch] Session Supabase tidak ditemukan");
    throw new Error("Sesi login tidak ditemukan.");
  }

  const user = session.session.user;

  const ownerId =
    user?.user_metadata?.owner_id ||
    (user as any)?.raw_user_meta_data?.owner_id ||
    "";

  const headers = {
    ...(options.headers || {}),
    "x-owner-id": ownerId,
    // kalau mau super aman bisa hanya set Content-Type kalau ada body,
    // tapi untuk sekarang biarkan sama seperti logic lama
    "Content-Type": "application/json",
  };

  const finalUrl = buildUrl(url);

  return fetch(finalUrl, { ...options, headers });
}
