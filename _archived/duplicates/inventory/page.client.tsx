'use client';

import React, { useMemo, useState } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

type Tab = 'summary' | 'history' | 'adjust' | string;

export default function InventoryPageClient() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // BACA QUERY DENGAN AMAN (sp bisa null)
  const qTab = (sp?.get('tab') as Tab) ?? 'summary';
  const bahanId = sp?.get('bahan_id') ?? undefined;

  const [tab, setTab] = useState<Tab>(qTab);

  // Helper aman untuk update querystring
  const setQuery = (next: { tab?: Tab; bahan_id?: string | null }) => {
    const params = new URLSearchParams(sp?.toString() ?? '');
    if (next.tab !== undefined) params.set('tab', String(next.tab));
    if (next.bahan_id === null) params.delete('bahan_id');
    else if (next.bahan_id !== undefined) params.set('bahan_id', next.bahan_id);
    router.replace(`${pathname}?${params.toString()}`);
  };

  // Sinkronkan tab state dengan URL
  React.useEffect(() => {
    if (tab !== qTab) setTab(qTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qTab]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <button
          className={`px-3 py-1.5 rounded-lg border ${tab === 'summary' ? 'bg-gray-100' : ''}`}
          onClick={() => setQuery({ tab: 'summary' })}
        >
          Summary
        </button>
        <button
          className={`px-3 py-1.5 rounded-lg border ${tab === 'history' ? 'bg-gray-100' : ''}`}
          onClick={() => setQuery({ tab: 'history' })}
        >
          History
        </button>
        <button
          className={`px-3 py-1.5 rounded-lg border ${tab === 'adjust' ? 'bg-gray-100' : ''}`}
          onClick={() => setQuery({ tab: 'adjust' })}
        >
          Adjust
        </button>
      </div>

      <div className="text-sm text-gray-500">
        Tab: <b>{tab}</b> {bahanId ? <>• Bahan: <code>{bahanId}</code></> : null}
      </div>

      {/* TODO: render konten sesuai tab */}
      <div className="rounded-xl border p-4">Konten {tab} akan tampil di sini.</div>
    </div>
  );
}
