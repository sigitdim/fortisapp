import { Suspense } from "react";
import TestBahanClient from "./TestBahanClient";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-4">Loading...</div>}>
      <TestBahanClient />
    </Suspense>
  );
}
