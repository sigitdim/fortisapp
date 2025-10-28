// app/billing/page.tsx
"use client";

import Paywall from "@/components/license/Paywall";

export default function BillingPage() {
  return (
    <main className="mx-auto max-w-4xl p-4 md:p-8">
      <Paywall />
      <div className="mt-8 rounded-xl border p-4">
        <h2 className="text-lg font-semibold mb-2">Cara kerja</h2>
        <ol className="list-decimal pl-5 space-y-1 text-sm opacity-80">
          <li>Klik <strong>Aktifkan Pro</strong> → diarahkan ke Mayar checkout.</li>
          <li>Setelah bayar, backend otomatis menerima webhook dari Mayar.</li>
          <li>Tekan <strong>Refresh status</strong> untuk update status lisensi.</li>
        </ol>
      </div>
    </main>
  );
}
