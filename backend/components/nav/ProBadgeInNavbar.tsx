// components/nav/ProBadgeInNavbar.tsx
"use client";

import Link from "next/link";

export default function ProBadgeInNavbar() {
  return (
    <Link
      href="/billing"
      className="rounded-full border px-3 py-1 text-xs hover:bg-black hover:text-white transition"
    >
      Pro / Billing
    </Link>
  );
}
