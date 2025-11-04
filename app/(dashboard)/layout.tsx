import type { ReactNode } from "react";
import { Suspense } from "react";
import AuthBar from "@/app/components/AuthBar";
import OwnerProvider from "@/app/providers/owner-provider";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <OwnerProvider>
      <AuthBar />
      <Suspense fallback={<div className="p-4">Loading...</div>}>
        <div className="p-4">{children}</div>
      </Suspense>
    </OwnerProvider>
  );
}
