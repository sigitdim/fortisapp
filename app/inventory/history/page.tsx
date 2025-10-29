import { Suspense } from "react";
import PriceHistoryClient from "./price-history-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-500">Memuat…</div>}>
      <PriceHistoryClient />
    </Suspense>
  );
}
