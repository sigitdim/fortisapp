'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Menyelesaikan login…</div>}>
      <OAuthCallbackInner />
    </Suspense>
  );
}

function setCookie(name: string, value: string, days = 30) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  const secure = typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=${encodeURIComponent(value)}; Expires=${expires}; Path=/; SameSite=Lax${secure}`;
}

function OAuthCallbackInner() {
  const router = useRouter();
  const search = useSearchParams(); // aman karena dibungkus Suspense

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;
        const user = data.user;
        if (!user) throw new Error('User tidak ditemukan setelah OAuth.');

        const ownerId =
          (user.user_metadata && (user.user_metadata.owner_id || user.user_metadata.ownerId)) ||
          user.id ||
          '';
        if (!ownerId) throw new Error('owner_id tidak tersedia di metadata.');

        setCookie('owner_id', ownerId);
        setCookie('is_logged_in', '1');

        const next = search?.get('next') || '/dashboard';
        window.location.replace(next); // hard redirect supaya cookie terbaca middleware
      } catch (e) {
        console.error('OAuth callback error:', e);
        router.replace('/login');
      }
    })();
  }, [router, search]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      Menyelesaikan login…
    </div>
  );
}
