// components/license/ProGuard.tsx
"use client";

import { ReactNode } from "react";
import { useLicense } from "@/hooks/useLicense";
import Paywall from "@/components/license/Paywall";

export function ProGuard({ children }: { children: ReactNode }) {
  const { loading, isActive } = useLicense();

  if (loading) {
    return <div className="p-6 text-sm opacity-80">Mengecek lisensi Pro...</div>;
  }
  if (!isActive) {
    return <Paywall />;
  }
  return <>{children}</>;
}
