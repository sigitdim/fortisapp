"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { key: "bahan", label: "Bahan", href: "/setup" },
  { key: "overhead", label: "Overhead", href: "/setup/overhead" },
  { key: "tenaga", label: "Tenaga Kerja", href: "/setup/tenaga-kerja" },
  { key: "aset", label: "Aset", href: "/setup/aset" },
];

export function SetupTabs() {
  const pathname = usePathname();

  return (
    <div className="flex gap-3">
      {TABS.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.key}
            href={t.href}
            className={[
              "rounded-full px-6 py-2 text-sm font-semibold transition",
              active
                ? "bg-red-600 text-white shadow"
                : "bg-white text-gray-800 border border-gray-200 hover:bg-gray-100",
            ].join(" ")}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
