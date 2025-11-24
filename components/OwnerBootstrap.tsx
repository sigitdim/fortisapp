'use client';

import { useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Helper: cari owner_id di berbagai kemungkinan struktur user
function findOwnerIdInUser(user: any): string | undefined {
  if (!user || typeof user !== 'object') return;

  // 1. Jalur paling umum
  if (user.user_metadata?.owner_id) return user.user_metadata.owner_id;
  if (user.user_metadata?.ownerId) return user.user_metadata.ownerId;

  // 2. Seringnya Supabase naro di raw_user_meta_data
  if ((user as any).raw_user_meta_data?.owner_id)
    return (user as any).raw_user_meta_data.owner_id;
  if ((user as any).raw_user_meta_data?.ownerId)
    return (user as any).raw_user_meta_data.ownerId;

  // 3. Jaga-jaga kalau BE naro di app_metadata
  if (user.app_metadata?.owner_id) return user.app_metadata.owner_id;
  if (user.app_metadata?.ownerId) return user.app_metadata.ownerId;
  if ((user as any).raw_app_meta_data?.owner_id)
    return (user as any).raw_app_meta_data.owner_id;

  // 4. Last resort: deep scan semua child object
  for (const val of Object.values(user)) {
    if (val && typeof val === 'object') {
      const found = findOwnerIdInUser(val);
      if (found) return found;
    }
  }

  return;
}

export default function OwnerBootstrap() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const supabase = createClientComponentClient();
    let patched = (window as any).__owner_fetch_patched ?? false;
    let unsub: (() => void) | undefined;

    const patchFetchWithOwner = (ownerId: string) => {
      if (!ownerId) {
        console.error('[OwnerBootstrap] ownerId kosong, tidak mempatch fetch.');
        return;
      }
      if (patched) {
        console.log('[OwnerBootstrap] fetch sudah pernah dipatch, skip.');
        return;
      }

      patched = true;
      (window as any).__owner_fetch_patched = true;

      try {
        window.localStorage.setItem('owner_id', ownerId);
      } catch (err) {
        console.error('[OwnerBootstrap] gagal set localStorage.owner_id:', err);
      }

      const originalFetch = window.fetch.bind(window);

      window.fetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
        const headers = new Headers(init.headers || {});
        headers.set('x-owner-id', ownerId);

        const newInit: RequestInit = {
          ...init,
          headers,
        };

        // Log debug biar kelihatan jelas
        try {
          const url =
            typeof input === 'string'
              ? input
              : input instanceof URL
              ? input.toString()
              : (input as any)?.url || String(input);

          console.log('[PATCH FETCH]', url, {
            ...newInit,
            headers: Object.fromEntries(headers.entries()),
          });
        } catch (logErr) {
          console.log('[PATCH FETCH] (log failed)', input, logErr);
        }

        return originalFetch(input, newInit);
      };

      console.log('[OwnerBootstrap] fetch patched with owner_id =', ownerId);
    };

    const init = async () => {
      // 1) Coba ambil session awal
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError) {
        console.error(
          '[OwnerBootstrap] supabase.getSession error:',
          sessionError.message,
        );
      }

      const session = sessionData?.session;
      const user = session?.user;

      console.log('[OwnerBootstrap] session user =', user);

      const ownerIdFromSession = findOwnerIdInUser(user);

      if (ownerIdFromSession) {
        console.log(
          '[OwnerBootstrap] owner_id dari session awal =',
          ownerIdFromSession,
        );
        patchFetchWithOwner(ownerIdFromSession);
      } else {
        console.warn(
          '[OwnerBootstrap] owner_id belum ketemu di session awal, menunggu auth state...',
        );
      }

      // 2) Pasang listener auth — kalau ada SIGNED_IN / TOKEN_REFRESH, cek lagi
      const { data: listener } = supabase.auth.onAuthStateChange(
        (event, newSession) => {
          const u = newSession?.user;
          const newOwner = findOwnerIdInUser(u);

          console.log(
            '[OwnerBootstrap] onAuthStateChange:',
            event,
            'owner_id =',
            newOwner,
          );

          if (newOwner) {
            patchFetchWithOwner(newOwner);
          }
        },
      );

      unsub = () => {
        try {
          listener?.subscription?.unsubscribe();
        } catch {
          // ignore
        }
      };
    };

    void init();

    return () => {
      if (unsub) unsub();
    };
  }, []);

  return null;
}
