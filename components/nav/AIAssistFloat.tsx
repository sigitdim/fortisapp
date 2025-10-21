// components/nav/AIAssistFloat.tsx
"use client";
import Link from "next/link";

export default function AIAssistFloat() {
  return (
    <Link
      href="/pricing/assist"
      aria-label="AI Suggestion"
      title="AI Suggestion"
      className={[
        "fixed z-[80]",
        "bottom-6 left-6",        // ⬅️ pojok kiri bawah
        "rounded-full shadow-lg px-5 py-3",
        "text-sm bg-black text-white whitespace-nowrap",
        "hover:opacity-90 transition"
      ].join(" ")}
    >
      💡 AI Suggestion
    </Link>
  );
}
