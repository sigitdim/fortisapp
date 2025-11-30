"use client";

import React, { useState } from "react";
import { getCurrentUserSafe } from "@/lib/authClient";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "https://api.fortislab.id";

export type PackageId =
  | "fortisapp-pro-3bulan"
  | "fortisapp-pro-6bulan"
  | "fortisapp-pro-12bulan";

const PACKAGE_CONFIG: Record<
  PackageId,
  { label: string; amount: number; desc: string; highlight?: boolean }
> = {
  "fortisapp-pro-3bulan": {
    label: "PRO 3 Bulan",
    amount: 149_000,
    desc: "Cocok untuk mulai mencoba FortisApp.",
  },
  "fortisapp-pro-6bulan": {
    label: "PRO 6 Bulan",
    amount: 249_000,
    desc: "Lebih hemat untuk penggunaan rutin.",
    highlight: true,
  },
  "fortisapp-pro-12bulan": {
    label: "PRO 12 Bulan",
    amount: 449_000,
    desc: "Paling hemat untuk 1 tahun penuh.",
  },
};

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

interface MidtransPayButtonProps {
  packageId: PackageId;
}

export function MidtransPayButton({ packageId }: MidtransPayButtonProps) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const pkg = PACKAGE_CONFIG[packageId];

  async function handlePay() {
    try {
      setLoading(true);
      setErrorMsg(null);

      // 1. Ambil user dari Supabase
      const user = await getCurrentUserSafe();

      // 2. Panggil backend /pay/create
      const res = await fetch(`${API_BASE}/pay/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
          name: user.name,
          amount: pkg.amount,
          package_id: packageId,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Gagal create payment: ${text}`);
      }

      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.message || "Payment gagal dibuat");
      }

      const snapUrl = data.snapUrl as string | undefined;
      const snapToken = data.snapToken as string | undefined;

      // 3a. Cara paling simple: redirect ke snapUrl
      if (snapUrl) {
        window.location.href = snapUrl;
        return;
      }

      // 3b. Alternatif: pakai popup Snap kalau script sudah dimuat
      if (snapToken && (window as any).snap?.pay) {
        (window as any).snap.pay(snapToken, {
          onSuccess: () => {
            window.location.reload();
          },
          onPending: () => {
            // optional: kasih info pending
          },
          onError: (err: any) => {
            console.error("Midtrans error", err);
            setErrorMsg("Terjadi kesalahan saat memproses pembayaran.");
          },
          onClose: () => {
            // optional: user nutup popup
          },
        });
        return;
      }

      throw new Error("snapUrl / snapToken tidak tersedia di response.");
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Gagal memulai pembayaran.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className={`flex flex-col rounded-2xl border bg-white/80 p-4 shadow-sm backdrop-blur-sm ${
        pkg.highlight ? "border-red-500 ring-1 ring-red-100" : ""
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-neutral-900">
            {pkg.label}
          </h3>
          <p className="mt-1 text-xs text-neutral-500">{pkg.desc}</p>
        </div>
        <p className="text-sm font-semibold text-red-600">
          {formatRupiah(pkg.amount)}
        </p>
      </div>

      <button
        onClick={handlePay}
        disabled={loading}
        className="mt-4 inline-flex items-center justify-center rounded-xl bg-red-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Memproses..." : "Bayar Sekarang"}
      </button>

      {errorMsg && (
        <p className="mt-2 text-[11px] text-red-600">
          {errorMsg}
        </p>
      )}
    </div>
  );
}
