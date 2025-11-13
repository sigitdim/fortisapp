"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const base = "/setup";

const TABS = [
  { key: "bahan", label: "Bahan", href: `${base}/bahan` },
  { key: "overhead", label: "Overhead", href: `${base}/overhead` },
  { key: "tenaga-kerja", label: "Tenaga Kerja", href: `${base}/tenaga-kerja` },
  { key: "aset", label: "Aset", href: `${base}/aset` },
];

type SetupTabsProps = {
  /** optional: paksa tab aktif secara manual, kalau kosong pakai pathname */
  active?: "bahan" | "overhead" | "tenaga-kerja" | "aset";
};

export function SetupTabs({ active }: SetupTabsProps) {
  const pathname = usePathname();

  return (
    <div className="mt-4 mb-6 flex flex-wrap gap-2">
      {TABS.map((tab) => {
        const isActive = active
          ? active === tab.key
          : pathname === tab.href || pathname?.startsWith(tab.href);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={[
              "px-5 py-2 rounded-full border text-sm font-medium transition",
              isActive
                ? "bg-red-600 text-white border-red-600 shadow"
                : "bg-white text-gray-800 border-gray-300 hover:bg-gray-100",
            ].join(" ")}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
