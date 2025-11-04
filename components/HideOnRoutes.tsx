"use client";
import { ReactNode } from "react";
import { usePathname } from "next/navigation";

/** Sembunyikan children di rute yang dilarang (deny).
 *  Mendukung exact (/login), prefix (/auth/*), dan nested (/login/whatever).
 */
export default function HideOnRoutes({
  deny,
  children,
}: {
  deny: string[];
  children: ReactNode;
}) {
  const raw = usePathname() ?? "";
  const pathname = raw.split("?")[0]; // buang query
  const hidden = deny.some((p) => {
    // wildcard: '/auth/*'
    if (p.endsWith("/*")) {
      const base = p.slice(0, -2);
      return pathname === base || pathname.startsWith(base + "/");
    }
    // exact atau prefix folder: '/login' atau '/login/...'
    return pathname === p || pathname.startsWith(p + "/");
  });
  if (hidden) return null;
  return <>{children}</>;
}
