"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export type PlanStatus = "pro" | "free" | "pending" | string | null;

export type LicenseState = {
  loading: boolean;
  isActive: boolean;
  planStatus: PlanStatus;
  expiresAt: string | null;
  profile: any | null;
  error: string | null;
};

const DEFAULT_STATE: LicenseState = {
  loading: true,
  isActive: false,
  planStatus: "free",
  expiresAt: null,
  profile: null,
  error: null,
};

/**
 * Cache in-memory + localStorage
 */
let memoryCache: LicenseState | null = null;

export function useLicense(): LicenseState {
  const [state, setState] = useState<LicenseState>(() => {
    // 1. kalau ada cache di memory, pakai itu
    if (memoryCache) {
      return { ...memoryCache, loading: false };
    }

    // 2. kalau ada cache di localStorage, pakai
    if (typeof window !== "undefined") {
      try {
        const saved = window.localStorage.getItem("fortis_license_cache");
        if (saved) {
          const parsed = JSON.parse(saved) as LicenseState;
          memoryCache = parsed;
          return { ...parsed, loading: false };
        }
      } catch {
        // abaikan error parse
      }
    }

    // 3. default → belum tahu apa-apa
    return DEFAULT_STATE;
  });

  useEffect(() => {
    let cancelled = false;
    const supabase = createClientComponentClient();

    async function load() {
      // kalau belum ada cache sama sekali, baru set loading true
      if (!memoryCache) {
        setState((prev) => ({ ...prev, loading: true }));
      }

      // === 1. Ambil user Supabase ===
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        const next: LicenseState = {
          loading: false,
          isActive: false,
          planStatus: "free",
          expiresAt: null,
          profile: null,
          error: "NO_USER",
        };
        memoryCache = next;
        if (typeof window !== "undefined") {
          localStorage.setItem("fortis_license_cache", JSON.stringify(next));
        }
        if (!cancelled) setState(next);
        return;
      }

      // === 2. Ambil row profiles berdasarkan user_id ===
      const { data, error } = await supabase
        .from("profiles")
        .select("plan_status,is_pro,pro_until,user_id,customer_email")
        .eq("user_id", user.id)
        .single();

      if (error || !data) {
        const next: LicenseState = {
          loading: false,
          isActive: false,
          planStatus: "free",
          expiresAt: null,
          profile: null,
          error: error?.message || "PROFILES_ERROR",
        };
        memoryCache = next;
        if (typeof window !== "undefined") {
          localStorage.setItem("fortis_license_cache", JSON.stringify(next));
        }
        if (!cancelled) setState(next);
        return;
      }

      // === 3. Hitung status PRO ===
      const planStatus = (data.plan_status ?? "free") as PlanStatus;
      const expiresAt = (data.pro_until as string | null) ?? null;

      const isActive =
        planStatus === "pro" ||
        data.is_pro === true ||
        (expiresAt !== null && new Date(expiresAt) > new Date());

      const next: LicenseState = {
        loading: false,
        isActive,
        planStatus,
        expiresAt,
        profile: data,
        error: null,
      };

      // simpan ke cache
      memoryCache = next;
      if (typeof window !== "undefined") {
        localStorage.setItem("fortis_license_cache", JSON.stringify(next));
      }
      if (!cancelled) setState(next);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

// BIAR KEDUA CARA IMPORT JALAN:
// import { useLicense } from "@/hooks/useLicense";
// import useLicense from "@/hooks/useLicense";
export default useLicense;
