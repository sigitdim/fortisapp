"use client";

import { useLicense } from "@/hooks/useLicense";

export default function LicenseBadge() {
  const { loading, isActive, expiresAt } = useLicense();

  if (loading) {
    return null;
  }

  const formattedExpiry = expiresAt
    ? new Date(expiresAt).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : null;

  if (!isActive) {
    return (
      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
        FortisApp Free
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
      FortisApp Pro
      {formattedExpiry && (
        <span className="ml-1 opacity-75">• Active until {formattedExpiry}</span>
      )}
    </span>
  );
}
