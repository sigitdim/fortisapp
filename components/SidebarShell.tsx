"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import SidebarNav from "@/components/SidebarNav";

/* ====== NAV ITEMS (persis sidebar lama) ====== */
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
  { href: "/setup", label: "Setup", icon: "settings" },
  { href: "/tutorial", label: "Tutorial", icon: "edu" },
];

/* ====== ICONS (simple SVG, style sama seperti lama) ====== */
function Icon({ name }: { name: string }) {
  const cls = "w-[20px] h-[20px]";
  switch (name) {
    case "grid":     return <svg viewBox="0 0 24 24" className={cls}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>;
    case "calc":     return <svg viewBox="0 0 24 24" className={cls}><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01"/></svg>;
    case "book":     return <svg viewBox="0 0 24 24" className={cls}><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20"/><path d="M20 22V6a2 2 0 0 0-2-2H6.5A2.5 2.5 0 0 0 4 6.5V19.5"/></svg>;
    case "percent":  return <svg viewBox="0 0 24 24" className={cls}><path d="M19 5L5 19"/><circle cx="7.5" cy="7.5" r="2.5"/><circle cx="16.5" cy="16.5" r="2.5"/></svg>;
    case "box":      return <svg viewBox="0 0 24 24" className={cls}><path d="M21 16V8l-9-4-9 4v8l9 4 9-4z"/><path d="M3.5 8.5L12 12l8.5-3.5M12 12v8"/></svg>;
    case "gift":     return <svg viewBox="0 0 24 24" className={cls}><path d="M20 12v8H4v-8M2 7h20v5H2z"/><path d="M12 7v13"/><path d="M12 7s-2.5-5-5-3 5 3 5 3zm0 0s2.5-5 5-3-5 3-5 3z"/></svg>;
    case "tag":      return <svg viewBox="0 0 24 24" className={cls}><path d="M20 10l-8-8H4v8l8 8 8-8z"/><circle cx="7.5" cy="7.5" r="1.5"/></svg>;
    case "boxes":    return <svg viewBox="0 0 24 24" className={cls}><path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 7v10l9 4 9-4V7"/><path d="M12 11v10"/></svg>;
    case "settings": return <svg viewBox="0 0 24 24" className={cls}><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V22a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H2a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06A2 2 0 1 1 6.04 3.2l.06.06a1.65 1.65 0 0 0 1.82.33H8a1.65 1.65 0 0 0 1-1.51V2a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06A2 2 0 1 1 21.8 6.04l-.06.06a1.65 1.65 0 0 0-.33 1.82V8c0 .67.39 1.27 1 1.51H22a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
    case "edu":      return <svg viewBox="0 0 24 24" className={cls}><path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 .5 6 3 6 3s6-2.5 6-3v-5"/></svg>;
    default:         return <span className={cls} />;
  }
}

export default function SidebarShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  /* state buka-tutup */
  const [openDesktop, setOpenDesktop] = useState(true);
  const [openMobile, setOpenMobile] = useState(false);

  useEffect(() => {
    const mm = window.matchMedia("(min-width: 1024px)");
    const saved = localStorage.getItem("sidebar_open_desktop");
    setOpenDesktop(saved ? saved === "1" : mm.matches);
    const handler = () => !mm.matches && setOpenMobile(false);
    mm.addEventListener("change", handler);
    return () => mm.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    localStorage.setItem("sidebar_open_desktop", openDesktop ? "1" : "0");
  }, [openDesktop]);

  /* kelas menu ala sidebar lama */
  const baseItem =
    "group flex items-center gap-3 rounded-full px-4 py-3 text-[16px] transition-colors";
  const inactive =
    "hover:bg-neutral-50 text-black";
  const activeExpanded =
    "bg-yellow-400 text-black font-semibold shadow-sm";
  const iconWrap = "inline-flex w-[22px] justify-center";

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Hamburger mobile */}
      <button
        onClick={() => setOpenMobile(true)}
        className="lg:hidden fixed left-4 top-3 z-50 rounded-xl border bg-white/90 px-3 py-2 shadow-sm"
      >
        ☰
      </button>

      {/* Sidebar (expanded look like old sidebar) */}
<aside
  className={[
    "fixed z-40 top-0 left-0 h-svh border-r bg-white transition-all",
    openMobile ? "translate-x-0" : "-translate-x-full",
    "lg:translate-x-0",
    // pastikan width: 256px saat open, 72px saat collapse
    openDesktop ? "lg:w-[256px]" : "lg:w-[72px]",
  ].join(" ")}
>
        {/* Brand + collapse */}
        <div className="px-5 pt-6 pb-2 flex items-center justify-between">
          <span className="text-[28px] font-extrabold select-none leading-none">
            <span className="text-black">Fortis</span>
            <span className="text-red-600">App</span>
          </span>
          <button
            onClick={() => setOpenDesktop((v) => !v)}
            className="hidden lg:inline-flex rounded-full border w-8 h-8 items-center justify-center hover:bg-neutral-50"
            title={openDesktop ? "Collapse" : "Expand"}
          >
            {openDesktop ? "⟨" : "⟩"}
          </button>
          <button
            onClick={() => setOpenMobile(false)}
            className="lg:hidden rounded-full border w-8 h-8 flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        {/* NAV */}
        <nav className="px-4 pb-5 overflow-y-auto h-[calc(100svh-70px)]">
          {NAV.map((it, i) =>
            (it as any).type === "section" ? (
              <div
                key={`sec-${i}`}
                className="mt-6 mb-2 px-2 text-[14px] font-semibold text-neutral-500"
              >
                {openDesktop ? (it as any).label : "—"}
              </div>
            ) : (
              <Link
                key={(it as any).href}
                href={(it as any).href}
                onClick={() => setOpenMobile(false)}
                className={[
                  baseItem,
                  pathname === (it as any).href && openDesktop
                    ? activeExpanded
                    : inactive,
                  !openDesktop && "rounded-xl px-2 py-2",
                ].join(" ")}
              >
                <span
                  className={[
                    iconWrap,
                    pathname === (it as any).href && !openDesktop
                      ? "bg-yellow-400 text-black rounded-lg w-8 h-8 items-center justify-center"
                      : "",
                  ].join(" ")}
                >
                  <Icon name={(it as any).icon} />
                </span>

                {/* label disembunyikan saat collapse */}
                <span className={openDesktop ? "block" : "hidden lg:block"}>
                  {(it as any).label}
                </span>
              </Link>
            )
          )}
        </nav>
      </aside>

      {/* Overlay mobile */}
      {openMobile && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/30"
          onClick={() => setOpenMobile(false)}
        />
      )}

      {/* Konten; padding kiri mengikuti keadaan sidebar */}
<main
  className={[
    // padding konten konsisten di shell (bukan di page)
    "transition-[padding] px-4 md:px-6",
    // ruang kiri mengikuti lebar sidebar
    openDesktop ? "lg:pl-[256px]" : "lg:pl-[72px]",
  ].join(" ")}
>
  {children}
</main>
    </div>
  );
}
