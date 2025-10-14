"use client";
import { useState } from "react";
import { Menu, Search } from "lucide-react";

export function Topbar() {
  const [q, setQ] = useState("");
  return (
    <header className="sticky top-0 z-30 bg-white/70 backdrop-blur border-b">
      <div className="flex items-center gap-3 px-4 py-3">
        <button className="md:hidden rounded-xl border px-2 py-1">
          <Menu size={18} />
        </button>
        <div className="flex items-center gap-2 rounded-2xl border px-3 py-2 w-full max-w-xl bg-white">
          <Search size={16} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari produk, bahan, promo…"
            className="w-full bg-transparent outline-none text-sm"
          />
        </div>
        <div className="ml-auto text-xs text-neutral-500">
          env: <span className="font-medium">dev</span>
        </div>
      </div>
    </header>
  );
}
