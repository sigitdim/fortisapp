"use client";

import React, { createContext, useEffect, useState, useContext } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

type OwnerCtx = { ownerId: string|null; email: string|null; loading: boolean };
const Ctx = createContext<OwnerCtx>({ ownerId: null, email: null, loading: true });

export function OwnerProvider({ children }: { children: React.ReactNode }) {
  const [ownerId, setOwnerId] = useState<string|null>(null);
  const [email, setEmail] = useState<string|null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsub: (() => void) | undefined;

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        setOwnerId(data.session?.user?.id ?? null);
        setEmail(data.session?.user?.email ?? null);
      } finally {
        setLoading(false);
      }

      const { data: sub } = supabase.auth.onAuthStateChange(
        (_event: AuthChangeEvent, session: Session | null) => {
          setOwnerId(session?.user?.id ?? null);
          setEmail(session?.user?.email ?? null);
        }
      );
      unsub = () => sub.subscription.unsubscribe();
    })();

    return () => { try { unsub?.(); } catch {} };
  }, []);

  return <Ctx.Provider value={{ ownerId, email, loading }}>{children}</Ctx.Provider>;
}

export const useOwner = () => useContext(Ctx);
export default OwnerProvider;
