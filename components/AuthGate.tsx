"use client";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function AuthGate() {
  const supabase = useMemo(() => createClientComponentClient(), []);
  const pathname = usePathname() || "/";
  const [checked, setChecked] = useState(false);

  const isPublic =
    pathname === "/login" || pathname === "/reset-password" || pathname.startsWith("/api");

  useEffect(() => {
    let unsub = () => {};
    let cancelled = false;

    async function ensureSessionOrRedirect() {
      if (isPublic) {
        setChecked(true);
        return;
      }

      // keep token fresh
      const { data: sub } = supabase.auth.onAuthStateChange(() => {});
      unsub = () => sub.subscription.unsubscribe();

      // 1st check
      let { data } = await supabase.auth.getSession();
      let session = data.session;

      // small retry (race-condition guard)
      if (!session) {
        await new Promise((r) => setTimeout(r, 250));
        ({ data } = await supabase.auth.getSession());
        session = data.session;
      }

      if (!session) {
        const search = typeof window !== "undefined" ? window.location.search : "";
        const next = pathname + (search || "");
        if (!cancelled && typeof window !== "undefined") {
          window.location.replace(`/login?next=${encodeURIComponent(next)}`);
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
