"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  LayoutGrid,
  Calculator,
  BookOpenText,
  Boxes,
  Settings,
  Percent,
  User,
} from "lucide-react";

type Item = { label: string; href: string; icon: ReactNode };

const main: Item[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: <LayoutGrid className="h-5 w-5" />,
  },
  {
    label: "Kalkulator HPP",
    href: "/hpp",
    icon: <Calculator className="h-5 w-5" />,
  },
  {
    label: "Daftar Menu",
    href: "/menu",
    icon: <BookOpenText className="h-5 w-5" />,
  },
];

const promoChildren: Item[] = [
  {
    label: "Kalkulator Diskon",
    href: "/promo/diskon",
    icon: <Percent className="h-5 w-5" />,
  },
  {
    label: "Kalkulator Bundling",
    href: "/promo/bundling",
    icon: <Percent className="h-5 w-5" />,
  },
  {
    label: "Kalkulator Buy 1 Get 1",
    href: "/promo/b1g1",
    icon: <Percent className="h-5 w-5" />,
  },
  {
    label: "Kalkulator Tebus Murah",
    href: "/promo/tebus-murah",
    icon: <Percent className="h-5 w-5" />,
  },
];

const setupChildren: Item[] = [
  {
    label: "Bahan",
    href: "/setup/bahan",
    icon: <Settings className="h-5 w-5" />,
  },
  {
    label: "Overhead",
    href: "/setup/overhead",
    icon: <Settings className="h-5 w-5" />,
  },
  {
    label: "Tenaga Kerja",
    href: "/setup/tenaga-kerja",
    icon: <Settings className="h-5 w-5" />,
  },
  {
    label: "Aset",
    href: "/setup/aset",
    icon: <Settings className="h-5 w-5" />,
  },
];

function isActive(pathname: string | null, href: string, exact = false) {
  if (!pathname) return false;
  const clean = (s: string) =>
    s.endsWith("/") && s !== "/" ? s.slice(0, -1) : s;
  const p = clean(pathname);
  const h = clean(href);
  return exact ? p === h : p === h || p.startsWith(h + "/");
}

export default function SidebarNav() {
  const pathname = usePathname();

  const baseItem =
    "mx-1 flex items-center gap-3 rounded-full px-4 py-3 font-medium transition";
  const activeItem =
    "bg-yellow-400 text-black shadow-[inset_0_-2px_0_rgba(0,0,0,.12)]";
  const idleItem = "text-neutral-900 hover:bg-neutral-100";

  return (
    <div className="flex h-full flex-col px-3 py-4">
      {/* Brand */}
      <div className="mb-6 mt-1 px-2">
        <div className="text-2xl font-extrabold tracking-tight">
          <span className="text-neutral-900">Fortis</span>
          <span className="text-red-500">App</span>
        </div>
      </div>

      {/* MENU utama */}
      <div className="px-3 pb-2 text-xs font-semibold tracking-wide text-neutral-500">
        MENU
      </div>
      <nav className="space-y-3">
        {main.map((it) => {
          const active = isActive(pathname, it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              prefetch={false}
              className={[baseItem, active ? activeItem : idleItem].join(" ")}
            >
              <span
                className={[
                  "grid h-6 w-6 place-items-center rounded-md",
                  active ? "bg-black/10" : "bg-neutral-200",
                ].join(" ")}
              >
                {it.icon}
              </span>
              {it.label}
            </Link>
          );
        })}

        {/* Kalkulator Promo (selalu expand) */}
        <div className="px-1">
          <Link
            href="/promo"
            prefetch={false}
            className={[baseItem, idleItem].join(" ")}
          >
            <span className="grid h-6 w-6 place-items-center rounded-md bg-neutral-200">
              <Percent className="h-5 w-5" />
            </span>
            Kalkulator Promo
          </Link>
          <div className="mb-1 ml-10 mt-2 space-y-2">
            {promoChildren.map((c) => {
              const childActive = isActive(pathname, c.href, true);
              return (
                <Link
                  key={c.href}
                  href={c.href}
                  prefetch={false}
                  className={[
                    "flex items-center gap-2 text-sm",
                    childActive
                      ? "font-semibold text-neutral-900"
                      : "text-neutral-600 hover:text-neutral-800",
                  ].join(" ")}
                >
                  {c.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Inventory */}
        <Link
          href="/inventory"
          prefetch={false}
          className={[
            baseItem,
            isActive(pathname, "/inventory") ? activeItem : idleItem,
          ].join(" ")}
        >
          <span className="grid h-6 w-6 place-items-center rounded-md bg-neutral-200">
            <Boxes className="h-5 w-5" />
          </span>
          Inventory
        </Link>

        {/* Fortis Insight – halaman sendiri */}
        <Link
          href="/fortis-insight"
          prefetch={false}
          className={[
            baseItem,
            isActive(pathname, "/fortis-insight") ? activeItem : idleItem,
          ].join(" ")}
        >
          <span className="grid h-6 w-6 place-items-center rounded-md bg-neutral-200">
            <BookOpenText className="h-5 w-5" />
          </span>
          Fortis Insight
        </Link>

        {/* Setup (selalu expand), dengan jarak dari Fortis Insight */}
        <div className="mt-4 px-1">
          <Link
            href="/setup/bahan"
            prefetch={false}
            className={[baseItem, idleItem].join(" ")}
          >
            <Settings className="h-5 w-5" />
            <span className="truncate">Setup</span>
          </Link>

          <div className="mb-1 ml-10 mt-2 space-y-2">
            {setupChildren.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                prefetch={false}
                className={[
                  "flex items-center gap-2 text-sm",
                  isActive(pathname, s.href, true)
                    ? "font-semibold text-neutral-900"
                    : "text-neutral-600 hover:text-neutral-800",
                ].join(" ")}
              >
                {s.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Tutorial */}
        <Link
          href="/tutorial"
          prefetch={false}
          className={[
            baseItem,
            isActive(pathname, "/tutorial") ? activeItem : idleItem,
          ].join(" ")}
        >
          <span className="grid h-6 w-6 place-items-center rounded-md bg-neutral-200">
            <BookOpenText className="h-5 w-5" />
          </span>
          Tutorial
        </Link>
      </nav>

      {/* Membership card di paling bawah */}
      <div className="mt-auto p-3">
        <Link
          href="/billing"
          prefetch={false}
          className="flex items-center gap-3 rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-red-700"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
            <User className="h-4 w-4" />
          </div>
          <div className="leading-tight">
            <div>Yudha | Pro</div>
            <div className="text-[10px] font-normal opacity-90">
              Active until 27-03-26
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
