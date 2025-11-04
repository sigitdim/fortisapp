"use client";

import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

let _client: SupabaseClient | null = null;

function makeErrorClient(msg: string): any {
  // Proxy agar setiap pemanggilan method melempar error yang jelas,
  // tapi tidak memutus build/compile.
  return new Proxy(
    {},
    {
      get() {
        throw new Error(msg);
      },
    }
  );
}

export function ensureSupabase():
  | { ok: true; client: SupabaseClient }
  | { ok: false; error: string } {
  if (_client) return { ok: true, client: _client };
  if (!supabaseUrl || !supabaseAnonKey) {
    const err =
      "[supabase] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.";
    console.error(err);
    return { ok: false, error: err };
  }
  try {
    _client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
    return { ok: true, client: _client };
  } catch (e: any) {
    const err = `[supabase] Failed to init client: ${e?.message || e}`;
    console.error(err);
    return { ok: false, error: err };
  }
}

/** Named export kompatibel untuk kode lama: `import { supabase } from "@/lib/supabaseClient"` */
export const supabase: SupabaseClient | any = (() => {
  const s = ensureSupabase();
  if (s.ok) return s.client;
  // env belum lengkap → kembalikan proxy yang akan melempar error saat dipakai
  return makeErrorClient(s.error);
})();

/** Helper aman dipakai di mana-mana untuk ambil owner id */
export async function getOwnerId(): Promise<string | null> {
  const s = ensureSupabase();
  if (!s.ok) return null;
  try {
    const { data } = await s.client.auth.getSession();
    return data.session?.user?.id || null;
  } catch {
    return null;
  }
}

/** Optional: default export untuk import default style */
export default supabase;
