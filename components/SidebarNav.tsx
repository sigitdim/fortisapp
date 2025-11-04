"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Calculator,
  BookOpen,
  Percent,
  PackagePlus,
  Gift,
  BadgePercent,
  Boxes,
  Settings,
  GraduationCap,
} from "lucide-react";

type NavItemProps = {
  href: string;
  icon: any;
  label: string;
  active?: boolean;
  small?: boolean;
};

/* ========== Komponen NavItem ========== */
function NavItem({ href, icon: Icon, label, active, small }: NavItemProps) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-full transition-all duration-150 ${
        small ? "px-3 py-1.5 text-[14px]" : "px-4 py-2 text-[15px]"
      } ${
        active
          ? "bg-[#FFD74A] font-semibold text-black shadow-md"
          : "text-zinc-800 hover:bg-zinc-100"
      }`}
    >
      <Icon
        className={`${small ? "w-4 h-4" : "w-5 h-5"} ${
          active ? "text-black" : "text-zinc-600"
        }`}
      />
      <span>{label}</span>
    </Link>
  );
}

/* ========== Komponen Sidebar ========== */
export default function SidebarNav() {
  const pathname = usePathname() ?? "";
  const isActive = (p: string) => pathname === p || pathname.startsWith(p + "/");

  return (
    <aside className="w-[260px] shrink-0 bg-white flex flex-col border-r border-zinc-200">
      {/* ===== BRAND ===== */}
      <div className="px-6 pt-6 pb-4 text-2xl font-extrabold tracking-tight select-none">
        <span className="text-neutral-900">Fortis</span>
        <span className="text-red-600">App</span>
      </div>

      {/* ===== MAIN NAV ===== */}
      <nav className="flex-1 px-3 space-y-2 text-[15px]">
        <NavItem
          href="/dashboard"
          icon={LayoutGrid}
          label="Dashboard"
          active={isActive("/dashboard")}
        />
        <NavItem
          href="/hpp"
          icon={Calculator}
          label="Kalkulator HPP"
          active={isActive("/hpp")}
        />
        <NavItem
          href="/menu"
          icon={BookOpen}
          label="Daftar Menu"
          active={isActive("/menu")}
        />

        {/* PROMO */}
        <div className="px-3 pt-2 text-[15px] font-semibold text-zinc-800">
          Kalkulator Promo
        </div>
        <div className="mt-1 pl-6 flex flex-col space-y-1 text-[14px]">
          <NavItem
            href="/promo/diskon"
            icon={Percent}
            label="Kalkulator Diskon"
            active={isActive("/promo/diskon")}
            small
          />
          <NavItem
            href="/promo/bundling"
            icon={PackagePlus}
            label="Kalkulator Bundling"
            active={isActive("/promo/bundling")}
            small
          />
          <NavItem
            href="/promo/b1g1"
            icon={Gift}
            label="Kalkulator Buy 1 Get 1"
            active={isActive("/promo/b1g1")}
            small
          />
          <NavItem
            href="/promo/tebus"
            icon={BadgePercent}
            label="Kalkulator Tebus Murah"
            active={isActive("/promo/tebus")}
            small
          />
        </div>

        {/* INVENTORY */}
        <NavItem
          href="/inventory"
          icon={Boxes}
          label="Inventory"
          active={isActive("/inventory")}
        />

        {/* SETUP */}
        <NavItem
          href="/setup"
          icon={Settings}
          label="Setup"
          active={isActive("/setup")}
        />

        {/* TUTORIAL */}
        <NavItem
          href="/tutorial"
          icon={GraduationCap}
          label="Tutorial"
          active={isActive("/tutorial")}
        />
      </nav>

      {/* ===== BADGE USER ===== */}
      <div className="p-4">
        <div className="rounded-2xl bg-red-700 text-white px-4 py-3 shadow-inner">
          <div className="text-sm font-medium">Yudha | Pro</div>
          <div className="text-[12px] opacity-90">Active until 27-03-26</div>
        </div>
      </div>
    </aside>
  );
}
