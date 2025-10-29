"use client";
import React from "react";
import LogsBahanDrawer from "./LogsBahanDrawer";

export default function LogsButton({ id, nama }: { id: string; nama?: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button
        className="px-3 py-1.5 rounded-lg border hover:bg-gray-50"
        onClick={() => setOpen(true)}
      >
        Logs
      </button>
      <LogsBahanDrawer open={open} onClose={() => setOpen(false)} bahanId={id} nama={nama} />
    </>
  );
}
