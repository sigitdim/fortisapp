"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";

const BahanTab = dynamic(() => import("./BahanTab"), { ssr: false });
// tambahkan 3 tab baru:
const OverheadTab = dynamic(() => import("./OverheadTab"), { ssr: false });
const TenagaKerjaTab = dynamic(() => import("./TenagaKerjaTab"), { ssr: false });
const AsetTab = dynamic(() => import("./AsetTab"), { ssr: false });

export default function SetupPage() {
  const sp = useSearchParams();
  const router = useRouter();

  const tab = (sp?.get("tab") ?? "bahan").toLowerCase();

  const TabEl = useMemo(() => {
    if (tab === "bahan") return <BahanTab />;
    if (tab === "overhead") return <OverheadTab />;
    if (tab === "tenaga") return <TenagaKerjaTab />;
    if (tab === "aset") return <AsetTab />;
    return <BahanTab />;
  }, [tab]);

  const setTab = (t: string) => router.push(`/setup?tab=${t}`);

  return (
    <div className="p-6">
      <h1 className="mb-4 text-4xl font-extrabold">Setup</h1>

      <div className="mb-6 flex flex-wrap gap-3">
        <button
          onClick={() => setTab("bahan")}
          className={`rounded-full border px-5 py-3 ${tab === "bahan" ? "bg-red-700 text-white border-red-700" : "bg-white hover:bg-gray-50"}`}
        >
          Bahan
        </button>
        <button
          onClick={() => setTab("overhead")}
          className={`rounded-full border px-5 py-3 ${tab === "overhead" ? "bg-red-700 text-white border-red-700" : "bg-white hover:bg-gray-50"}`}
        >
          Overhead
        </button>
        <button
          onClick={() => setTab("tenaga")}
          className={`rounded-full border px-5 py-3 ${tab === "tenaga" ? "bg-red-700 text-white border-red-700" : "bg-white hover:bg-gray-50"}`}
        >
          Tenaga Kerja
        </button>
        <button
          onClick={() => setTab("aset")}
          className={`rounded-full border px-5 py-3 ${tab === "aset" ? "bg-red-700 text-white border-red-700" : "bg-white hover:bg-gray-50"}`}
        >
          Aset
        </button>
      </div>

      {TabEl}
    </div>
  );
}
