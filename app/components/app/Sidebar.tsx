'use client';
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Cog, FlaskConical, Percent, BarChart2, Settings } from "lucide-react";

const items = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/setup", label: "Setup", icon: Cog },
  { href: "/hpp", label: "HPP", icon: FlaskConical },
  { href: "/promo", label: "Promo", icon: Percent },
  { href: "/pricing", label: "Pricing", icon: BarChart2 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <div className="flex h-screen flex-col p-3 gap-3">
      <div className="px-3 py-2">
        <div className="text-xl font-bold">FortisApp</div>
        <div className="text-xs text-neutral-500">internal • dev</div>
      </div>

      <nav className="flex-1 space-y-1">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-2xl px-3 py-2 text-sm transition ${
                active ? "bg-neutral-900 text-white shadow" : "hover:bg-neutral-100 text-neutral-700"
              }`}
            >
              <Icon size={18} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-2xl border p-3 text-xs text-neutral-600 bg-neutral-50">
        <div>Owner</div>
        <div className="font-medium truncate">user@fortislab.id</div>
      </div>
    </div>
  );
}
