'use client';

import React from 'react';
import Link from 'next/link';

export default function PublikPage() {
  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Halaman Publik</h1>
      <p className="text-gray-600">
        Ini adalah halaman publik sederhana. File ini memiliki <code>export default</code> sehingga
        dianggap sebagai <b>module</b> oleh TypeScript.
      </p>

      <div className="flex items-center gap-3">
        <Link href="/" className="px-3 py-1.5 rounded-lg border hover:bg-gray-50">
          Ke Dashboard
        </Link>
        <Link href="/analytics" className="px-3 py-1.5 rounded-lg bg-black text-white hover:opacity-90">
          Owner Analytics
        </Link>
      </div>
    </main>
  );
}
