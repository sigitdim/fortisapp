"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useLicense } from "@/hooks/useLicense";

const PUBLIC_ROUTES = [
  "/login",
  "/register",
  "/reset-password",
  "/auth",
  "/billing",
];

function isPublicRoute(pathname: string | null) {
  if (!pathname) return false;
  return PUBLIC_ROUTES.some((base) => pathname.startsWith(base));
}

export default function LicenseGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { loading, isActive } = useLicense();

  const isPublic = isPublicRoute(pathname);

  useEffect(() => {
    if (!loading && !isPublic && !isActive) {
      router.replace("/billing?expired=1");
    }
  }, [loading, isPublic, isActive, router]);

  // Halaman publik → tidak perlu cek license
  if (isPublic) return <>{children}</>;

  // Masih cek status license
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="rounded-3xl bg-white px-6 py-4 text-sm text-gray-500 shadow">
          Mengecek status membership…
        </div>
      </div>
    );
  }

  // Non-public & tidak aktif → sudah di-redirect di useEffect, render kosong
  if (!isActive) return null;

  return <>{children}</>;
}
