"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import OverheadTab from "@/app/setup/OverheadTab";
import BomCogsTab from "@/app/setup/BomCogsTab";

// Hindari prerender error untuk halaman yang baca search params
export const dynamic = "force-dynamic";

function TabButton({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  const base = "rounded-full px-4 py-2 text-sm font-medium border transition-colors";
  const act = active ? "bg-black text-white border-black" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50";
  return (
    <Link href={href} className={`${base} ${act}`}>
      {children}
    </Link>
  );
}

function SetupPageInner() {
  const sp = useSearchParams();
  const tab = (sp?.get("tab") ?? "bahan").toLowerCase();

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://api.fortislab.id";
  const OWNER_ID = process.env.NEXT_PUBLIC_OWNER_ID || "";

  return (
    <div className="p-4 space-y-6">
      {/* Tabs */}
      <div className="flex items-center gap-2">
        <TabButton href="/setup?tab=bahan" active={tab === "bahan"}>Bahan</TabButton>
        <TabButton href="/setup?tab=overhead" active={tab === "overhead"}>Overhead</TabButton>
        <TabButton href="/setup?tab=tenaga" active={tab === "tenaga"}>Tenaga Kerja</TabButton>
        <TabButton href="/setup?tab=bom" active={tab === "bom"}>BOM &amp; COGS</TabButton>
      </div>

      {/* Panels */}
      {tab === "bahan" && (
        <div className="rounded-2xl border p-4">
          <div className="text-lg font-semibold mb-3">Setup Bahan</div>
          <p className="text-sm text-gray-600">
            (Render komponen Setup Bahan milikmu di sini bila siap.)
          </p>
        </div>
      )}

      {tab === "overhead" && <OverheadTab />}

      {tab === "tenaga" && (
        <div className="rounded-2xl border p-4">
          <div className="text-lg font-semibold mb-3">Setup Tenaga Kerja</div>
          <p className="text-sm text-gray-600">
            (Render komponen Tenaga Kerja milikmu di sini bila siap.)
          </p>
        </div>
      )}

      {tab === "bom" && (
        <div className="rounded-2xl border p-4">
          <BomCogsTab />
        </div>
      )}

      {/* Footer info (debug ringan) */}
      <div className="text-xs text-gray-500">
        API_BASE: {API_BASE} | OWNER_ID: {OWNER_ID}
      </div>
    </div>
  );
}

export default function SetupPage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-gray-500">Memuat Setup…</div>}>
      <SetupPageInner />
    </Suspense>
  );
}
