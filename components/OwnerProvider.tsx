"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

/* ========= Bentuk nilai context owner ========= */

type OwnerContextValue = {
  ownerId: string | null;
  loadingOwner: boolean;
  errorOwner: string | null;
};

const OwnerContext = createContext<OwnerContextValue | undefined>(undefined);

/* ========= Provider global untuk owner_id ========= */

export default function OwnerProvider({ children }: { children: ReactNode }) {
  const supabase = createClientComponentClient();

  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [loadingOwner, setLoadingOwner] = useState(true);
  const [errorOwner, setErrorOwner] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadOwner() {
      try {
        setLoadingOwner(true);
        setErrorOwner(null);

        // 1. Ambil session aktif
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("[OwnerProvider] getSession error:", error);
          if (!cancelled) {
            setErrorOwner("Gagal mengambil sesi login dari Supabase.");
          }
          return;
        }

        const session = data?.session;
        if (!session) {
          console.warn("[OwnerProvider] Tidak ada session Supabase aktif.");
          if (!cancelled) {
            setErrorOwner(
              "Sesi login tidak ditemukan. Silakan login ulang di halaman /login."
            );
          }
          return;
        }

        const user: any = session.user;

        // 2. Ambil owner_id dari user_metadata (kontrak multi-user)
        const oid: string | undefined =
          user?.user_metadata?.owner_id ||
          user?.raw_user_meta_data?.owner_id;

        if (!oid) {
          console.error(
            "[OwnerProvider] owner_id tidak ada di metadata user:",
            {
              user_metadata: user?.user_metadata,
              raw_user_meta_data: user?.raw_user_meta_data,
            }
          );
          if (!cancelled) {
            setErrorOwner("owner_id tidak ditemukan di akun ini. Hubungi admin.");
          }
          return;
        }

        // 3. Failsafe: sinkronisasi customer_email ke tabel profiles
        //    (buat sistem membership Mayar → FortisApp)
        try {
          const email: string | null = user?.email ?? null;

          if (email) {
            const { error: profileErr } = await supabase
              .from("profiles")
              .update({ customer_email: email })
              .eq("user_id", user.id);

            if (profileErr) {
              console.error(
                "[OwnerProvider] error update profiles.customer_email:",
                profileErr
              );
            }
          } else {
            console.warn(
              "[OwnerProvider] user.email kosong, skip sync profiles.customer_email"
            );
          }
        } catch (syncErr) {
          console.error("[OwnerProvider] exception sync profiles:", syncErr);
        }

        // 4. Set ownerId ke context
        if (!cancelled) {
          setOwnerId(oid);
        }
      } catch (err: any) {
        console.error("[OwnerProvider] error load owner_id:", err);
        if (!cancelled) {
          setErrorOwner(
            err?.message ||
              "Terjadi kesalahan saat mengambil owner_id dari Supabase."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingOwner(false);
        }
      }
    }

    loadOwner();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const value: OwnerContextValue = {
    ownerId,
    loadingOwner,
    errorOwner,
  };

  return (
    <OwnerContext.Provider value={value}>{children}</OwnerContext.Provider>
  );
}

/* ========= Hook untuk pakai owner di mana saja ========= */

export function useOwner(): OwnerContextValue {
  const ctx = useContext(OwnerContext);
  if (!ctx) {
    throw new Error("useOwner must be used within an OwnerProvider");
  }
  return ctx;
}
