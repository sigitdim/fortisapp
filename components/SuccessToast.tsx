"use client";

import React, { useEffect } from "react";
import { CheckCircle2 } from "lucide-react";
import { createPortal } from "react-dom";

type SuccessToastProps = {
  message: string;
  duration?: number;          // default 2200 ms
  onClose?: () => void;
};

export default function SuccessToast({
  message,
  duration = 2200,
  onClose,
}: SuccessToastProps) {
  // auto-close setelah beberapa detik
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => {
      onClose?.();
    }, duration);
    return () => clearTimeout(t);
  }, [message, duration, onClose]);

  // hindari error waktu SSR
  if (typeof document === "undefined" || !message) return null;

  return createPortal(
    <div className="fixed right-4 top-4 z-[10000] inline-flex items-center gap-2 rounded-xl bg-green-50 px-4 py-2 text-sm font-medium text-green-800 shadow ring-1 ring-green-200">
      <CheckCircle2 className="h-4 w-4" />
      <span>{message}</span>
    </div>,
    document.body
  );
}
