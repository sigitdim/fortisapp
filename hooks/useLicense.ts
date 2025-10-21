// hooks/useLicense.ts
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export type LicenseState = {
  loading: boolean;
  plan: "pro" | "free" | null;
  isActive: boolean;
  expiresAt?: string | null;
  error?: string | null;
};

export function useLicense() {
  const [state, setState] = useState<LicenseState>({
    loading: true,
    plan: null,
    isActive: false,
    expiresAt: null,
    error: null,
  });

  const verify = useCallback(async () => {
    try {
      setState((s) => ({ ...s, loading: true, error: null }));
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      const user = userData?.user;
      if (!user?.id) throw new Error("User not found. Please login again.");

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/license/verify`,
        {
          headers: { "x-owner-id": user.id },
          cache: "no-store",
        }
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Verify failed (${res.status}): ${text}`);
      }

      const json = await res.json();
      const isActive = !!json?.isActive;
      const expiresAt = json?.expiresAt || null;

      setState({
        loading: false,
        plan: isActive ? "pro" : "free",
        isActive,
        expiresAt,
        error: null,
      });
    } catch (e: any) {
      setState({
        loading: false,
        plan: "free",
        isActive: false,
        expiresAt: null,
        error: e?.message || "Unknown error",
      });
    }
  }, []);

  useEffect(() => {
    verify();

    // Auto re-verify saat tab balik fokus (habis checkout Mayar)
    const onVis = () => {
      if (document.visibilityState === "visible") verify();
    };
    document.addEventListener("visibilitychange", onVis);

    // Re-verify saat status auth berubah
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      verify();
    });

    return () => {
      document.removeEventListener("visibilitychange", onVis);
      sub?.subscription?.unsubscribe?.();
    };
  }, [verify]);

  const value = useMemo(() => ({ ...state, verify }), [state, verify]);
  return value;
}
