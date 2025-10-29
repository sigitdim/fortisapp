'use client';

import React from 'react';

type Row = {
  satuan?: string | null;
  low_stock?: boolean | null;
  low?: boolean | null; // alias kalau nama field beda
};

export default function InventorySnapshot({ r }: { r: Row }) {
  const isLow = Boolean(r.low_stock ?? r.low ?? false);

  return (
    <>
      <td className="px-3 py-2">{r.satuan ?? '-'}</td>
      <td className="px-3 py-2">
        {isLow ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-red-50 text-red-700 border border-red-200">
            LOW
          </span>
        ) : (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-green-50 text-green-700 border border-green-200">
            OK
          </span>
        )}
      </td>
    </>
  );
}
