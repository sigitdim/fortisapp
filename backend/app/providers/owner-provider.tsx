"use client";

import { ReactNode, useEffect, useState, createContext, useContext } from "react";
import { supabase } from "@/lib/supabaseClient";

type Ctx = { ownerId: string | null };
const OwnerCtx = createContext<Ctx>({ ownerId: null });

export function OwnerProvider({ children }: { children: ReactNode }) {
  const [ownerId, setOwnerId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setOwnerId(data.user?.id ?? null); // UUID user jadi owner_id
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setOwnerId(s?.user?.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return <OwnerCtx.Provider value={{ ownerId }}>{children}</OwnerCtx.Provider>;
}

export function useOwner() {
  return useContext(OwnerCtx);
}
