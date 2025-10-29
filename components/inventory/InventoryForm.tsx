"use client";
import React from "react";

type Props = {
  mode?: "in" | "out";
  initialBahanId?: string;
  onSuccess?: (c?: any) => void;
};

/**
 * Placeholder InventoryForm — versi folder /inventory/
 * Props disiapkan agar QuickInOutModal tidak error saat build.
 */
export default function InventoryForm({ mode, initialBahanId, onSuccess }: Props) {
  // sementara dummy untuk lolos build
  return (
    <div className="hidden" data-mode={mode} data-bahan={initialBahanId}>
      InventoryForm Placeholder
    </div>
  );
}
