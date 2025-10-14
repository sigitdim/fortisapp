export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "default-no-store";
import { Suspense } from "react";
import PricingClient from "./PricingClient";
export default function PricingPage() {
  return <Suspense fallback={<div className="p-4">Loading pricing…</div>}><PricingClient /></Suspense>;
}
