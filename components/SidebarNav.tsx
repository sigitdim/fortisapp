"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calculator,
  Boxes,
  PercentCircle,
  LineChart,
  Settings,
  FileText,
  User,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Kalkulator HPP", href: "/hpp", icon: Calculator },
  { label: "Promo", href: "/promo", icon: PercentCircle },
  { label: "Inventory", href: "/inventory", icon: Boxes },
  { label: "Laporan", href: "/report", icon: LineChart },
];

const STORAGE_KEY = "fortisapp-sidebar-collapsed";

export default function SidebarNav() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "true") setCollapsed(true);
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (mounted) localStorage.setItem(STORAGE_KEY, collapsed ? "true" : "false");
  }, [collapsed, mounted]);

  const safePath = pathname || "";

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col justify-between bg-white border-r border-gray-100 transition-all duration-300 shadow-sm",
        collapsed ? "w-[80px]" : "w-64"
      )}
    >
      {/* HEADER */}
      <div className="flex items-center justify-between px-4 h-16 border-b border-gray-100">
        {!collapsed && (
          <>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-black">Fortis</span>
              <span className="text-xl font-bold text-red-600">App</span>
            </div>
            <button
              onClick={() => setCollapsed(true)}
              className="flex items-center justify-center rounded-md p-2 text-gray-500 hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
          </>
        )}
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="flex items-center justify-center rounded-md p-2 text-black hover:bg-gray-100"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* NAV */}
      <nav
        className={cn(
          "flex-1 flex flex-col transition-all duration-300",
          collapsed ? "items-center gap-6 mt-2" : "px-3 gap-1 mt-4"
        )}
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active =
            safePath === item.href ||
            (item.href !== "/dashboard" && safePath.startsWith(item.href + "/"));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center rounded-xl text-sm font-medium transition-all duration-200",
                collapsed
                  ? "h-10 w-10 justify-center"
                  : "px-3 py-2 gap-3",
                active
                  ? "bg-yellow-400 text-black"
                  : "text-gray-800 hover:bg-gray-100"
              )}
            >
              <Icon className="h-5 w-5" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* FOOTER */}
      <div
        className={cn(
          "flex flex-col items-center gap-4 pb-6 border-t border-gray-100 pt-4 transition-all duration-300",
          collapsed ? "" : "px-3"
        )}
      >
        <button
          type="button"
          className={cn(
            "flex items-center justify-center rounded-full transition-all duration-200",
            collapsed
              ? "h-8 w-8 bg-white border border-gray-300 text-black hover:bg-gray-100"
              : "h-9 w-full bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
          )}
        >
          <Settings className="h-4 w-4" />
          {!collapsed && <span className="ml-2 text-sm font-medium">Setup</span>}
        </button>

        <Link
          href="/tutorial"
          className={cn(
            "flex items-center justify-center rounded-full shadow transition-all duration-200",
            collapsed
              ? "h-11 w-11 bg-yellow-400 text-black"
              : "h-10 w-full bg-yellow-400 text-black font-semibold"
          )}
        >
          <FileText className="h-5 w-5" />
          {!collapsed && <span className="ml-2 text-sm">Tutorial</span>}
        </Link>

        <Link
          href="/settings"
          className={cn(
            "flex items-center justify-center rounded-full shadow transition-all duration-200",
            collapsed
              ? "h-11 w-11 bg-red-600 text-white"
              : "h-10 w-full bg-red-600 text-white font-semibold"
          )}
        >
          <User className="h-5 w-5" />
          {!collapsed && <span className="ml-2 text-sm">Yudha | Pro</span>}
        </Link>
      </div>
    </aside>
  );
}
