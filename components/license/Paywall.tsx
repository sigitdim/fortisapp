// components/license/Paywall.tsx
"use client";

import * as React from "react";
import { useLicense } from "@/hooks/useLicense";

const CHECKOUT_URL =
  process.env.NEXT_PUBLIC_CHECKOUT_URL ||
  "https://fortislab.mayar.link/fortisapp-membership";

export default function Paywall() {
  const { loading, isActive, expiresAt, error, verify } = useLicense();
  const [opening, setOpening] = React.useState(false);

  const onActivate = () => {
    if (opening) return;
    setOpening(true);
    if (typeof window !== "undefined") {
      window.open(CHECKOUT_URL, "_blank");
    }
    setTimeout(() => setOpening(false), 1500);
  };

  // hitung sisa hari
  const badge = React.useMemo(() => {
    if (!expiresAt) return null;
    const d = new Date(expiresAt);
    const days = Math.max(0, Math.ceil((d.getTime() - Date.now()) / 86400000));
    return (
      <div className="text-xs opacity-70">
        Berlaku hingga: {d.toLocaleString()} • sisa {days} hari
      </div>
    );
  }, [expiresAt]);

  return (
    <div className="mx-auto max-w-2xl rounded-2xl border p-6 shadow-sm">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold">FortisApp Pro</h1>
        <p className="text-sm opacity-80">
          Akses fitur lengkap: AI Suggestion, Smart Pricing, dan lainnya.
        </p>
      </div>

      <div className="mb-4 grid gap-1">
        <div className="text-sm">Status lisensi:</div>
        <div className="text-lg font-medium">
          {loading ? "Mengecek..." : isActive ? "AKTIF (Pro)" : "TIDAK AKTIF (Free)"}
        </div>
        {badge}
        {error && <div className="text-xs text-red-600">{error}</div>}
      </div>

      <div className="flex flex-wrap gap-2">
        {!isActive && (
          <button
            onClick={onActivate}
            className="rounded-2xl px-4 py-2 text-white bg-black disabled:opacity-50"
            disabled={loading || opening}
          >
            {opening ? "Membuka..." : "Aktifkan Pro"}
          </button>
        )}
        <button
          onClick={verify}
          className="rounded-2xl px-4 py-2 border"
          disabled={loading}
        >
          {loading ? "Memuat..." : "Saya sudah bayar — Refresh status"}
        </button>
      </div>
    </div>
  );
}
