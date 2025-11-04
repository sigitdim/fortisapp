'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function LogoutPage() {
  const router = useRouter();
  useEffect(() => {
    (async () => {
      try { await supabase.auth.signOut(); } catch {}
      document.cookie = 'owner_id=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/;';
      document.cookie = 'is_logged_in=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/;';
      router.replace('/login');
    })();
  }, [router]);
  return null;
}
