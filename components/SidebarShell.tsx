"use client";

import type React from "react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useLicense } from "@/hooks/useLicense";

/* ================= NAV ITEMS ================= */

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "grid" },
  { href: "/hpp", label: "Kalkulator HPP", icon: "calc" },
  { href: "/menu", label: "Daftar Menu", icon: "book" },

  { type: "section", label: "Kalkulator Promo" },
  { href: "/promo/diskon", label: "Kalkulator Diskon", icon: "percent" },
  { href: "/promo/bundling", label: "Kalkulator Bundling", icon: "box" },
  { href: "/promo/b1g1", label: "Kalkulator Buy 1 Get 1", icon: "gift" },
  { href: "/promo/tebus", label: "Kalkulator Tebus Murah", icon: "tag" },

  { href: "/inventory", label: "Inventory", icon: "boxes" },
  { href: "/fortis-insight", label: "Fortis Insight", icon: "insight" },
  { href: "/setup/bahan", label: "Setup", icon: "settings" },
  { href: "/tutorial", label: "Tutorial", icon: "edu" },
];

/* ================= ICON SET (SEMUA INLINE) ================= */

function Icon({ name }: { name: string }) {
  const cls = "h-5 w-5";
  const base = {
    className: cls,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (name) {
    /* === DASHBOARD === */
    case "grid":
      return (
        <svg {...base}>
          <rect x="3" y="3" width="7" height="7" rx="2" />
          <rect x="14" y="3" width="7" height="7" rx="2" />
          <rect x="3" y="14" width="7" height="7" rx="2" />
          <rect x="14" y="14" width="7" height="7" rx="2" />
        </svg>
      );

    /* === KALKULATOR HPP === */
    case "calc":
      return (
        <svg {...base}>
          <rect x="5" y="3" width="14" height="18" rx="2" />
          <path d="M8 7h8" />
          <path d="M9 12h.01M12 12h.01M15 12h.01" />
          <path d="M9 16h.01M12 16h.01M15 16h.01" />
        </svg>
      );

    /* === DAFTAR MENU === */
    case "book":
      return (
        <svg {...base}>
          <path d="M5 4h12a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2V4Z" />
          <path d="M8 4v16" />
        </svg>
      );

    /* === INVENTORY === */
    case "boxes":
      return (
        <svg {...base}>
          <path d="M3 7.5L12 3l9 4.5-9 4.5-9-4.5Z" />
          <path d="M3 7.5v9L12 21l9-4.5v-9" />
        </svg>
      );

    /* === SETUP === */
    case "settings":
      return (
        <svg {...base}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a2 2 0 0 0 .4 2l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a2 2 0 0 0-2-.4 2 2 0 0 0-1.3 1.8V21a2 2 0 1 1-4 0v-.1a2 2 0 0 0-1.3-1.8 2 2 0 0 0-2 .4l-.1.1A2 2 0 1 1 4.1 17l.1-.1a2 2 0 0 0 .4-2 2 2 0 0 0-1.8-1.3H3a2 2 0 1 1 0-4h.1a2 2 0 0 0 1.8-1.3 2 2 0 0 0-.4-2l-.1-.1A2 2 0 1 1 6.3 4.1l.1.1a2 2 0 0 0 2 .4A2 2 0 0 0 9.7 3V3a2 2 0 1 1 4 0v.1a2 2 0 0 0 1.3 1.8 2 2 0 0 0 2-.4l.1-.1A2 2 0 1 1 20 6.3l-.1.1a2 2 0 0 0-.4 2c.2.5.7.9 1.2 1H21a2 2 0 1 1 0 4h-.1a2 2 0 0 0-1.5 1.6Z" />
        </svg>
      );

    /* === TUTORIAL === */
    case "edu":
      return (
        <svg {...base}>
          <path d="M3 10L12 5l9 5-9 5-9-5Z" />
          <path d="M6 12v5c0 .7 3.5 2.5 6 3 2.5-.5 6-2.3 6-3v-5" />
        </svg>
      );

    /* === FORTIS INSIGHT (FIGMA-STYLE) === */
    case "insight":
      return (
        <svg {...base}>
          <rect x="3" y="4" width="18" height="14" rx="2" />
          <path d="M10 10v4l3-2-3-2Z" />
          <path d="M7 19h10" />
        </svg>
      );

    /* === PROMO ICONS === */
    case "percent":
      return (
        <svg {...base}>
          <path d="M19 5L5 19" />
          <circle cx="8" cy="8" r="2.2" />
          <circle cx="16" cy="16" r="2.2" />
        </svg>
      );

    case "box":
      return (
        <svg {...base}>
        <path d="M3 7.5L12 3l9 4.5-9 4.5-9-4.5Z" />
        <path d="M3 7.5v9L12 21l9-4.5v-9" />
        </svg>
      );

    case "gift":
      return (
        <svg {...base}>
          <rect x="3" y="9" width="18" height="4" rx="1" />
          <path d="M5 13v7h14v-7" />
          <path d="M12 6v14" />
          <path d="M12 6s-2.5-3-4.5-2S9 8 12 8" />
          <path d="M12 6s2.5-3 4.5-2S15 8 12 8" />
        </svg>
      );

    case "tag":
      return (
        <svg {...base}>
          <path d="M7 4h6l7 7-6 6-7-7V4Z" />
          <circle cx="9" cy="8" r="1.2" />
        </svg>
      );

    default:
      return <span className={cls} />;
  }
}

/* ================= HELPERS ================= */

function isNavActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  const clean = (s: string) =>
    s.endsWith("/") && s !== "/" ? s.slice(0, -1) : s;
  const p = clean(pathname);
  const h = clean(href);
  return p === h || p.startsWith(h + "/");
}

function formatExpiry(raw?: string | null) {
  if (!raw) return "—";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}-${mm}-${yy}`;
}

/* ================= MAIN SHELL ================= */

export default function SidebarShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { expiresAt, isActive, loading } = useLicense();

  const [openDesktop, setOpenDesktop] = useState(true);
  const [openMobile, setOpenMobile] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  const [displayName, setDisplayName] = useState("User");
  const [expiryLabel, setExpiryLabel] = useState("—");

  // detect desktop / mobile
  useEffect(() => {
    const mm = window.matchMedia("(min-width: 1024px)");
    setIsDesktop(mm.matches);

    const saved = window.localStorage.getItem("sidebar_open_desktop");
    setOpenDesktop(saved ? saved === "1" : mm.matches);

    const handler = (ev: MediaQueryListEvent) => {
      setIsDesktop(ev.matches);
      if (!ev.matches) setOpenMobile(false);
    };

    mm.addEventListener("change", handler);
    return () => mm.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("sidebar_open_desktop", openDesktop ? "1" : "0");
  }, [openDesktop]);

  // nama user dari Supabase
  useEffect(() => {
    const supabase = createClientComponentClient();
    supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      if (!user) return;

      const meta: any = user.user_metadata || {};
      const nm =
        meta.username ||
        meta.display_name ||
        meta.nama ||
        meta.full_name ||
        meta.name ||
        user.email;

      setDisplayName(nm || "User");
    });
  }, []);

  // expiry dari license hook
  useEffect(() => {
    if (expiresAt) {
      setExpiryLabel(formatExpiry(expiresAt));
    } else {
      setExpiryLabel("—");
    }
  }, [expiresAt]);

  const isCollapsedDesktop = isDesktop && !openDesktop;

  const baseItem =
    "group flex items-center gap-3 rounded-full px-3 py-2 text-sm md:text-[15px] transition-colors";
  const inactive = "hover:bg-neutral-50 text-slate-800";
  const activeExpanded =
    "bg-yellow-400 text-slate-900 font-semibold shadow-sm";

  // sidebar classes
  const asideClasses = [
    "fixed top-0 left-0 z-40 h-svh border-r bg-white shadow-xl",
    "transition-transform duration-300 ease-out will-change-transform",
  ];

  if (isDesktop) {
    asideClasses.push(
      openDesktop ? "w-60 lg:w-60" : "w-[72px] lg:w-[72px]",
      "translate-x-0"
    );
  } else {
    asideClasses.push(
      "w-[260px] max-w-[80vw]",
      openMobile ? "translate-x-0" : "-translate-x-full"
    );
  }

  const mainPadding = isDesktop
    ? openDesktop
      ? "lg:pl-60"
      : "lg:pl-[72px]"
    : "lg:pl-0";

  return (
    <div className="min-h-screen w-full bg-[#f5f5f5]">
      {/* ===== MOBILE TOP BAR (tombol buka drawer) ===== */}
      {!isDesktop && (
        <header className="sticky top-0 z-30 border-b bg-white/90 backdrop-blur lg:hidden">
          <div className="flex h-12 w-full items-center px-3">
            <button
              onClick={() => setOpenMobile(true)}
              className="mr-2 flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-lg shadow-sm active:scale-95 transition-transform"
            >
              ☰
            </button>
            <div className="flex-1 text-center text-sm font-extrabold">
              <span className="text-slate-900">Fortis</span>
              <span className="text-red-600">App</span>
            </div>
            <div className="w-9" />
          </div>
        </header>
      )}

      {/* ===== SIDEBAR (desktop + mobile drawer) ===== */}
      <aside className={asideClasses.join(" ")}>
        {/* HEADER DALAM SIDEBAR */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          {isCollapsedDesktop ? (
            <div className="h-8 w-full" />
          ) : (
            <span className="select-none text-[20px] font-extrabold leading-none sm:text-[22px]">
              <span className="text-slate-900">Fortis</span>
              <span className="text-red-600">App</span>
            </span>
          )}

          <div className="flex items-center gap-2">
            {/* Burger DESKTOP (buat collapse / expand) */}
            {isDesktop && (
              <button
                onClick={() => setOpenDesktop((v) => !v)}
                className="hidden h-8 w-8 items-center justify-center rounded-2xl border border-slate-200 bg-white text-lg shadow-sm lg:flex active:scale-95 transition-transform"
              >
                ☰
              </button>
            )}

            {/* Tombol CLOSE MOBILE di dalam drawer */}
            {!isDesktop && (
              <button
                onClick={() => setOpenMobile(false)}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white lg:hidden active:scale-95 transition-transform"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* NAV + PRO CARD */}
        <div className="flex h-[calc(100svh-52px)] flex-col px-3 pb-3">
          <nav className="flex-1 overflow-y-auto pt-1">
            {NAV.map((it, i) =>
              (it as any).type === "section" ? (
                !isCollapsedDesktop && (
                  <div
                    key={`sec-${i}`}
                    className="mt-4 mb-1 px-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-500"
                  >
                    {(it as any).label}
                  </div>
                )
              ) : (
                <Link
                  key={(it as any).href}
                  href={(it as any).href}
                  onClick={() => {
                    if (!isDesktop) setOpenMobile(false);
                  }}
                  className={
                    isCollapsedDesktop
                      ? [
                          "mb-1.5 flex items-center justify-center rounded-full py-2 transition-colors",
                          isNavActive(pathname, (it as any).href)
                            ? "bg-yellow-400 text-slate-900 shadow-sm"
                            : "text-slate-800 hover:bg-neutral-100",
                        ].join(" ")
                      : [
                          baseItem,
                          isNavActive(pathname, (it as any).href)
                            ? activeExpanded
                            : inactive,
                        ].join(" ")
                  }
                >
                  <span className="inline-flex w-6 justify-center">
                    <Icon name={(it as any).icon} />
                  </span>
                  {!isCollapsedDesktop && (
                    <span className="truncate">{(it as any).label}</span>
                  )}
                </Link>
              )
            )}
          </nav>

          {/* PRO / MEMBERSHIP BADGE */}
          {isCollapsedDesktop ? (
            <div className="mt-3 flex justify-center pb-1">
              {loading ? (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-[9px] font-bold text-gray-400 animate-pulse">
                  ...
                </div>
              ) : isActive ? (
                <Link
                  href="/billing"
                  onClick={() => {
                    if (!isDesktop) setOpenMobile(false);
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-red-600 text-[9px] font-bold text-white shadow-md hover:bg-red-700 active:scale-95 transition-transform"
                >
                  PRO
                </Link>
              ) : (
                <Link
                  href="/billing"
                  onClick={() => {
                    if (!isDesktop) setOpenMobile(false);
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-300 text-[9px] font-bold text-gray-800 shadow-md hover:bg-gray-400 active:scale-95 transition-transform"
                >
                  !
                </Link>
              )}
            </div>
          ) : (
            <div className="mt-3">
              {loading ? (
                <div className="flex items-center gap-3 rounded-2xl bg-gray-100 px-3 py-2.5 text-xs text-gray-500 shadow-sm animate-pulse">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-200" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 w-24 rounded bg-gray-200" />
                    <div className="h-2 w-32 rounded bg-gray-200" />
                  </div>
                </div>
              ) : isActive ? (
                <Link
                  href="/billing"
                  onClick={() => {
                    if (!isDesktop) setOpenMobile(false);
                  }}
                  className="flex items-center gap-3 rounded-2xl bg-red-600 px-3 py-2.5 text-xs font-semibold text-white shadow-md transition hover:bg-red-700 active:scale-[0.98]"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-[10px]">
                    PRO
                  </div>
                  <div className="leading-tight">
                    <div className="truncate">{displayName} | Pro</div>
                    <div className="text-[9px] font-normal opacity-90">
                      Active until {expiryLabel}
                    </div>
                  </div>
                </Link>
              ) : (
                <Link
                  href="/billing"
                  onClick={() => {
                    if (!isDesktop) setOpenMobile(false);
                  }}
                  className="flex items-center gap-3 rounded-2xl bg-gray-200 px-3 py-2.5 text-xs font-semibold text-gray-800 shadow-md transition hover:bg-gray-300 active:scale-[0.98]"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-300 text-[10px]">
                    !
                  </div>
                  <div className="leading-tight">
                    <div className="truncate">{displayName}</div>
                    <div className="text-[9px] font-normal text-red-700">
                      Membership tidak aktif – klik untuk perpanjang
                    </div>
                  </div>
                </Link>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* ===== OVERLAY MOBILE (gelap) ===== */}
      {!isDesktop && openMobile && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-[1px] transition-opacity duration-200 lg:hidden"
          onClick={() => setOpenMobile(false)}
        />
      )}

      {/* ===== MAIN CONTENT (TANPA BLOKIR MEMBERSHIP) ===== */}
      <main className={["transition-[padding]", mainPadding].join(" ")}>
        <div className="w-full px-3 py-3 sm:px-4 sm:py-4 lg:px-5 lg:py-5">
          {children}
        </div>
      </main>
    </div>
  );
}
