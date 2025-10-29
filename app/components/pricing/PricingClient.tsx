'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { fetchProdukList } from '@/lib/api';

/**
 * Wrapper untuk halaman Pricing.
 * - Jika query ?produk_id= kosong, ambil 1 produk pertama lalu redirect menambah ?produk_id=...
 * - Kalau sudah ada, langsung render children.
 */
export default function PricingClient({ children }: { children?: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const qProdukId = sp?.get('produk_id') || '';
  const [ready, setReady] = useState<boolean>(!!qProdukId);

  useEffect(() => {
    let alive = true;

    async function ensureProdukId() {
      if (qProdukId) {
        if (alive) setReady(true);
        return;
      }
      try {
        const list = await fetchProdukList();
        const first = list?.[0];
        if (first?.id) {
          // replace ke URL sekarang + query produk_id
          router.replace(`${pathname}?produk_id=${encodeURIComponent(first.id)}`);
          if (alive) setReady(true);
        } else {
          // tidak ada produk; biarkan ready supaya tetap render children yang mungkin menampilkan empty state
          if (alive) setReady(true);
        }
      } catch {
        if (alive) setReady(true);
      }
    }

    ensureProdukId();
    return () => {
      alive = false;
    };
  }, [qProdukId, pathname, router]);

  // Bisa tampilkan splash kecil saat menunggu redirect
  if (!ready) {
    return <div className="p-4 text-sm text-gray-500">Menyiapkan halaman pricing…</div>;
  }

  return <>{children}</>;
}
