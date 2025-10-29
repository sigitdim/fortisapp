"use client";

import React from "react";
import PriceHistory from "./PriceHistory";

/**
 * Versi embed — cukup meneruskan bahanId dari query (diambil di child)
 * atau bisa diberi via props bila dipakai internal.
 */
export default function PriceHistoryEmbed(props: { bahanId?: string }) {
  return (
    <div className="w-full">
      <PriceHistory bahanId={props.bahanId} />
    </div>
  );
}
