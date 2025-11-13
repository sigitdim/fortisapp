"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function AuthGate() {
  const supabase = useMemo(() => createClientComponentClient(), []);
  const pathname = usePathname() || "/";
  const [checked, setChecked] = useState(false);

  // ✅ Tambah daftar route publik yang boleh tanpa login
  const PUBLIC_PATHS = [
    "/login",
    "/register",
    "/auth",
    "/reset-password",
    "/reset-password/update",
    "/reset-password/confirm",
    "/_next",
    "/api",
    "/"
  ];

  // Jika path cocok dengan salah satu PUBLIC_PATHS
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  useEffect(() => {
    let unsub = () => {};
    let cancelled = false;

    async function ensureSessionOrRedirect() {
      if (isPublic) {
        setChecked(true);
        return;
      }

      // keep token fresh
      const { data: sub } = supabase.auth.onAuthStateChange(() => {
        ensureSessionOrRedirect();
      });
      unsub = () => sub.subscription.unsubscribe();

      // cek session pertama
      let { data } = await supabase.auth.getSession();
      let session = data.session;

      // retry kecil (guard race condition)
      if (!session) {
        await new Promise((r) => setTimeout(r, 250));
        ({ data } = await supabase.auth.getSession());
        session = data.session;
      }

      if (!session) {
        const search =
          typeof window !== "undefined" ? window.location.search : "";
        const next = pathname + (search || "");
        if (!cancelled && typeof window !== "undefined") {
          window.location.replace(
            `/login?next=${encodeURIComponent(next)}`
          );
        }
        return;
      }

      if (!cancelled) setChecked(true);
    }

    ensureSessionOrRedirect();

    return () => {
      cancelled = true;
      unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (!checked) return null;
  return null;
}
